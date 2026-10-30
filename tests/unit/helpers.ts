import fs from "node:fs";
import path from "node:path";
import { compileCase, parseCaseSource } from "@/lib/engine/compile";
import type { CaseSource } from "@/lib/engine/schema";

export const PEPPER = "test-pepper-0123456789-0123456789-abcdef";
const caseDir = path.resolve(import.meta.dirname, "../../cases/greenhouse-affair");

export function sampleSource(): CaseSource {
  const parsed = parseCaseSource(fs.readFileSync(path.join(caseDir, "case.yaml"), "utf8"));
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return parsed.source;
}

export const sampleFiles = {
  readText: (rel: string) => {
    const f = path.join(caseDir, rel);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  },
  readBinary: (rel: string) => {
    const f = path.join(caseDir, rel);
    return fs.existsSync(f) ? fs.readFileSync(f) : null;
  },
};

export function compiledSample(source = sampleSource()) {
  const r = compileCase(source, sampleFiles, PEPPER);
  if (!r.ok) throw new Error(r.errors.join("\n"));
  return r.compiled;
}
