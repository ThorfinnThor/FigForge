import { Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import {
  cylinderEvidenceFromTransform,
  isFullCylinderPrimitive,
  ldrawMatrix,
  parseLDrawReferences,
  proposedHandPlacement,
  proposedHandPlacements,
} from "../../tools/lib/ldraw-placement-candidates.js";

describe("conservative LDraw placement candidate analysis", () => {
  it("recognizes only full cylinder primitives", () => {
    expect(isFullCylinderPrimitive("p/4-4cyli.dat")).toBe(true);
    expect(isFullCylinderPrimitive("p/48/4-4cylc.dat")).toBe(true);
    expect(isFullCylinderPrimitive("p/2-4cyli.dat")).toBe(false);
    expect(isFullCylinderPrimitive("parts/3841.dat")).toBe(false);
  });

  it("extracts transitive type-1 references", () => {
    const references = parseLDrawReferences("1 16 0 0 0 4 0 0 0 12 0 0 0 4 4-4cyli.dat");
    expect(references).toHaveLength(1);
    expect(references[0]?.file).toBe("4-4cyli.dat");
  });

  it("measures a radius-4, length-12 cylinder and its midpoint", () => {
    const transform = ldrawMatrix([0, 0, 0, 4, 0, 0, 0, 12, 0, 0, 0, 4]);
    const evidence = cylinderEvidenceFromTransform("p/4-4cyli.dat", transform);
    expect(evidence).toMatchObject({
      radiusLdu: 4,
      lengthLdu: 12,
      centerLdu: [0, 6, 0],
      axis: [0, 1, 0],
    });
  });

  it("derives a finite candidate transform without changing builder status", () => {
    const evidence = cylinderEvidenceFromTransform("p/4-4cyli.dat", new Matrix4().makeScale(4, 12, 4));
    expect(evidence).not.toBeNull();
    const placement = proposedHandPlacement(evidence!);
    expect(placement).toHaveLength(16);
    expect(placement.every(Number.isFinite)).toBe(true);
    const alternatives = proposedHandPlacements(evidence!);
    expect(alternatives).toHaveLength(8);
    expect(alternatives[0]).toEqual(placement);
    expect(alternatives.every((candidate) => candidate.length === 16 && candidate.every(Number.isFinite))).toBe(true);
  });
});
