import matrixJson from "../../data/curated/ff16-compatibility-matrix.json" with { type: "json" };
import type {
  CompatibilityDecision,
  CompatibilityMatrix,
  CompatibilitySlot,
} from "../contracts/compatibility.js";
import type { ScenePartDefinition } from "../scene/types.js";

export const compatibilityMatrix = matrixJson as CompatibilityMatrix;

function defaultBlocked(message: string): CompatibilityDecision {
  return {
    decision: "blocked",
    reasonCode: "unverified-combination",
    message,
    sourceRuleId: "matrix:default-block",
  };
}

export function evaluateCatalogPlacement(
  componentId: string,
  slot: CompatibilitySlot,
): CompatibilityDecision {
  const rule = compatibilityMatrix.componentRules.find((candidate) => candidate.componentId === componentId);
  if (!rule) {
    return defaultBlocked("Für dieses Katalogteil existiert keine belegte Kompatibilitätsregel.");
  }
  if (!rule.allowedSlots.includes(slot)) {
    return {
      decision: "blocked",
      reasonCode: "wrong-slot",
      message: `Das Teil ist nicht für den Slot ${slot} belegt.`,
      sourceRuleId: rule.id,
    };
  }
  return {
    decision: rule.decision,
    reasonCode: rule.reasonCode,
    message: rule.message,
    sourceRuleId: rule.id,
  };
}

export function evaluateFixturePlacement(definition: ScenePartDefinition): CompatibilityDecision {
  const rule = compatibilityMatrix.fixtureRules.find(
    (candidate) => candidate.slot === definition.slot && candidate.placementFamily === definition.placementFamily,
  );
  if (!rule) {
    return defaultBlocked("Diese Fixture-Platzierungsfamilie ist nicht registriert und wird nicht eingesetzt.");
  }
  return {
    decision: rule.decision,
    reasonCode: rule.reasonCode,
    message: rule.message,
    sourceRuleId: rule.id,
  };
}

export function evaluateExclusion(
  matchType: "rebrickable-part-number" | "family",
  value: string,
): CompatibilityDecision {
  const rule = compatibilityMatrix.exclusionRules.find(
    (candidate) => candidate.matchType === matchType && candidate.value === value,
  );
  if (!rule) {
    return defaultBlocked("Der Kandidat gehört zu keiner geprüften Standardfamilie.");
  }
  return {
    decision: rule.decision,
    reasonCode: rule.reasonCode,
    message: rule.message,
    sourceRuleId: rule.id,
  };
}

export function evaluateSlotConflict(slot: CompatibilitySlot, occupied: boolean): CompatibilityDecision | null {
  if (!occupied) {
    return null;
  }
  const policy = compatibilityMatrix.slotPolicies.find((candidate) => candidate.slot === slot);
  if (!policy) {
    return defaultBlocked("Der belegte Slot hat keine geprüfte Ersetzungsregel.");
  }
  return {
    decision: policy.decision,
    reasonCode: "single-slot-replacement",
    message: policy.message,
    sourceRuleId: policy.id,
  };
}
