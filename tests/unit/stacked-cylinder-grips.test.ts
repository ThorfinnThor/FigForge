import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import {
  mergeStackedCylinderEvidence,
  type CylinderEvidence,
} from "../../tools/lib/ldraw-placement-candidates.js";
import {
  readAccessoryProfileReviews,
  stackedCylinderGripPartNums,
} from "../../tools/lib/ldraw-accessory-profile-reviews.js";

const segment = (y: number, length: number, options: Partial<CylinderEvidence> = {}): CylinderEvidence => ({
  primitive: "p/4-4cylc.dat",
  radiusLdu: 4,
  lengthLdu: length,
  centerLdu: [0, y, 0],
  axis: [0, length, 0],
  sourceConnectorTransformLdu: new Matrix4().setPosition(0, y, 0).toArray(),
  ...options,
});

describe("stacked cylinder grips", () => {
  it("merges touching radius-4 rings on one axis into one grip", () => {
    const merged = mergeStackedCylinderEvidence([segment(0, 1.6), segment(2.9, 1.6), segment(5.8, 1.6), segment(8.7, 1.6)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.lengthLdu).toBe(10.3);
    expect(merged[0]?.centerLdu).toEqual([0, 4.35, 0]);
    expect(merged[0]?.primitive).toBe("stacked:p/4-4cylc.dat");
  });

  it("keeps segments apart that are further than a groove from each other", () => {
    const merged = mergeStackedCylinderEvidence([segment(0, 1.6), segment(2.9, 1.6), segment(30, 1.6), segment(32.9, 1.6)]);
    expect(merged.map(({ lengthLdu }) => lengthLdu)).toEqual([4.5, 4.5]);
  });

  it("does not merge other radii or cylinders that are off the axis", () => {
    const merged = mergeStackedCylinderEvidence([
      segment(0, 1.6),
      segment(2.9, 1.6, { radiusLdu: 6 }),
      segment(2.9, 1.6, { centerLdu: [3, 2.9, 0] }),
    ]);
    // The off-axis ring forms its own group; nothing is merged across axes or radii.
    expect(merged.map(({ lengthLdu }) => lengthLdu)).toEqual([1.6, 1.6]);
  });

  it("is only used for profile families that declare stacked cylinders", async () => {
    const profiles = await readAccessoryProfileReviews(process.cwd());
    const stacked = stackedCylinderGripPartNums(profiles);
    expect([...stacked].sort()).toEqual(["18034", "2674b", "2674e", "2674f"]);
    expect(stacked.has("3846")).toBe(false);
  });
});
