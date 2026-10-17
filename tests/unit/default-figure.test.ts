import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIGURE_TEMPLATE_ID,
  defaultFigureDocument,
  defaultFigureSelections,
  isUntouchedLegacyDefault,
} from "../../src/figure/default-figure.js";
import { createFigureDocument } from "../../src/figure/figure-document.js";

const runtimeFiles = ["head", "headwear", "torso-assembly", "legs-assembly", "hand-accessory"] as const;

describe("default figure", () => {
  it("is a complete figure made only of digitally supported runtime components", async () => {
    const supported = new Set<string>();
    for (const file of runtimeFiles) {
      const runtime = JSON.parse(await readFile(`data/generated/ldraw-runtime/${file}.json`, "utf8")) as {
        entries: Array<{ componentId: string }>;
      };
      for (const entry of runtime.entries) supported.add(entry.componentId);
    }
    const selections = defaultFigureSelections();
    expect(Object.keys(selections).sort()).toEqual(
      ["handAccessory", "head", "headwear", "legsAssembly", "torsoAssembly"],
    );
    for (const componentId of Object.values(selections)) expect(supported.has(componentId)).toBe(true);
    expect(DEFAULT_FIGURE_TEMPLATE_ID).toBe("pirate-captain");
    expect(defaultFigureDocument("Test").selections).toHaveLength(5);
  });

  it("recognises drafts that only contain the old unsupported reference variant", () => {
    const legacyIds = new Set(["ff03-head-3626c", "ff03-torso-3814", "ff03-legs-970c01"]);
    const legacy = createFigureDocument({
      head: "ff03-head-3626c",
      torsoAssembly: "ff03-torso-3814",
      legsAssembly: "ff03-legs-970c01",
    });
    const edited = createFigureDocument({ head: "ff03-head-3626c", torsoAssembly: "catalog:torsoAssembly:973c01h01pr0030" });
    expect(isUntouchedLegacyDefault(legacy, legacyIds)).toBe(true);
    expect(isUntouchedLegacyDefault(edited, legacyIds)).toBe(false);
    expect(isUntouchedLegacyDefault(createFigureDocument({}), legacyIds)).toBe(false);
  });
});
