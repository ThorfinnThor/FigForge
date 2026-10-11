import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ldrawAccessoryOrientationReviewSchema } from "../src/contracts/ldraw-accessory-orientation-review.js";
import { ldrawRuntimePackageSchema } from "../src/contracts/ldraw-runtime-package.js";

const root = process.cwd();
const runtimePath = resolve(root, "data/generated/ldraw-runtime/hand-accessory.json");
const expandedPath = resolve(root, "data/generated/ldraw-expanded-catalog.json");
const outputPath = resolve(root, "data/generated/ldraw-accessory-orientation-review.json");
const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

const [runtimeRaw, expandedRaw] = await Promise.all([
  readFile(runtimePath),
  readFile(expandedPath),
]);
const runtime = ldrawRuntimePackageSchema.parse(JSON.parse(runtimeRaw.toString("utf8")) as unknown);
const expanded = JSON.parse(expandedRaw.toString("utf8")) as {
  entries: Array<{
    role: string;
    componentId: string;
    rebrickablePartNum: string;
    name: string;
    ldrawFile: string;
    modelUrl: string;
    thumbnailUrl: string;
    placementMode: string;
    placementTransformLdu: number[];
    digitalValidation?: {
      status: string;
      selectedOrientationIndex?: number;
      orientationCandidatesTested?: number;
      collisionSampleCount?: number;
      gripCandidatesTested?: number;
      gripLengthLdu?: number;
      gripPrimitive?: string;
      modelBoundsLdu?: { size: [number, number, number] };
    };
  }>;
};
const expandedByComponent = new Map(expanded.entries.map((entry) => [entry.componentId, entry]));

const requiredChecks = [
  "Prüfe in Dreiviertel-, Vorder- und Rückansicht, ob das Zubehör sichtbar an der Hand statt am Lauf, Körper oder außerhalb der Hand sitzt.",
  "Prüfe Griffachse, Einstecktiefe und Rotation auf eine visuell plausible Haltung; geometrische Kollisionsfreiheit allein genügt nicht.",
  "Dokumentiere bei einem Fehler die Ansicht, eine kurze Begründung und einen Screenshot oder eine reproduzierbare Referenz.",
];

const entries = runtime.entries.map((runtimeEntry) => {
  const expandedEntry = expandedByComponent.get(runtimeEntry.componentId);
  if (!expandedEntry || expandedEntry.role !== "handAccessory") {
    throw new Error(`Missing expanded hand-accessory entry for ${runtimeEntry.componentId}`);
  }
  const validation = expandedEntry.digitalValidation;
  if (
    expandedEntry.placementMode !== "snap-connector" ||
    !validation ||
    validation.status !== "passed" ||
    validation.selectedOrientationIndex === undefined ||
    validation.orientationCandidatesTested === undefined ||
    validation.collisionSampleCount === undefined ||
    validation.gripCandidatesTested === undefined ||
    validation.gripLengthLdu === undefined ||
    !validation.gripPrimitive ||
    !validation.modelBoundsLdu
  ) {
    throw new Error(`Incomplete digital placement evidence for ${runtimeEntry.componentId}`);
  }
  const riskFlags = [
    ...(validation.selectedOrientationIndex > 0 ? ["non-default-orientation" as const] : []),
    ...(Math.max(...validation.modelBoundsLdu.size) > 120 ? ["long-accessory-extent" as const] : []),
    ...(validation.gripCandidatesTested > 1 ? ["multiple-grip-candidates" as const] : []),
  ];
  const priorityScore = 1
    + (riskFlags.includes("non-default-orientation") ? 1 : 0)
    + (riskFlags.includes("long-accessory-extent") ? 1 : 0)
    + (riskFlags.includes("multiple-grip-candidates") ? 2 : 0);
  return {
    id: `accessory-orientation-review:${runtimeEntry.rebrickablePartNum}`,
    componentId: runtimeEntry.componentId,
    rebrickablePartNum: runtimeEntry.rebrickablePartNum,
    name: expandedEntry.name,
    ldrawFile: expandedEntry.ldrawFile,
    modelUrl: runtimeEntry.modelUrl,
    thumbnailUrl: runtimeEntry.thumbnailUrl,
    placementMode: "snap-connector" as const,
    placementTransformLdu: runtimeEntry.placementTransformLdu,
    digitalValidation: {
      status: "passed" as const,
      selectedOrientationIndex: validation.selectedOrientationIndex,
      orientationCandidatesTested: validation.orientationCandidatesTested,
      collisionSampleCount: validation.collisionSampleCount,
      gripCandidatesTested: validation.gripCandidatesTested,
      gripLengthLdu: validation.gripLengthLdu,
      gripPrimitive: validation.gripPrimitive,
    },
    reviewViews: ["three-quarter", "front", "back"] as const,
    riskFlags,
    priorityScore,
    priorityTier: priorityScore >= 3 ? "high" as const : priorityScore === 2 ? "medium" as const : "standard" as const,
    queueRank: 0,
    reviewStatus: "pending-human-visual-review" as const,
    requiredChecks,
    reviewer: null,
    reviewedAt: null,
    evidenceReference: null,
  };
}).sort((left, right) => right.priorityScore - left.priorityScore || left.rebrickablePartNum.localeCompare(right.rebrickablePartNum));

entries.forEach((entry, index) => { entry.queueRank = index + 1; });

const document = ldrawAccessoryOrientationReviewSchema.parse({
  schemaVersion: 1,
  ticket: "FF-ACCESSORY-ORIENTATION",
  generatedAt: new Date().toISOString().slice(0, 10),
  sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
  publishable: false,
  sourceHashes: {
    runtimePackageSha256: sha256(runtimeRaw),
    expandedCatalogSha256: sha256(expandedRaw),
  },
  entries,
  summary: {
    entryCount: entries.length,
    pendingReviewCount: entries.length,
    nonDefaultOrientationCount: entries.filter(({ riskFlags }) => riskFlags.includes("non-default-orientation")).length,
    longAccessoryExtentCount: entries.filter(({ riskFlags }) => riskFlags.includes("long-accessory-extent")).length,
    multipleGripCandidateCount: entries.filter(({ riskFlags }) => riskFlags.includes("multiple-grip-candidates")).length,
    highPriorityCount: entries.filter(({ priorityTier }) => priorityTier === "high").length,
    mediumPriorityCount: entries.filter(({ priorityTier }) => priorityTier === "medium").length,
  },
  limitations: [
    "Die Warteschlange beweist keine physische Passform und keine visuell richtige Ausrichtung.",
    "Ein bestandener Kollisionscheck bedeutet nur, dass die geprüfte Transformationsvariante den Referenzkörper nicht schneidet.",
    "Ein Eintrag darf erst nach Sichtprüfung in allen drei Ansichten als visuell bestätigt markiert werden.",
  ],
});

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ message: "accessory orientation review queue built", ...document.summary }));
