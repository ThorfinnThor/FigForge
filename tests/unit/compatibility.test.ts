import { describe, expect, it } from "vitest";
import {
  compatibilityMatrix,
  evaluateCatalogPlacement,
  evaluateExclusion,
  evaluateFixturePlacement,
  evaluateSlotConflict,
} from "../../src/compatibility/compatibility-evaluator.js";
import type { ScenePartDefinition } from "../../src/scene/types.js";

describe("FF-16 compatibility matrix", () => {
  it("defaults to blocked and keeps every real FF-03 component blocked", () => {
    expect(compatibilityMatrix.defaultDecision).toBe("blocked");
    expect(compatibilityMatrix.publishable).toBe(false);
    expect(compatibilityMatrix.componentRules).toHaveLength(17);
    expect(compatibilityMatrix.componentRules.every(({ decision }) => decision === "blocked")).toBe(true);
    expect(evaluateCatalogPlacement("ff03-head-3626c", "head")).toMatchObject({
      decision: "blocked",
      reasonCode: "attachment-unverified",
    });
    expect(evaluateCatalogPlacement("ff03-head-3626c", "headwear")).toMatchObject({
      decision: "blocked",
      reasonCode: "wrong-slot",
    });
  });

  it("allows only a visible warning for registered synthetic fixture placement", () => {
    const fixture: ScenePartDefinition = {
      id: "fixture-head",
      label: "Fixture head",
      slot: "head",
      placementFamily: "fixture-standard-head",
      fixtureStyle: "plain",
    };
    expect(evaluateFixturePlacement(fixture)).toMatchObject({
      decision: "warning",
      reasonCode: "fixture-only",
    });
    expect(evaluateFixturePlacement({ ...fixture, placementFamily: "unknown-head" })).toMatchObject({
      decision: "blocked",
      reasonCode: "unverified-combination",
    });
  });

  it("hard-blocks excluded part numbers and unsupported families", () => {
    expect(evaluateExclusion("rebrickable-part-number", "100456pr0001")).toMatchObject({
      decision: "blocked",
      reasonCode: "non-standard-body-system",
    });
    expect(evaluateExclusion("family", "flexible-part")).toMatchObject({
      decision: "blocked",
      reasonCode: "unsupported-flexible-part",
    });
    expect(evaluateExclusion("family", "unknown-family")).toMatchObject({
      decision: "blocked",
      reasonCode: "unverified-combination",
    });
  });

  it("documents headwear as a single replacement slot", () => {
    expect(evaluateSlotConflict("headwear", false)).toBeNull();
    expect(evaluateSlotConflict("headwear", true)).toMatchObject({
      decision: "warning",
      reasonCode: "single-slot-replacement",
      sourceRuleId: "slot-policy:headwear-single",
    });
    expect(evaluateSlotConflict("head", true)).toMatchObject({
      decision: "blocked",
      reasonCode: "unverified-combination",
    });
  });
});
