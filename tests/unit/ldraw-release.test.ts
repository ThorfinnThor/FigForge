import { describe, expect, it } from "vitest";
import { ldrawReleaseSlug } from "../../src/scene/ldraw-release.js";
import { decideLDrawLockUpdate, releaseFromArchiveEntries } from "../../tools/lib/ldraw-release.js";
import {
  ldrawSourceSha256,
  normalizeCatalogEvidenceName,
} from "../../tools/lib/ldraw-review.js";

const lockedHash = "a".repeat(64);
const newHash = "b".repeat(64);

describe("official LDraw release handling", () => {
  it("names the published library folder after the locked release", () => {
    expect(ldrawReleaseSlug("2026-08")).toBe("2608");
    expect(() => ldrawReleaseSlug("2026-13")).toThrow();
    expect(() => ldrawReleaseSlug("latest")).toThrow();
  });

  it("reads the newest release note of the complete archive", () => {
    expect(releaseFromArchiveEntries([
      "ldraw/models/Note0801CA.txt",
      "ldraw/models/Note2607CA.txt",
      "ldraw/models/Note2608CA.txt",
      "ldraw/models/Note2608CA_a.txt",
      "ldraw/parts/3001.dat",
    ])).toBe("2026-08");
    expect(() => releaseFromArchiveEntries(["ldraw/parts/3001.dat"])).toThrow();
  });

  it("keeps the lock when the archive is unchanged", () => {
    expect(decideLDrawLockUpdate(
      { release: "2026-08", archiveSha256: lockedHash },
      { release: "2026-08", archiveSha256: lockedHash },
    )).toEqual({ action: "unchanged" });
  });

  it("adopts a newer release with its new hash", () => {
    expect(decideLDrawLockUpdate(
      { release: "2026-08", archiveSha256: lockedHash },
      { release: "2026-11", archiveSha256: newHash },
    )).toEqual({ action: "update", release: "2026-11", archiveSha256: newHash });
  });

  it("refuses a changed archive without a newer release", () => {
    expect(() => decideLDrawLockUpdate(
      { release: "2026-08", archiveSha256: lockedHash },
      { release: "2026-08", archiveSha256: newHash },
    )).toThrow();
    expect(() => decideLDrawLockUpdate(
      { release: "2026-08", archiveSha256: lockedHash },
      { release: "2026-05", archiveSha256: newHash },
    )).toThrow();
    expect(() => decideLDrawLockUpdate(
      { release: "2026-08", archiveSha256: lockedHash },
      { release: "2026-11", archiveSha256: "not-a-hash" },
    )).toThrow();
  });

  it("binds a curated review to exact official source content", () => {
    expect(ldrawSourceSha256("0 Minifig Torso with Integral Arms\n"))
      .not.toBe(ldrawSourceSha256("0 Minifig Torso with Integral Arms changed\n"));
  });

  it("ignores catalog-name casing and whitespace without hiding semantic changes", () => {
    expect(normalizeCatalogEvidenceName("  Yellow/Silver  Stripes Print "))
      .toBe(normalizeCatalogEvidenceName("yellow/silver stripes print"));
    expect(normalizeCatalogEvidenceName("yellow/silver stripes"))
      .not.toBe(normalizeCatalogEvidenceName("yellow/gold stripes"));
  });
});
