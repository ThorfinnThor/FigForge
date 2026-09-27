import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceLockSchema } from "../../src/contracts/source-lock.js";

async function readSourceLock(): Promise<unknown> {
  const content = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
  return JSON.parse(content) as unknown;
}

describe("source lock", () => {
  it("accepts the checked-in catalog-only allowlist", async () => {
    const result = sourceLockSchema.parse(await readSourceLock());

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].apiUsed).toBe(false);
    expect(result.sources[0].artifacts.every(({ fileName }) => !fileName.includes("moc"))).toBe(
      true,
    );
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
