import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial } from "three";
import { describe, expect, it } from "vitest";
import { validateDigitalAccessoryPlacement } from "../../tools/lib/ldraw-accessory-clearance.js";

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
});
