import { createHash } from "node:crypto";
import type { Ff06ProcurementDataset } from "../src/contracts/procurement.js";
import type { TestAssortment } from "../src/contracts/test-assortment.js";
import { mappingReviewSchema, type DuplicateGroup, type MappingReview, type MappingReviewItem } from "../src/contracts/mapping-review.js";

const sourcePolicy = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

const hashKey = (value: string): string => createHash("sha256").update(value).digest("hex").slice(0, 16);

const statusForReview = (status: "pending" | "verified" | "rejected"): MappingReviewItem["status"] =>
  status === "verified" ? "pending" : status;

const pushMapping = (items: MappingReviewItem[], item: Omit<MappingReviewItem, "id">): void => {
  items.push({
    ...item,
    id: `${item.entityType.toLowerCase()}:${item.entityId}:${item.field.toLowerCase()}`,
  });
};

const addDuplicateGroups = (
  kind: DuplicateGroup["kind"],
  groups: Map<string, string[]>,
  duplicateGroups: DuplicateGroup[],
): void => {
  for (const [key, entityIds] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const sortedIds = [...new Set(entityIds)].sort((left, right) => left.localeCompare(right));
    if (sortedIds.length < 2) {
      continue;
    }
    duplicateGroups.push({
      id: `duplicate:${kind.toLowerCase()}:${hashKey(key)}`,
      kind,
      key,
      entityIds: sortedIds,
      status: "review",
      note: "Automatisches Dublettensignal; vor einer Freigabe ist eine menschliche Prüfung erforderlich.",
    });
  }
};

export type MappingReviewInput = {
  assortment: TestAssortment;
  procurement: Ff06ProcurementDataset;
  sourceAssortmentSha256: string;
  sourceLockSha256: string;
};

export const buildMappingReview = ({
  assortment,
  procurement,
  sourceAssortmentSha256,
  sourceLockSha256,
}: MappingReviewInput): MappingReview => {
  const openMappings: MappingReviewItem[] = [];
  const componentPartNumbers = new Map<string, string[]>();
  const variantSignatures = new Map<string, string[]>();
  const procurementRecipesByVariant = new Map<string, string[]>();

  for (const component of [...assortment.components].sort((left, right) => left.id.localeCompare(right.id))) {
    componentPartNumbers.set(component.rebrickablePartNum, [
      ...(componentPartNumbers.get(component.rebrickablePartNum) ?? []),
      component.id,
    ]);

    if (component.attachmentProfile.status !== "verified") {
      pushMapping(openMappings, {
        entityType: "component",
        entityId: component.id,
        field: "attachment",
        status: statusForReview(component.attachmentProfile.status),
        blocker: component.attachmentProfile.blocker,
        sourceIds: component.catalogEvidenceIds,
        candidateIds: [],
      });
    }
    if (component.procurement.status !== "verified") {
      pushMapping(openMappings, {
        entityType: "component",
        entityId: component.id,
        field: "procurement",
        status: component.procurement.status,
        blocker: component.procurement.blocker,
        sourceIds: component.catalogEvidenceIds,
        candidateIds: [],
      });
    }
    if (component.renderStatus !== "exact") {
      pushMapping(openMappings, {
        entityType: "component",
        entityId: component.id,
        field: "render",
        status: component.renderStatus === "missing" ? "missing" : "pending",
        blocker: `Exact render asset is not available (status: ${component.renderStatus}).`,
        sourceIds: component.catalogEvidenceIds,
        candidateIds: [],
      });
    }
    if (component.humanReview !== "verified") {
      pushMapping(openMappings, {
        entityType: "component",
        entityId: component.id,
        field: "humanReview",
        status: statusForReview(component.humanReview),
        blocker: "Human review is not complete.",
        sourceIds: component.catalogEvidenceIds,
        candidateIds: [],
      });
    }
  }

  for (const variant of [...assortment.variants].sort((left, right) => left.id.localeCompare(right.id))) {
    const signature = [
      variant.headId,
      variant.headwearId,
      variant.torsoAssemblyId,
      variant.legsAssemblyId,
      variant.handAccessoryId,
    ].join("|");
    variantSignatures.set(signature, [...(variantSignatures.get(signature) ?? []), variant.id]);

    if (variant.renderStatus !== "exact") {
      pushMapping(openMappings, {
        entityType: "variant",
        entityId: variant.id,
        field: "render",
        status: variant.renderStatus === "missing" ? "missing" : "pending",
        blocker: variant.blocker,
        sourceIds: variant.catalogEvidenceIds,
        candidateIds: [],
      });
    }
    if (variant.procurementStatus !== "verified") {
      pushMapping(openMappings, {
        entityType: "variant",
        entityId: variant.id,
        field: "procurement",
        status: variant.procurementStatus,
        blocker: variant.blocker,
        sourceIds: variant.catalogEvidenceIds,
        candidateIds: [],
      });
    }
    if (variant.releaseStatus !== "published") {
      pushMapping(openMappings, {
        entityType: "variant",
        entityId: variant.id,
        field: "release",
        status: "blocked",
        blocker: variant.blocker,
        sourceIds: variant.catalogEvidenceIds,
        candidateIds: [],
      });
    }
  }

  for (const recipe of [...procurement.recipes].sort((left, right) => left.id.localeCompare(right.id))) {
    procurementRecipesByVariant.set(recipe.variantId, [
      ...(procurementRecipesByVariant.get(recipe.variantId) ?? []),
      recipe.id,
    ]);
    if (recipe.recipe.status !== "verified") {
      pushMapping(openMappings, {
        entityType: "procurementRecipe",
        entityId: recipe.id,
        field: "recipe",
        status: recipe.recipe.status,
        blocker: recipe.blocker ?? "Procurement recipe is not verified.",
        sourceIds: recipe.catalogEvidenceIds,
        candidateIds: [],
      });
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];
  addDuplicateGroups("rebrickablePartNum", componentPartNumbers, duplicateGroups);
  addDuplicateGroups("variantSignature", variantSignatures, duplicateGroups);
  addDuplicateGroups("procurementRecipe", procurementRecipesByVariant, duplicateGroups);

  const sharedEvidenceCounts = new Map<string, number>();
  for (const component of assortment.components) {
    for (const evidenceId of component.catalogEvidenceIds.filter((id) => id.startsWith("evidence:category:"))) {
      sharedEvidenceCounts.set(evidenceId, (sharedEvidenceCounts.get(evidenceId) ?? 0) + 1);
    }
  }
  const excludedSharedEvidenceIds = [...sharedEvidenceCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([evidenceId]) => evidenceId)
    .sort((left, right) => left.localeCompare(right));

  const countBy = (field: MappingReviewItem["field"]): number =>
    openMappings.filter((item) => item.field === field).length;
  const blockedComponentCount = assortment.components.filter(({ releaseStatus }) => releaseStatus === "blocked").length;
  const blockedVariantCount = assortment.variants.filter(({ releaseStatus }) => releaseStatus === "blocked").length;

  return mappingReviewSchema.parse({
    schemaVersion: 1,
    ticket: "FF-09",
    sourcePolicy,
    sourceAssortmentSha256,
    sourceLockSha256,
    generatedFrom: {
      componentCount: assortment.components.length,
      variantCount: assortment.variants.length,
      recipeCount: procurement.recipes.length,
    },
    summary: {
      openMappingCount: openMappings.length,
      duplicateGroupCount: duplicateGroups.length,
      blockedComponentCount,
      blockedVariantCount,
      unresolvedProcurementCount: countBy("procurement"),
      unresolvedAttachmentCount: countBy("attachment"),
      unresolvedRenderCount: countBy("render"),
      unresolvedHumanReviewCount: countBy("humanReview"),
      unresolvedReleaseCount: countBy("release"),
      unresolvedRecipeCount: countBy("recipe"),
    },
    openMappings: openMappings.sort((left, right) => left.id.localeCompare(right.id)),
    duplicateGroups: duplicateGroups.sort((left, right) => left.id.localeCompare(right.id)),
    excludedSharedEvidenceIds,
    openBlockers: [
      ...assortment.openBlockers,
      ...procurement.openBlockers,
      "FF-09 leaves candidateIds empty until a source-backed human mapping is verified.",
    ].filter((blocker, index, blockers) => blockers.indexOf(blocker) === index),
  });
};
