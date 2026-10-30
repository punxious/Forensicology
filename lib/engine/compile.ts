/**
 * Case compiler: source YAML (with plaintext answers) → CompiledCase (hashed).
 *
 * Used by `scripts/build-cases.ts` today and by the admin uploader in Phase 3.
 * Plaintext answers never leave this function.
 */
import { createHash } from "node:crypto";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { caseSourceSchema, type CaseSource, type PuzzleSource } from "./schema";
import { validateGraph, type GraphIssue } from "./graph";
import { normalizeAnswer } from "./normalize";
import { hashAnswer, pepperCheck } from "./hash";
import { renderMarkdown, renderInline } from "./markdown";
import type { CompiledAsset, CompiledCase, CompiledEvidence, CompiledPuzzle } from "./types";

export type CaseFiles = {
  readText(relPath: string): string | null;
  readBinary(relPath: string): Buffer | null;
};

export type CompileResult =
  | { ok: true; compiled: CompiledCase; warnings: GraphIssue[] }
  | { ok: false; errors: string[]; warnings: GraphIssue[] };

const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const MAX_ASSET_BYTES = 1024 * 1024;

function safeRelPath(p: string): boolean {
  return !path.isAbsolute(p) && !p.split(/[\\/]/).includes("..");
}

export function parseCaseSource(yamlText: string): { ok: true; source: CaseSource } | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText, { maxAliasCount: 50 });
  } catch (e) {
    return { ok: false, errors: [`YAML parse error: ${(e as Error).message}`] };
  }
  const parsed = caseSourceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return { ok: true, source: parsed.data };
}

function authoredAnswers(p: PuzzleSource): unknown[] {
  const list = [...(p.answer !== undefined ? [p.answer] : []), ...(p.answers ?? [])];
  return list;
}

export function compileCase(source: CaseSource, files: CaseFiles, pepper: string): CompileResult {
  const errors: string[] = [];
  const issues = validateGraph(source);
  errors.push(...issues.filter((i) => i.level === "error").map((i) => i.message));
  const warnings = issues.filter((i) => i.level === "warning");

  const assets: Record<string, CompiledAsset> = {};
  const loadAsset = (rel: string, owner: string) => {
    if (!safeRelPath(rel)) return errors.push(`${owner}: unsafe asset path "${rel}".`);
    const type = CONTENT_TYPES[path.extname(rel).toLowerCase()];
    if (!type) return errors.push(`${owner}: unsupported asset type "${rel}".`);
    const data = files.readBinary(rel);
    if (!data) return errors.push(`${owner}: asset "${rel}" not found.`);
    if (data.length > MAX_ASSET_BYTES) return errors.push(`${owner}: asset "${rel}" is over 1 MB.`);
    assets[rel] = { contentType: type, base64: data.toString("base64") };
  };
  const loadDoc = (rel: string, owner: string): string => {
    if (!safeRelPath(rel)) {
      errors.push(`${owner}: unsafe document path "${rel}".`);
      return "";
    }
    const text = files.readText(rel);
    if (text === null) {
      errors.push(`${owner}: document "${rel}" not found.`);
      return "";
    }
    return renderMarkdown(text);
  };

  const evidence: CompiledEvidence[] = source.evidence.map((e) => {
    const base: CompiledEvidence = {
      id: e.id,
      kind: e.kind,
      title: e.title,
      tag: e.tag,
      summary: e.summary,
      initial: e.initial,
    };
    if (e.image) {
      loadAsset(e.image, `evidence "${e.id}"`);
      base.image = e.image;
      base.imageAlt = e.imageAlt ?? "";
      if (!e.imageAlt) errors.push(`evidence "${e.id}": images need imageAlt text for screen readers.`);
    }
    switch (e.kind) {
      case "document":
        return { ...base, html: loadDoc(e.document, `evidence "${e.id}"`) };
      case "image":
        return { ...base, html: e.document ? loadDoc(e.document, `evidence "${e.id}"`) : undefined };
      case "transcript":
        return { ...base, intro: e.intro, lines: e.lines };
      case "print":
        return { ...base, subject: e.subject, latent: e.latent, print: e.print };
    }
  });

  const lineIds = new Map(
    source.evidence.map((e) => [e.id, e.kind === "transcript" ? e.lines.map((l) => l.id) : []]),
  );

  const puzzles: CompiledPuzzle[] = source.puzzles.map((p) => {
    const owner = `puzzle "${p.id}"`;
    const norm = { type: p.type, config: p.config, lineIds: undefined as string[] | undefined };
    if (p.type === "statements") norm.lineIds = p.config.transcripts.flatMap((t) => lineIds.get(t) ?? []);

    const answers = authoredAnswers(p);
    if (answers.length === 0) errors.push(`${owner}: needs an answer.`);
    const answerHashes: string[] = [];
    for (const a of answers) {
      const n = normalizeAnswer(norm as Parameters<typeof normalizeAnswer>[0], a);
      if (!n.ok) errors.push(`${owner}: authored answer is invalid (${n.error}).`);
      else answerHashes.push(hashAnswer(pepper, source.slug, p.id, n.value));
    }

    const compiled = {
      id: p.id,
      type: p.type,
      title: p.title,
      promptHtml: renderMarkdown(p.prompt),
      requires: p.requires,
      uses: p.uses,
      unlocks: p.unlocks,
      config: p.config,
      hintsHtml: p.hints.map((h) => renderInline(h)) as [string, string, string],
      solvedHtml: renderMarkdown(p.solvedText),
      answerHashes,
    } as CompiledPuzzle;

    if (p.type === "lab") {
      const results: Record<string, string> = {};
      for (const [key, text] of Object.entries(p.results)) {
        if (key !== "default") {
          const [s, t] = key.split("|");
          if (!p.config.samples.some((x) => x.id === s) || !p.config.tests.some((x) => x.id === t)) {
            errors.push(`${owner}: result key "${key}" isn't a valid sample|test pair.`);
          }
        }
        results[key] = renderMarkdown(text);
      }
      if (!results.default) errors.push(`${owner}: lab results need a "default" entry.`);
      for (const a of answers) {
        const n = normalizeAnswer(norm as Parameters<typeof normalizeAnswer>[0], a);
        if (n.ok && !results[n.value]) errors.push(`${owner}: the answer pair "${n.value}" has no result slip.`);
      }
      compiled.labResults = results;
    }
    return compiled;
  });

  const briefingHtml = loadDoc(source.briefing, "briefing");
  const epilogueHtml = loadDoc(source.epilogue, "epilogue");

  if (source.players.min > source.players.max) errors.push("players.min is greater than players.max.");

  if (errors.length) return { ok: false, errors, warnings };

  const body: Omit<CompiledCase, "contentHash"> = {
    slug: source.slug,
    version: source.version,
    pepperCheck: pepperCheck(pepper),
    title: source.title,
    tagline: source.tagline,
    difficulty: source.difficulty,
    durationMinutes: source.durationMinutes,
    players: source.players,
    free: source.free,
    briefingHtml,
    epilogueHtml,
    evidence,
    puzzles,
    scoring: source.scoring,
    assets,
  };
  const contentHash = createHash("sha256").update(JSON.stringify(body)).digest("base64url").slice(0, 16);
  return { ok: true, compiled: { ...body, contentHash }, warnings };
}
