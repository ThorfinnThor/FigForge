import { Group } from "three";
import { describe, expect, it } from "vitest";
import registryJson from "../../data/curated/ff05-anchor-registry.json" with { type: "json" };
import { anchorRegistrySchema } from "../../src/contracts/anchor-registry.js";
import { AnchorRegistry } from "../../src/scene/anchor-registry.js";

describe("FF-05 anchor registry", () => {
  it("validates the four fixture-only slot families", () => {
    const document = anchorRegistrySchema.parse(registryJson);

    expect(document.publishable).toBe(false);
    expect(document.anchors.map(({ slot }) => slot)).toEqual([
      "head",
      "headwear",
      "leftHandAccessory",
      "rightHandAccessory",
    ]);
    expect(document.anchors.every(({ reviewStatus }) => reviewStatus === "fixture-only")).toBe(true);
  });

  it("resolves the documented hierarchy and world positions", () => {
    const registry = new AnchorRegistry(anchorRegistrySchema.parse(registryJson));
    const torso = new Group();
    const roots = registry.createSlotRoots(torso);

    expect(roots.head.parent).toBe(torso);
    expect(roots.headwear.parent).toBe(roots.head);
    expect(registry.getWorldTransform(roots, "head").position.toArray()).toEqual([0, 2.88, 0]);
    expect(registry.getWorldTransform(roots, "headwear").position.toArray()).toEqual([0, 3.33, 0]);
    expect(registry.getWorldTransform(roots, "leftHandAccessory").position.toArray()).toEqual([
      -0.77, 1.23, 0,
    ]);
    expect(registry.getWorldTransform(roots, "rightHandAccessory").position.toArray()).toEqual([
      0.77, 1.23, 0,
    ]);
  });

  it("blocks an unregistered placement family", () => {
    const registry = new AnchorRegistry(anchorRegistrySchema.parse(registryJson));

    expect(() => registry.assertPlacement("head", "unverified-special-head")).toThrow(
      /not allowed/u,
    );
  });
});
