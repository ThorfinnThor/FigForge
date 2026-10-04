import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceLockSchema } from "../../src/contracts/source-lock.js";
import { catalogSetSourceLockSchema } from "../../src/contracts/catalog-set-source-lock.js";
import { mergeCatalogSourceLocks } from "../../tools/catalog/merge-source-locks.js";

async function readSourceLock(): Promise<unknown> {
  const content = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
  return JSON.parse(content) as unknown;
}

async function readSetSourceLock(): Promise<unknown> {
  const content = await readFile(resolve(process.cwd(), "data/set-sources.lock.json"), "utf8");
  return JSON.parse(content) as unknown;
}

describe("source lock", () => {
  it("accepts the checked-in catalog-only allowlist", async () => {
    const result = sourceLockSchema.parse(await readSourceLock());

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].apiUsed).toBe(false);
    expect(result.sources[0].artifacts.every(({ fileName }) => !fileName.includes("moc"))).toBe(true);
  });

  it("accepts the separate set-association catalog lock", async () => {
    const result = catalogSetSourceLockSchema.parse(await readSetSourceLock());

    expect(result.sources[0].apiUsed).toBe(false);
    expect(result.sources[0].artifacts.map(({ fileName }) => fileName)).toEqual(expect.arrayContaining([
        "sets.csv.gz",
        "inventories.csv.gz",
        "inventory_parts.csv.gz",
        "inventory_minifigs.csv.gz",
        "minifigs.csv.gz",
    ]));
    expect(result.sources[0].artifacts.every(({ fileName }) => !fileName.includes("moc"))).toBe(true);
  });

  it("merges core and set locks only at the catalog refresh boundary", async () => {
    const core = sourceLockSchema.parse(await readSourceLock());
    const sets = catalogSetSourceLockSchema.parse(await readSetSourceLock());
    const merged = mergeCatalogSourceLocks(core, sets);

    expect(merged.updatedAt).toBe("2026-09-28");
    expect(merged.sources[0].artifacts).toHaveLength(10);
    expect(new Set(merged.sources[0].artifacts.map(({ fileName }) => fileName)).size).toBe(10);
  });

  it("rejects MOC file names", async () => {
    const candidate = structuredClone(await readSourceLock()) as {
      sources: Array<{ artifacts: Array<{ fileName: string }> }>;
    };
    candidate.sources[0]?.artifacts.push({ fileName: "mocs.csv.gz" });

    expect(() => sourceLockSchema.parse(candidate)).toThrowError();
  });

  it("rejects Rebrickable API usage", async () => {
    const candidate = structuredClone(await readSourceLock()) as {
      sources: Array<{ apiUsed: boolean }>;
    };
    if (candidate.sources[0]) {
      candidate.sources[0].apiUsed = true;
    }

    expect(() => sourceLockSchema.parse(candidate)).toThrowError();
  });
});
