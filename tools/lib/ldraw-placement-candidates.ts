import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Matrix4, Vector3 } from "three";
import type { LDrawCatalogCoverageEntry, LDrawCatalogCoverageReport } from "./ldraw-catalog-coverage.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;
const MAX_DEPTH = 64;
const MAX_REFERENCES_PER_PART = 20_000;

type LDrawReference = { file: string; transform: Matrix4 };

export type CylinderEvidence = {
  primitive: string;
  radiusLdu: number;
  lengthLdu: number;
  centerLdu: [number, number, number];
  axis: [number, number, number];
  sourceConnectorTransformLdu: number[];
};

export type PlacementCandidate = Pick<
  LDrawCatalogCoverageEntry,
  "catalogId" | "role" | "rebrickablePartNum" | "name" | "ldrawFiles"
> & {
  analysis:
    | "unique-radius-4-cylinder-candidate"
    | "multiple-radius-4-cylinder-candidates"
    | "no-radius-4-cylinder-detected"
    | "role-specific-assembly-profile-required";
  evidence: CylinderEvidence[];
  proposedPlacementTransformLdu: number[] | null;
  automaticBuilderEnablement: false;
  limitation: string;
};

export type SourceQueueEntry = Pick<
  LDrawCatalogCoverageEntry,
  "catalogId" | "role" | "rebrickablePartNum" | "name" | "ldrawFiles" | "mappingEvidence"
>;

export type LDrawPlacementCandidateReport = {
  schemaVersion: 1;
  generatedAt: "2026-09-28";
  sourcePolicy: typeof SOURCE_POLICY;
  sources: LDrawCatalogCoverageReport["sources"];
  methodology: string[];
  execution: {
    rebrickableApiUsed: false;
    mocFilesUsed: 0;
    automaticBuilderEnablements: 0;
  };
  summary: {
    placementProfileRequiredCount: number;
    uniqueRadius4CandidateCount: number;
    multipleRadius4CandidateCount: number;
    noRadius4CylinderDetectedCount: number;
    roleSpecificAssemblyProfileRequiredCount: number;
    noOfficialMappingQueueCount: number;
    ambiguousOfficialMappingQueueCount: number;
  };
  placementCandidates: PlacementCandidate[];
  sourceQueue: {
    retryPolicy: "re-run-after-locked-catalog-or-official-ldraw-update";
    noOfficialMapping: SourceQueueEntry[];
    ambiguousOfficialMapping: SourceQueueEntry[];
  };
  limitations: string[];
};

const roundedNumber = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const roundedMatrix = (matrix: Matrix4): number[] => matrix.toArray().map(roundedNumber);
const roundedVector = (vector: Vector3): [number, number, number] => [
  roundedNumber(vector.x),
  roundedNumber(vector.y),
  roundedNumber(vector.z),
];

export function ldrawMatrix(values: readonly number[]): Matrix4 {
  if (values.length !== 12 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("LDraw transform must contain twelve finite values");
  }
  const [x, y, z, a, b, c, d, e, f, g, h, i] = values as [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  return new Matrix4().fromArray([a, d, g, 0, b, e, h, 0, c, f, i, 0, x, y, z, 1]);
}

export function parseLDrawReferences(source: string): LDrawReference[] {
  const references: LDrawReference[] = [];
  for (const line of source.split(/\r?\n/u)) {
    const tokens = line.trim().split(/\s+/u);
    if (tokens[0] !== "1" || tokens.length < 15) continue;
    const values = tokens.slice(2, 14).map(Number);
    if (values.some((value) => !Number.isFinite(value))) continue;
    references.push({
      file: tokens.slice(14).join(" ").replaceAll("\\", "/").toLowerCase(),
      transform: ldrawMatrix(values),
    });
  }
  return references;
}

export function isFullCylinderPrimitive(file: string): boolean {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  return /(?:^|\/)(?:4-4cyli|4-4cylc)\.dat$/u.test(normalized);
}

export function cylinderEvidenceFromTransform(
  primitive: string,
  transform: Matrix4,
): CylinderEvidence | null {
  const elements = transform.elements;
  const xAxis = new Vector3(elements[0], elements[1], elements[2]);
  const yAxis = new Vector3(elements[4], elements[5], elements[6]);
  const zAxis = new Vector3(elements[8], elements[9], elements[10]);
  const radiusLdu = (xAxis.length() + zAxis.length()) / 2;
  const lengthLdu = yAxis.length();
  if (radiusLdu <= 0 || lengthLdu <= 0) return null;

  const start = new Vector3(elements[12], elements[13], elements[14]);
  const center = start.clone().add(yAxis.clone().multiplyScalar(0.5));
  const sourceConnector = new Matrix4().makeBasis(
    xAxis.normalize(),
    yAxis.normalize(),
    zAxis.normalize(),
  ).setPosition(center);
  return {
    primitive,
    radiusLdu: roundedNumber(radiusLdu),
    lengthLdu: roundedNumber(lengthLdu),
    centerLdu: roundedVector(center),
    axis: roundedVector(yAxis),
    sourceConnectorTransformLdu: roundedMatrix(sourceConnector),
  };
}

const evidenceKey = (evidence: CylinderEvidence): string => [
  ...evidence.centerLdu,
  ...evidence.axis.map((value) => Math.abs(value)),
  evidence.radiusLdu,
  evidence.lengthLdu,
].map((value) => roundedNumber(value)).join(":");

function referenceCandidates(currentFile: string, reference: string): string[] {
  if (reference.startsWith("s/")) return [`parts/${reference}`];
  if (reference.startsWith("48/") || reference.startsWith("8/")) return [`p/${reference}`];
  if (reference.startsWith("parts/") || reference.startsWith("p/")) return [reference];
  return [resolve(dirname(currentFile), reference), `parts/${reference}`, `p/${reference}`]
    .map((value) => value.replaceAll("\\", "/"));
}

async function existingReference(libraryRoot: string, currentFile: string, reference: string): Promise<string | null> {
  for (const candidate of referenceCandidates(currentFile, reference)) {
    const relative = candidate.startsWith("/") ? candidate.slice(1) : candidate;
    try {
      await readFile(resolve(libraryRoot, relative), "utf8");
      return relative;
    } catch {
      // Try the next official-library location.
    }
  }
  return null;
}

export async function collectCylinderEvidence(
  libraryRoot: string,
  topLevelFile: string,
): Promise<CylinderEvidence[]> {
  const referenceCache = new Map<string, LDrawReference[]>();
  const sourceCache = new Map<string, string>();
  let visitedReferenceCount = 0;
  const evidence = new Map<string, CylinderEvidence>();

  const referencesFor = async (file: string): Promise<LDrawReference[]> => {
    const cached = referenceCache.get(file);
    if (cached) return cached;
    const source = sourceCache.get(file) ?? await readFile(resolve(libraryRoot, file), "utf8");
    sourceCache.set(file, source);
    const parsed = parseLDrawReferences(source);
    referenceCache.set(file, parsed);
    return parsed;
  };

  const visit = async (file: string, parentTransform: Matrix4, stack: ReadonlySet<string>, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH) throw new Error(`LDraw recursion depth exceeded for ${topLevelFile}`);
    if (stack.has(file)) return;
    const nextStack = new Set(stack).add(file);
    for (const reference of await referencesFor(file)) {
      visitedReferenceCount += 1;
      if (visitedReferenceCount > MAX_REFERENCES_PER_PART) {
        throw new Error(`LDraw reference limit exceeded for ${topLevelFile}`);
      }
      const resolvedReference = await existingReference(libraryRoot, file, reference.file);
      if (!resolvedReference) continue;
      const worldTransform = parentTransform.clone().multiply(reference.transform);
      if (isFullCylinderPrimitive(resolvedReference)) {
        const item = cylinderEvidenceFromTransform(resolvedReference, worldTransform);
        if (item) evidence.set(evidenceKey(item), item);
        continue;
      }
      await visit(resolvedReference, worldTransform, nextStack, depth + 1);
    }
  };

  await visit(topLevelFile, new Matrix4(), new Set(), 0);
  return [...evidence.values()].sort((left, right) =>
    left.radiusLdu - right.radiusLdu || left.lengthLdu - right.lengthLdu || evidenceKey(left).localeCompare(evidenceKey(right))
  );
}

const rightHand = ldrawMatrix([23.6904, 26.774, -9.8982, 0.985, 0.1202, -0.1202, -0.17, 0.6964, -0.6964, 0, 0.707, 0.707]);
const handGrip = ldrawMatrix([0, -0.82275, -9.8951, 1, 0, 0, 0, 0.9681, -0.2504, 0, 0.2504, 0.9681]);

export function proposedHandPlacement(evidence: CylinderEvidence): number[] {
  return proposedHandPlacements(evidence)[0]!;
}

export function proposedHandPlacements(evidence: CylinderEvidence): number[][] {
  const targetConnector = rightHand.clone().multiply(handGrip);
  const sourceConnectorInverse = new Matrix4()
    .fromArray(evidence.sourceConnectorTransformLdu)
    .invert();
  const placements: number[][] = [];
  for (const flip of [0, Math.PI]) {
    for (const roll of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
      const connectorOrientation = new Matrix4()
        .makeRotationY(roll)
        .multiply(new Matrix4().makeRotationX(flip));
      const placement = roundedMatrix(
        targetConnector.clone().multiply(connectorOrientation).multiply(sourceConnectorInverse),
      );
      if (!placements.some((existing) => existing.every((value, index) => value === placement[index]))) {
        placements.push(placement);
      }
    }
  }
  return placements;
}

const isGripCandidate = (item: CylinderEvidence): boolean =>
  item.radiusLdu >= 3.75 && item.radiusLdu <= 4.25 && item.lengthLdu >= 4;

const queueEntry = (entry: LDrawCatalogCoverageEntry): SourceQueueEntry => ({
  catalogId: entry.catalogId,
  role: entry.role,
  rebrickablePartNum: entry.rebrickablePartNum,
  name: entry.name,
  ldrawFiles: entry.ldrawFiles,
  mappingEvidence: entry.mappingEvidence,
});

async function analyzePlacementEntry(
  entry: LDrawCatalogCoverageEntry,
  libraryRoot: string,
): Promise<PlacementCandidate> {
  if (entry.role !== "handAccessory") {
    return {
      ...queueEntry(entry),
      analysis: "role-specific-assembly-profile-required",
      evidence: [],
      proposedPlacementTransformLdu: null,
      automaticBuilderEnablement: false,
      limitation: "Cylinder analysis does not establish a safe assembly or body-slot placement for this role.",
    };
  }
  const topLevelFile = entry.ldrawFiles[0];
  if (!topLevelFile) throw new Error(`Missing unique LDraw mapping for ${entry.catalogId}`);
  const detected = (await collectCylinderEvidence(libraryRoot, topLevelFile)).filter(isGripCandidate);
  if (detected.length === 1) {
    return {
      ...queueEntry(entry),
      analysis: "unique-radius-4-cylinder-candidate",
      evidence: detected,
      proposedPlacementTransformLdu: proposedHandPlacement(detected[0]!),
      automaticBuilderEnablement: false,
      limitation: "A radius-4 cylinder is geometric evidence only; it may be decorative or unsuitable as the intended hand grip.",
    };
  }
  return {
    ...queueEntry(entry),
    analysis: detected.length > 1
      ? "multiple-radius-4-cylinder-candidates"
      : "no-radius-4-cylinder-detected",
    evidence: detected,
    proposedPlacementTransformLdu: null,
    automaticBuilderEnablement: false,
    limitation: detected.length > 1
      ? "Several possible shafts exist; selecting one automatically would guess the intended grip."
      : "Official LDraw files can encode shafts as direct mesh triangles, so absence of a cylinder primitive is not proof that no grip exists.",
  };
}

export async function buildLDrawPlacementCandidateReport(
  coverage: LDrawCatalogCoverageReport,
  libraryRoot: string,
): Promise<LDrawPlacementCandidateReport> {
  if (coverage.sourcePolicy !== SOURCE_POLICY) throw new Error("Coverage source policy mismatch");
  const placementEntries = coverage.remainingEntries.filter(({ classification }) =>
    classification === "placement-profile-required"
  );
  const placementCandidates: PlacementCandidate[] = [];
  for (const entry of placementEntries) {
    placementCandidates.push(await analyzePlacementEntry(entry, libraryRoot));
  }
  const noOfficialMapping = coverage.remainingEntries
    .filter(({ classification }) => classification === "no-official-mapping")
    .map(queueEntry);
  const ambiguousOfficialMapping = coverage.remainingEntries
    .filter(({ classification }) => classification === "ambiguous-official-mapping")
    .map(queueEntry);
  const count = (analysis: PlacementCandidate["analysis"]): number =>
    placementCandidates.filter((entry) => entry.analysis === analysis).length;

  return {
    schemaVersion: 1,
    generatedAt: "2026-09-28",
    sourcePolicy: SOURCE_POLICY,
    sources: coverage.sources,
    methodology: [
      "Every catalog entry already classified as placement-profile-required is processed in this run.",
      "Hand-accessory candidates require a unique official LDraw mapping and a transitive full-cylinder primitive with radius 3.75-4.25 LDU and length at least 4 LDU.",
      "A unique geometric candidate receives a proposed transform, but is never enabled automatically because geometry alone does not prove intended connectivity.",
      "Entries without an official mapping or with several official mappings are queued for deterministic retry after locked catalog or official LDraw updates.",
    ],
    execution: {
      rebrickableApiUsed: false,
      mocFilesUsed: 0,
      automaticBuilderEnablements: 0,
    },
    summary: {
      placementProfileRequiredCount: placementCandidates.length,
      uniqueRadius4CandidateCount: count("unique-radius-4-cylinder-candidate"),
      multipleRadius4CandidateCount: count("multiple-radius-4-cylinder-candidates"),
      noRadius4CylinderDetectedCount: count("no-radius-4-cylinder-detected"),
      roleSpecificAssemblyProfileRequiredCount: count("role-specific-assembly-profile-required"),
      noOfficialMappingQueueCount: noOfficialMapping.length,
      ambiguousOfficialMappingQueueCount: ambiguousOfficialMapping.length,
    },
    placementCandidates,
    sourceQueue: {
      retryPolicy: "re-run-after-locked-catalog-or-official-ldraw-update",
      noOfficialMapping,
      ambiguousOfficialMapping,
    },
    limitations: [
      "The official LDraw geometry is not connection metadata and cannot by itself authorize builder compatibility.",
      "Direct triangle meshes and non-cylinder grip shapes are not detected by this conservative pass.",
      "The no-mapping queue cannot be resolved by additional local compute; it needs a later official mapping or an explicitly approved new source.",
      "No generated candidate changes the current builder-ready catalog.",
    ],
  };
}
