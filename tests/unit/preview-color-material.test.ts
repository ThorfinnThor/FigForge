import { BufferGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";
import { applyPreviewColor, disposePreviewColorMaterials } from "../../src/scene/preview-color.js";

const material = (code: string, color: number): MeshStandardMaterial => {
  const result = new MeshStandardMaterial({ color });
  result.userData.code = code;
  return result;
};

describe("applyPreviewColor", () => {
  const build = () => {
    const shared = material("10000", 0xa0a8a4);
    const fixed = material("14", 0xffcc00);
    const body = new Mesh(new BufferGeometry(), shared);
    const secondBody = new Mesh(new BufferGeometry(), shared);
    const arms = new Mesh(new BufferGeometry(), fixed);
    const root = new Group().add(body, secondBody, arms);
    return { root, body, secondBody, arms, shared, fixed };
  };

  it("recolours the main colour only and leaves fixed colours and the loader's material alone", () => {
    const { root, body, secondBody, arms, shared, fixed } = build();

    applyPreviewColor(root, { hex: "#B40000", alpha: 1 });

    expect((body.material).color.getHexString()).toBe("b40000");
    expect((secondBody.material).color.getHexString()).toBe("b40000");
    expect(arms.material).toBe(fixed);
    expect(fixed.color.getHexString()).toBe("ffcc00");
    expect(shared.color.getHexString()).toBe("a0a8a4");
    expect(body.material).not.toBe(shared);
  });

  it("makes transparent colours see-through and restores the model colour on request", () => {
    const { root, body } = build();

    applyPreviewColor(root, { hex: "#FCFCFC", alpha: 0.5 });
    const painted = body.material;
    expect(painted.transparent).toBe(true);
    expect(painted.opacity).toBeCloseTo(0.5);
    expect(painted.depthWrite).toBe(false);

    applyPreviewColor(root, undefined);
    expect((body.material).color.getHexString()).toBe("a0a8a4");
    expect((body.material).transparent).toBe(false);
    expect((body.material).opacity).toBe(1);
  });

  it("does not touch materials when no colour was ever applied", () => {
    const { root, body, shared } = build();

    applyPreviewColor(root, undefined);

    expect(body.material).toBe(shared);
  });

  it("recolours one clone of a shared template without changing the template or another clone", () => {
    const { root, body } = build();
    const first = root.clone(true);
    const second = root.clone(true);

    applyPreviewColor(first, { hex: "#B40000", alpha: 1 });

    const colourOf = (group: Group): string => ((group.children[0] as Mesh).material as MeshStandardMaterial).color.getHexString();
    expect(colourOf(first)).toBe("b40000");
    expect(colourOf(second)).toBe("a0a8a4");
    expect(colourOf(root)).toBe("a0a8a4");
    expect(body.material).toBe((root.children[0] as Mesh).material);
  });

  it("disposes only the copies it made", () => {
    const { root, shared, fixed } = build();
    let disposed = 0;
    for (const entry of [shared, fixed]) entry.addEventListener("dispose", () => { disposed += 1; });
    const clone = root.clone(true);

    applyPreviewColor(clone, { hex: "#B40000", alpha: 1 });
    const copy = (clone.children[0] as Mesh).material as MeshStandardMaterial;
    copy.addEventListener("dispose", () => { disposed += 100; });
    disposePreviewColorMaterials(clone);

    expect(disposed).toBe(100);
  });
});
