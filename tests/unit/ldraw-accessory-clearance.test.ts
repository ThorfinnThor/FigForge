import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it } from "vitest";
import {
  selectUnambiguousDigitalAccessoryGrip,
  validateDigitalAccessoryPlacement,
  type DigitalAccessoryValidation,
} from "../../tools/lib/ldraw-accessory-clearance.js";

const mesh = (name: string, size: [number, number, number], x = 0): Mesh => {
  const value = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial());
  value.name = name;
  value.position.x = x;
  return value;
};

const ldrawPart = (name: string, size: [number, number, number], x = 0): Group => {
  const part = new Group();
  part.name = name;
  part.position.x = x;
  part.add(mesh("", size));
  return part;
};

const referenceFigure = (): Group => {
  const figure = new Group();
  figure.add(ldrawPart("3820.dat", [8, 8, 8], 0));
  figure.add(ldrawPart("973.dat", [4, 8, 8], 20));
  return figure;
};

const validation = (status: "passed" | "rejected"): DigitalAccessoryValidation => ({
  status,
  reasonCode: status === "passed" ? null : "reference-figure-clearance-failed",
  gripLengthLdu: 12,
  modelBoundsLdu: { min: [-1, -6, -1], max: [1, 6, 1], size: [2, 12, 2] },
  sampledPointCount: 36,
  protectedBodyBoxCount: 1,
  collisionSampleCount: status === "passed" ? 0 : 1,
  collisionSamplesByPart: status === "passed" ? {} : { "973.dat": 1 },
});

const gripEvaluation = (...statuses: Array<"passed" | "rejected">) => ({
  orientations: statuses.map((status) => ({
    placementTransformLdu: new Matrix4().toArray(),
    validation: validation(status),
  })),
});

describe("automated LDraw hand-accessory clearance", () => {
  it("passes a rigid, sufficiently long grip outside protected body bounds", () => {
    const accessory = new Group();
    accessory.add(mesh("accessory.dat", [2, 12, 2]));
    const result = validateDigitalAccessoryPlacement(
      accessory,
      referenceFigure(),
      new Matrix4().toArray(),
      [0, 0, 0],
      12,
    );
    expect(result).toMatchObject({
      status: "passed",
      reasonCode: null,
      collisionSampleCount: 0,
      gripLengthLdu: 12,
    });
  });

  it("rejects geometry entering a protected reference-body bound", () => {
    const accessory = new Group();
    accessory.add(mesh("accessory.dat", [40, 2, 2]));
    const result = validateDigitalAccessoryPlacement(
      accessory,
      referenceFigure(),
      new Matrix4().toArray(),
      [0, 0, 0],
      12,
    );
    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("reference-figure-clearance-failed");
    expect(result.collisionSampleCount).toBeGreaterThan(0);
  });

  it("does not reject geometry that enters only an empty corner of a coarse body bound", () => {
    const figure = new Group();
    const diagonalBody = new Group();
    diagonalBody.name = "973.dat";
    const diamond = new Mesh(new BoxGeometry(4, 4, 4), new MeshBasicMaterial());
    diamond.rotation.z = Math.PI / 4;
    diagonalBody.add(diamond);
    figure.add(diagonalBody);

    const accessory = new Group();
    const corner = mesh("accessory.dat", [0.2, 0.2, 0.2]);
    corner.position.set(2.5, 2.5, 0);
    accessory.add(corner);

    expect(validateDigitalAccessoryPlacement(
      accessory,
      figure,
      new Matrix4().toArray(),
      [2.5, 2.5, 0],
      12,
      "closed-mesh",
    )).toMatchObject({ status: "passed", collisionSampleCount: 0 });
  });

  it("rejects a shaft shorter than the reference-hand digital grip span", () => {
    const accessory = new Group();
    accessory.add(mesh("accessory.dat", [2, 4, 2]));
    const result = validateDigitalAccessoryPlacement(
      accessory,
      referenceFigure(),
      new Matrix4().toArray(),
      [0, 0, 0],
      4,
    );
    expect(result).toMatchObject({ status: "rejected", reasonCode: "grip-too-short" });
  });

  it("selects the first safe orientation only when exactly one grip candidate is safe", () => {
    expect(selectUnambiguousDigitalAccessoryGrip([
      gripEvaluation("rejected", "rejected"),
      gripEvaluation("rejected", "passed", "passed"),
      gripEvaluation("rejected"),
    ])).toEqual({
      status: "passed",
      reasonCode: null,
      safeGripCandidatesFound: 1,
      selectedGripCandidateIndex: 1,
      selectedOrientationIndex: 1,
    });
  });

  it("keeps accessories blocked when several distinct grip candidates are safe", () => {
    expect(selectUnambiguousDigitalAccessoryGrip([
      gripEvaluation("passed"),
      gripEvaluation("rejected", "passed"),
    ])).toEqual({
      status: "rejected",
      reasonCode: "multiple-safe-grip-candidates",
      safeGripCandidatesFound: 2,
      selectedGripCandidateIndex: null,
      selectedOrientationIndex: null,
    });
  });

  it("keeps accessories blocked when no grip candidate is safe", () => {
    expect(selectUnambiguousDigitalAccessoryGrip([
      gripEvaluation("rejected"),
      gripEvaluation("rejected", "rejected"),
    ])).toEqual({
      status: "rejected",
      reasonCode: "no-safe-grip-candidate",
      safeGripCandidatesFound: 0,
      selectedGripCandidateIndex: null,
      selectedOrientationIndex: null,
    });
  });
});
