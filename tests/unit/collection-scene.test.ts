import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { collectionFigureOffsets } from "../../src/scene/CollectionSceneController.js";

describe("Collection shared 3D scene", () => {
  it("places up to six figures symmetrically in stable order", () => {
    expect(collectionFigureOffsets(0)).toEqual([]);
    expect(collectionFigureOffsets(1)).toEqual([0]);
    expect(collectionFigureOffsets(2)).toEqual([-1.1, 1.1]);
    expect(collectionFigureOffsets(3)).toEqual([-2.2, 0, 2.2]);
    expect(collectionFigureOffsets(6)).toEqual([-5.5, -3.3000000000000003, -1.1, 1.1, 3.3000000000000003, 5.5]);
    expect(collectionFigureOffsets(6, true)).toEqual([-4.3, -2.58, -0.86, 0.86, 2.58, 4.3]);
    expect(() => collectionFigureOffsets(7)).toThrow();
  });

  it("uses one scene, one loader and cached shared part templates", async () => {
    const controllerSource = await readFile("src/scene/CollectionSceneController.ts", "utf8");
    const viewportSource = await readFile("src/components/CollectionViewport.tsx", "utf8");

    expect(controllerSource.match(/new LDrawLoader/gu)).toHaveLength(1);
    expect(controllerSource).toContain("#catalogTemplateCache");
    expect(controllerSource).toContain("#resourceTemplates.visible = false");
    expect(controllerSource).toContain("prototype.clone(true)");
    expect(viewportSource.match(/<canvas/gu)).toHaveLength(1);
  });
});
