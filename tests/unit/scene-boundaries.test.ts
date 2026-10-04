import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { cameraPresetPositions } from "../../src/scene/FigureSceneController.js";
import { assertInternalLDrawUrl } from "../../src/scene/ldraw-part-loader.js";

describe("FF-04 scene boundaries", () => {
  it("exposes exactly the planned camera presets", () => {
    expect(Object.keys(cameraPresetPositions)).toEqual(["three-quarter", "front", "back"]);
  });

  it("accepts only same-origin LDraw asset files", () => {
    expect(assertInternalLDrawUrl("/assets/ldraw/head.mpd", "https://figforge.example/app").href).toBe(
      "https://figforge.example/assets/ldraw/head.mpd",
    );
    expect(() =>
      assertInternalLDrawUrl("https://untrusted.example/head.mpd", "https://figforge.example/app"),
    ).toThrow(/same-origin/u);
    expect(() => assertInternalLDrawUrl("/assets/head.glb", "https://figforge.example/app")).toThrow(
      /same-origin/u,
    );
  });

  it("exposes an explicit scene recovery path without hiding errors", async () => {
    const viewportSource = await readFile("src/components/FigureViewport.tsx", "utf8");
    const controllerSource = await readFile("src/scene/FigureSceneController.ts", "utf8");

    expect(viewportSource).toContain('t("viewport.recover")');
    expect(viewportSource).toContain('sceneState === "context-lost"');
    expect(controllerSource).toContain("requestContextRestore");
    expect(controllerSource).toContain("forceContextLoss");
  });

  it("does not reuse a stale LDraw file map after catalog deployments", async () => {
    const controllerSource = await readFile("src/scene/LDrawPrototypeSceneController.ts", "utf8");

    expect(controllerSource).toContain('fetch(url, { cache: "no-store" })');
  });

  it("removes missing catalog roles and invalidates in-flight model loads", async () => {
    const controllerSource = await readFile("src/scene/LDrawPrototypeSceneController.ts", "utf8");

    expect(controllerSource).toContain("if (!roles.has(role)) this.#removeCatalogPart(role)");
    expect(controllerSource).toContain("this.#selectionRevisions.set(role");
    expect(controllerSource).toContain("this.#selectedComponentIds.delete(role)");
    expect(controllerSource).toContain("this.#slotObjects.delete(role)");
  });
});
