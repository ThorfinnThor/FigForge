import { access } from "node:fs/promises";
import { resolve } from "node:path";

export type Ff18PrerequisiteId =
  | "ff21-search-documents"
  | "ff21-stratified-testset"
  | "ff18-human-relevance-judgments";

export interface Ff18Prerequisite {
  id: Ff18PrerequisiteId;
  path: string;
  blocks: "index-build" | "benchmark-decision";
  description: string;
}

export interface Ff18PrerequisiteStatus extends Ff18Prerequisite {
  present: boolean;
}

export interface Ff18PreflightResult {
  ticket: "FF-18";
  readyForIndexBuild: boolean;
  readyForBenchmarkDecision: boolean;
  checks: Ff18PrerequisiteStatus[];
  missing: Ff18PrerequisiteId[];
}

export const ff18Prerequisites: readonly Ff18Prerequisite[] = [
  {
    id: "ff21-search-documents",
    path: "data/curated/ff21-search-documents.json",
    blocks: "index-build",
    description: "Geprüfte englische Suchdokumente aus FF-21",
  },
  {
    id: "ff21-stratified-testset",
    path: "data/curated/ff21-search-testset.json",
    blocks: "benchmark-decision",
    description: "Stratifizierter 160-Fälle-Testsatz aus FF-21 mit getrenntem Holdout",
  },
  {
    id: "ff18-human-relevance-judgments",
    path: "data/curated/ff18-relevance-judgments.json",
    blocks: "benchmark-decision",
    description: "Menschliche Relevanzurteile für Entwicklung und Holdout",
  },
] as const;

type FileExists = (absolutePath: string) => Promise<boolean>;

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export async function inspectFf18Prerequisites(
  repositoryRoot: string,
  exists: FileExists = fileExists,
): Promise<Ff18PreflightResult> {
  const checks = await Promise.all(
    ff18Prerequisites.map(async (prerequisite) => ({
      ...prerequisite,
      present: await exists(resolve(repositoryRoot, prerequisite.path)),
    })),
  );
  const missing = checks.filter(({ present }) => !present).map(({ id }) => id);
  const readyForIndexBuild = checks
    .filter(({ blocks }) => blocks === "index-build")
    .every(({ present }) => present);

  return {
    ticket: "FF-18",
    readyForIndexBuild,
    readyForBenchmarkDecision:
      readyForIndexBuild &&
      checks.filter(({ blocks }) => blocks === "benchmark-decision").every(({ present }) => present),
    checks,
    missing,
  };
}
