import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { testAssortmentSchema } from "../../src/contracts/test-assortment.js";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as unknown;
}

describe("FF-03 test assortment", () => {
  it("contains the required component shape and 20 draft variants", async () => {
    const assortment = testAssortmentSchema.parse(
      await readJson("data/curated/ff03-test-assortment.json"),
    );
    const counts = assortment.components.reduce<Record<string, number>>((result, component) => {
      result[component.role] = (result[component.role] ?? 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({
      head: 5,
      headwear: 5,
      torsoAssembly: 2,
      legsAssembly: 2,
      handAccessory: 3,
    });
    expect(assortment.variants).toHaveLength(20);
    expect(assortment.components.every((component) => component.releaseStatus === "blocked")).toBe(
      true,
    );
  });

  it("binds the assortment to the exact checked-in source-lock hash", async () => {
    const sourceLock = await readFile(resolve(process.cwd(), "data/sources.lock.json"), "utf8");
    const assortment = testAssortmentSchema.parse(
      await readJson("data/curated/ff03-test-assortment.json"),
    );

    expect(assortment.sourceLockSha256).toBe(
      createHash("sha256").update(sourceLock).digest("hex"),
    );
    expect(assortment.sourcePolicy).toContain("keine MOC-Dateien");
  });
});
