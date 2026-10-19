import { describe, expect, it } from "vitest";
import {
  BRICKLINK_SNAPSHOT_MAX_AGE_DAYS,
  bricklinkSnapshotAgeDays,
  buildBrickLinkItemCrosswalk,
  refreshBrickLinkItemCrosswalk,
  validateBrickLinkItemCrosswalk,
} from "../../tools/lib/bricklink-item-crosswalk.js";

const normalized = {
  sourceLockSha256: "a".repeat(64),
  parts: [
    { partNum: "rb-code", colorVariants: [{ elementId: "1001" }] },
    { partNum: "rb-primary", colorVariants: [] },
    { partNum: "rb-alt", colorVariants: [] },
    { partNum: "rb-ambiguous", colorVariants: [{ elementId: "2001" }, { elementId: "2002" }] },
    { partNum: "rb-missing", colorVariants: [] },
  ],
};
const builderCatalog = {
  source: { release: "2026-09", archiveSha256: "b".repeat(64) },
  entries: normalized.parts.map(({ partNum }) => ({ rebrickablePartNum: partNum, ldrawFile: `parts/${partNum}.dat` })),
};
const curated = { components: [] };
const sources = {
  snapshotDate: "2026-10-19",
  partsFileName: "Parts.txt",
  partsText: [
    "Category ID\tCategory Name\tNumber\tName\tAlternate Item Number",
    "1\tTest\tbl-code\tCode item\t",
    "1\tTest\trb-primary\tPrimary item\t",
    "1\tTest\tbl-alt\tAlternate item\trb-alt",
    "1\tTest\tbl-other\tOther item\t",
  ].join("\r\n"),
  partColorCodesFileName: "codes.txt",
  partColorCodesText: [
    "Item No\tColor\tCode",
    "bl-code\tRed\t1001",
    "bl-code\tBlue\t1001",
    "bl-code\tRed\t2001",
    "bl-other\tRed\t2002",
  ].join("\r\n"),
};

describe("BrickLink item crosswalk", () => {
  it("accepts unique official element, primary and alternate mappings without guessing", () => {
    const result = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, sources);
    expect(result.entries.map(({ rebrickablePartNum, bricklinkItemId }) => [rebrickablePartNum, bricklinkItemId]))
      .toEqual([
        ["rb-alt", "bl-alt"],
        ["rb-code", "bl-code"],
        ["rb-primary", "rb-primary"],
      ]);
    expect(result.unresolved).toEqual([
      {
        rebrickablePartNum: "rb-ambiguous",
        reason: "ambiguous-official-crosswalk",
        candidateBricklinkItemIds: ["bl-code", "bl-other"],
        matchingElementIds: ["2001", "2002"],
      },
      {
        rebrickablePartNum: "rb-missing",
        reason: "no-official-crosswalk",
        candidateBricklinkItemIds: [],
        matchingElementIds: [],
      },
    ]);
  });

  it("rejects an element-code item that is absent from the official Parts catalog", () => {
    expect(() => buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, {
      ...sources,
      partColorCodesText: "Item No\tColor\tCode\r\nunknown\tRed\t1001\r\n",
    })).toThrow("references an unknown item");
  });

  it("persists a uniquely proven official LDraw header mapping for portable builds", () => {
    const result = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, sources, {
      release: "2026-09",
      archiveSha256: "b".repeat(64),
      itemIdByRebrickablePartNum: new Map([["rb-ambiguous", "ldraw-proven-id"]]),
    });
    expect(result.entries.find(({ rebrickablePartNum }) => rebrickablePartNum === "rb-ambiguous")).toEqual({
      rebrickablePartNum: "rb-ambiguous",
      bricklinkItemId: "ldraw-proven-id",
      evidenceMethods: ["official-ldraw-header"],
      matchingElementIds: [],
    });
    expect(result.sources.ldrawOfficial).toEqual({
      release: "2026-09",
      archiveSha256: "b".repeat(64),
      mappedPartCount: 1,
    });
  });

  describe("refresh without a new BrickLink download", () => {
    const snapshot = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, sources);
    const nextLock = "c".repeat(64);
    const grown = {
      sourceLockSha256: nextLock,
      parts: [...normalized.parts, { partNum: "rb-new", colorVariants: [] }, { partNum: "rb-new-ldraw", colorVariants: [] }],
    };
    const grownBuilder = {
      ...builderCatalog,
      entries: grown.parts.map(({ partNum }) => ({ rebrickablePartNum: partNum, ldrawFile: `parts/${partNum}.dat` })),
    };

    it("keeps every snapshot mapping and only moves the catalog lock", () => {
      const refreshed = refreshBrickLinkItemCrosswalk(snapshot, { ...normalized, sourceLockSha256: nextLock }, builderCatalog, curated);
      expect(refreshed.entries).toEqual(snapshot.entries);
      expect(refreshed.unresolved).toEqual(snapshot.unresolved);
      expect(refreshed.catalogSourceLockSha256).toBe(nextLock);
      expect(refreshed.snapshotDate).toBe("2026-10-19");
      expect(refreshed.sources.parts).toEqual(snapshot.sources.parts);
      expect(() => validateBrickLinkItemCrosswalk(refreshed)).not.toThrow();
    });

    it("maps new parts only through official LDraw headers and blocks the rest as not-in-snapshot", () => {
      const refreshed = refreshBrickLinkItemCrosswalk(snapshot, grown, grownBuilder, curated, {
        release: "2026-10",
        archiveSha256: "d".repeat(64),
        itemIdByRebrickablePartNum: new Map([["rb-new-ldraw", "bl-from-ldraw"]]),
      });
      expect(refreshed.entries.find(({ rebrickablePartNum }) => rebrickablePartNum === "rb-new-ldraw")).toEqual({
        rebrickablePartNum: "rb-new-ldraw",
        bricklinkItemId: "bl-from-ldraw",
        evidenceMethods: ["official-ldraw-header"],
        matchingElementIds: [],
      });
      expect(refreshed.unresolved.find(({ rebrickablePartNum }) => rebrickablePartNum === "rb-new")).toEqual({
        rebrickablePartNum: "rb-new",
        reason: "not-in-snapshot",
        candidateBricklinkItemIds: [],
        matchingElementIds: [],
      });
      expect(refreshed.summary.notInSnapshotPartCount).toBe(1);
      expect(refreshed.sources.ldrawOfficial?.release).toBe("2026-10");
      expect(() => validateBrickLinkItemCrosswalk(refreshed)).not.toThrow();
    });

    it("never invents an ID for a new part without LDraw evidence and drops parts that left the catalog", () => {
      const smaller = {
        ...builderCatalog,
        entries: builderCatalog.entries.filter(({ rebrickablePartNum }) => rebrickablePartNum !== "rb-code"),
      };
      const refreshed = refreshBrickLinkItemCrosswalk(snapshot, grown, { ...grownBuilder, entries: [
        ...smaller.entries,
        { rebrickablePartNum: "rb-new", ldrawFile: "parts/rb-new.dat" },
      ] }, curated);
      expect(refreshed.entries.map(({ rebrickablePartNum }) => rebrickablePartNum)).not.toContain("rb-code");
      expect(refreshed.entries.map(({ rebrickablePartNum }) => rebrickablePartNum)).not.toContain("rb-new");
      expect(refreshed.summary.builderPartCount).toBe(smaller.entries.length + 1);
    });

    it("is deterministic", () => {
      const first = refreshBrickLinkItemCrosswalk(snapshot, grown, grownBuilder, curated);
      const second = refreshBrickLinkItemCrosswalk(first, grown, grownBuilder, curated);
      expect(second).toEqual(first);
    });

    it("rejects a not-in-snapshot reason that carries candidates", () => {
      const refreshed = refreshBrickLinkItemCrosswalk(snapshot, grown, grownBuilder, curated);
      const broken = {
        ...refreshed,
        unresolved: refreshed.unresolved.map((entry) => entry.reason === "not-in-snapshot"
          ? { ...entry, candidateBricklinkItemIds: ["x"] }
          : entry),
      };
      expect(() => validateBrickLinkItemCrosswalk(broken)).toThrow("Invalid unresolved reason");
    });
  });

  describe("snapshot age", () => {
    it("counts whole days and flags snapshots older than 90 days", () => {
      expect(BRICKLINK_SNAPSHOT_MAX_AGE_DAYS).toBe(90);
      expect(bricklinkSnapshotAgeDays("2026-10-19", new Date("2026-10-19T12:00:00Z"))).toBe(0);
      expect(bricklinkSnapshotAgeDays("2026-10-19", new Date("2027-01-17T00:00:00Z"))).toBe(90);
      expect(bricklinkSnapshotAgeDays("2026-10-19", new Date("2027-01-18T00:00:00Z"))).toBe(91);
    });

    it("rejects a missing or malformed snapshot date", () => {
      const snapshot = buildBrickLinkItemCrosswalk(normalized, builderCatalog, curated, sources);
      expect(() => validateBrickLinkItemCrosswalk({ ...snapshot, snapshotDate: "19.10.2026" })).toThrow("snapshot date");
      expect(() => validateBrickLinkItemCrosswalk({ ...snapshot, snapshotDate: "2026-13-45" })).toThrow("snapshot date");
    });
  });
});
