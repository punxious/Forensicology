/**
 * Scans the production client bundle (.next/static) for anything that would
 * spoil a case: answer hashes, server-only field names, lab result slips,
 * hints and epilogue text. Run after `pnpm build`.
 */
import fs from "node:fs";
import path from "node:path";
import type { CompiledCase } from "../lib/engine/types";

const root = path.resolve(import.meta.dirname, "..");
const staticDir = path.join(root, ".next/static");
const genDir = path.join(root, "lib/server/generated");

if (!fs.existsSync(staticDir)) {
  console.error("✖ .next/static not found. Run `pnpm build` first.");
  process.exit(1);
}

const needles = new Map<string, string>();
for (const f of fs.readdirSync(genDir).filter((f) => f.endsWith(".json"))) {
  const c = JSON.parse(fs.readFileSync(path.join(genDir, f), "utf8")) as CompiledCase;
  for (const p of c.puzzles) {
    p.answerHashes.forEach((h) => needles.set(h, `${c.slug}/${p.id} answer hash`));
    p.hintsHtml.forEach((h, i) => needles.set(h.slice(0, 60), `${c.slug}/${p.id} hint ${i + 1}`));
    for (const [k, v] of Object.entries(p.labResults ?? {})) needles.set(v.slice(0, 60), `${c.slug}/${p.id} lab result ${k}`);
  }
  needles.set(c.epilogueHtml.slice(0, 80), `${c.slug} epilogue`);
  needles.set(c.pepperCheck, `${c.slug} pepper check`);
}
for (const field of ["answerHashes", "labResults", "pepperCheck"]) needles.set(field, `field name "${field}"`);

const files: string[] = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(js|json|html|txt|css)$/.test(e.name)) files.push(full);
  }
};
walk(staticDir);

let leaks = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const [needle, what] of needles) {
    if (needle && text.includes(needle)) {
      leaks++;
      console.error(`✖ ${what} found in ${path.relative(root, file)}`);
    }
  }
}
if (leaks) process.exit(1);
console.log(`✔ No answers, hints, lab results or epilogues in ${files.length} client files (${needles.size} secrets checked).`);
