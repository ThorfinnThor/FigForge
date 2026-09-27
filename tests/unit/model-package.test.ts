import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import anchorFixture from "../../data/curated/ff05-anchor-registry.json" with { type: "json" };
import assortmentFixture from "../../data/curated/ff03-test-assortment.json" with { type: "json" };
import { anchorRegistrySchema } from "../../src/contracts/anchor-registry.js";
import { testAssortmentSchema } from "../../src/contracts/test-assortment.js";
import { buildFixtureModelPackage, MAX_THUMBNAIL_BYTES } from "../../tools/assets/fixture-model-package.js";

const assortment = testAssortmentSchema.parse(assortmentFixture);
const anchorRegistry = anchorRegistrySchema.parse(anchorFixture);
const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

describe("FF-10 model package builder", () => {
  it("builds a non-publishable package and one deterministic thumbnail per fixture part", async () => {
    const assortmentContent = await readFile("data/curated/ff03-test-assortment.json", "utf8");
    const sourceLockContent = await readFile("data/sources.lock.json", "utf8");
    const anchorContent = await readFile("data/curated/ff05-anchor-registry.json", "utf8");
    const build = buildFixtureModelPackage({
      assortment,
      anchorRegistry,
      assortmentSha256: sha256(assortmentContent),
      sourceLockSha256: sha256(sourceLockContent),
      anchorRegistrySha256: sha256(anchorContent),
    });

    expect(build.package.publishable).toBe(false);
    expect(build.package.kind).toBe("synthetic-fixture");
    expect(build.package.parts).toHaveLength(18);
    expect(build.index.thumbnails).toHaveLength(18);
    expect(build.index.summary.publishablePackageCount).toBe(0);
    expect([...build.thumbnailContents.values()].every((content) => Buffer.byteLength(content) <= MAX_THUMBNAIL_BYTES)).toBe(true);
    expect(build.packageContent).not.toContain("/api/");
    expect(build.packageContent).not.toContain(".moc");
  });

  it("produces byte-identical output for identical inputs", async () => {
    const assortmentContent = await readFile("data/curated/ff03-test-assortment.json", "utf8");
    const sourceLockContent = await readFile("data/sources.lock.json", "utf8");
    const anchorContent = await readFile("data/curated/ff05-anchor-registry.json", "utf8");
    const input = {
      assortment,
      anchorRegistry,
      assortmentSha256: sha256(assortmentContent),
      sourceLockSha256: sha256(sourceLockContent),
      anchorRegistrySha256: sha256(anchorContent),
    };
    const first = buildFixtureModelPackage(input);
    const second = buildFixtureModelPackage(input);

    expect(second.packageContent).toBe(first.packageContent);
    expect(second.index).toEqual(first.index);
    expect([...second.thumbnailContents.entries()]).toEqual([...first.thumbnailContents.entries()]);
  });
});
