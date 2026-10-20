import { describe, expect, it } from "vitest";
import { pinnedCatalogKeys, selectCorePartNums } from "../../src/catalog/core-selection.js";
import { comparePartsByPopularity } from "../../src/catalog/part-popularity.js";

const parts = [
  { rebrickablePartNum: "A1", setCount: 5 },
  { rebrickablePartNum: "A2", setCount: 50 },
  { rebrickablePartNum: "A3", setCount: 20 },
  { rebrickablePartNum: "A4" },
  { rebrickablePartNum: "A5", setCount: 99 },
];
const runtimePartNums = new Set(["a1", "a2", "a3", "a4"]);

describe("core package selection", () => {
  it("reads pinned parts from catalog component ids and ignores curated ones", () => {
    const keys = pinnedCatalogKeys([
      { selections: [{ componentId: "catalog:head:3626bpr0027" }, { componentId: "ff03-head-3626c" }] },
      { selections: [{ componentId: "catalog:legsAssembly:970C01" }] },
    ]);

    expect([...keys].sort()).toEqual(["head:3626bpr0027", "legsAssembly:970c01"]);
  });

  it("keeps pinned parts and the most popular builder-ready ones, nothing without a model", () => {
    const selected = selectCorePartNums({
      role: "head",
      parts,
      runtimePartNums,
      pinnedKeys: new Set(["head:a4"]),
      popularCount: 2,
    });

    expect([...selected].sort()).toEqual(["a2", "a3", "a4"]);
  });

  it("selects a prefix of the full popularity order once pinned parts are placed first", () => {
    const pinnedKeys = new Set(["head:a1"]);
    const selected = selectCorePartNums({ role: "head", parts, runtimePartNums, pinnedKeys, popularCount: 1 });
    const fullOrder = parts
      .filter((part) => runtimePartNums.has(part.rebrickablePartNum.toLowerCase()))
      .sort((left, right) => {
        const leftPinned = pinnedKeys.has(`head:${left.rebrickablePartNum.toLowerCase()}`);
        const rightPinned = pinnedKeys.has(`head:${right.rebrickablePartNum.toLowerCase()}`);
        return leftPinned === rightPinned ? comparePartsByPopularity(left, right) : leftPinned ? -1 : 1;
      })
      .map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase());

    expect(fullOrder.slice(0, selected.size).sort()).toEqual([...selected].sort());
  });
});
