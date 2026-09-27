import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Box3, BufferGeometry, Group, Material, Mesh, Vector3 } from "three";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { ldrawFitReviewSchema } from "../src/contracts/ldraw-fit-review.js";

const MAPPING_PATH = resolve("data/curated/ldraw-catalog-mappings.json");
const ASSORTMENT_PATH = resolve("data/curated/ff03-test-assortment.json");
const THUMBNAIL_INDEX_PATH = resolve("data/generated/ldraw-catalog-thumbnails.json");
const PROTOTYPE_MODEL_PATH = resolve("public/assets/ldraw/prototype/models/figforge-minifigure.ldr");
const MATERIALS_PATH = resolve("public/assets/ldraw/catalog/LDConfig.ldr");
const OUTPUT_PATH = resolve("data/generated/ldraw-fit-review.json");

if (typeof globalThis.ProgressEvent === "undefined") {
  Object.defineProperty(globalThis, "ProgressEvent", {
    value: class extends Event {
      readonly lengthComputable: boolean;
      readonly loaded: number;
      readonly total: number;

      constructor(type: string, init: ProgressEventInit = {}) {
        super(type);
        this.lengthComputable = init.lengthComputable ?? false;
        this.loaded = init.loaded ?? 0;
        this.total = init.total ?? 0;
      }
    },
  });
}

type CatalogRole = "head" | "headwear" | "torsoAssembly" | "handAccessory" | "legsAssembly";

type MappingEntry = {
  componentId: string;
  rebrickablePartNum: string;
  status: "verified" | "blocked";
  ldrawFile?: string;
  ldrawUpdate?: string;
  sourceUrl?: string;
  fileSha256?: string;
};

type MappingDocument = {
  updatedAt: string;
  sourcePolicy: string;
  entries: MappingEntry[];
};

type AssortmentComponent = {
  id: string;
  role: CatalogRole;
  attachmentProfile: { allowedSlots: string[] };
};

type AssortmentDocument = { components: AssortmentComponent[] };

type ThumbnailEntry = {
  componentId: string;
  status: "verified" | "blocked";
  modelUrl: string | null;
  modelSha256?: string;
};

type ThumbnailIndex = { entries: ThumbnailEntry[] };

type Placement = {
  mode: "prototype-family-origin" | "separate-unattached-inspection";
  status: "candidate-only" | "unavailable";
  referencePartFile: string | null;
  transformLdu: number[] | null;
  evidence: string;
};

const sha256 = (content: string | Buffer): string => createHash("sha256").update(content).digest("hex");
const roundedVector = (vector: Vector3): [number, number, number] => [
  Number(vector.x.toFixed(4)),
  Number(vector.y.toFixed(4)),
  Number(vector.z.toFixed(4)),
];

async function parsePackedModel(modelContent: string, materialsContent: string): Promise<Group> {
  const loader = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
  const materialsUrl = `data:text/plain;base64,${Buffer.from(materialsContent, "utf8").toString("base64")}`;
  await loader.preloadMaterials(materialsUrl);
  return new Promise<Group>((resolveModel, rejectModel) => {
    loader.parse(modelContent, resolveModel, rejectModel);
  });
}

function geometryEvidence(model: Group) {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  let meshCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    const mesh = object as Mesh<BufferGeometry, Material | Material[]>;
    meshCount += 1;
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    const faceVertexCount = index?.count ?? position.count;
    vertexCount += position.count;
    triangleCount += Math.floor(faceVertexCount / 3);
  });
  if (
    meshCount < 1 || triangleCount < 1 || vertexCount < 1 ||
    ![...roundedVector(size)].every((value) => Number.isFinite(value) && value > 0)
  ) {
    throw new Error("LDraw model has no valid measurable geometry");
  }
  return {
    loadStatus: "passed" as const,
    meshCount,
    triangleCount,
    vertexCount,
    boundsLdu: {
      min: roundedVector(bounds.min),
      max: roundedVector(bounds.max),
      size: roundedVector(size),
    },
  };
}

function prototypeTransforms(source: string): Map<string, number[]> {
  const transforms = new Map<string, number[]>();
  for (const line of source.split(/\r?\n/u)) {
    const tokens = line.trim().split(/\s+/u);
    if (tokens[0] !== "1" || tokens.length < 15) {
      continue;
    }
    const values = tokens.slice(2, 14).map(Number);
    if (values.some((value) => !Number.isFinite(value))) {
      continue;
    }
    const [x, y, z, a, b, c, d, e, f, g, h, i] = values as [
      number, number, number, number, number, number,
      number, number, number, number, number, number,
    ];
    const fileName = basename(tokens.slice(14).join(" ").replaceAll("\\", "/"));
    transforms.set(fileName, [a, d, g, 0, b, e, h, 0, c, f, i, 0, x, y, z, 1]);
  }
  return transforms;
}

function placementForRole(role: CatalogRole, transforms: ReadonlyMap<string, number[]>): Placement {
  const referenceByRole: Partial<Record<CatalogRole, string>> = {
    head: "3626cpcbe.dat",
    headwear: "25409.dat",
    torsoAssembly: "973c01.dat",
  };
  const referencePartFile = referenceByRole[role];
  if (!referencePartFile) {
    return {
      mode: "separate-unattached-inspection",
      status: "unavailable",
      referencePartFile: null,
      transformLdu: null,
      evidence: "The official accessory file has no part-specific hand transform; it remains separate until human grip review.",
    };
  }
  const transformLdu = transforms.get(referencePartFile);
  if (!transformLdu) {
    throw new Error(`Prototype transform is missing for ${referencePartFile}`);
  }
  return {
    mode: "prototype-family-origin",
    status: "candidate-only",
    referencePartFile,
    transformLdu,
    evidence: "Transform extracted from the local reference assembly; it is a review candidate, not physical fit proof.",
  };
}

function requiredChecks(role: CatalogRole): string[] {
  if (role === "head") {
    return [
      "Confirm seating and rotation on the physical reference torso neck stud.",
      "Confirm clearance with all three reviewed headwear candidates.",
      "Record reviewer, date and photo or measurement reference.",
    ];
  }
  if (role === "headwear") {
    return [
      "Confirm stud engagement, retention and removal on each reviewed physical head.",
      "Confirm no visible collision or unintended gap around the head.",
      "Record reviewer, date and photo or measurement reference.",
    ];
  }
  if (role === "handAccessory") {
    return [
      "Confirm grip diameter, insertion depth and rotation in both physical reference hands.",
      "Confirm the hand is not overstressed and the accessory remains retained.",
      "Record reviewer, date and photo or measurement reference.",
    ];
  }
  return [
    "Provide a complete torso sales-assembly model including arms and hands.",
    "Confirm neck, arm, hand and leg interfaces on physical reference parts.",
    "Record reviewer, date and photo or measurement reference.",
  ];
}

const [mappingRaw, assortmentRaw, thumbnailIndexRaw, prototypeRaw, materialsRaw] = await Promise.all([
  readFile(MAPPING_PATH),
  readFile(ASSORTMENT_PATH),
  readFile(THUMBNAIL_INDEX_PATH),
  readFile(PROTOTYPE_MODEL_PATH),
  readFile(MATERIALS_PATH),
]);

const mapping = JSON.parse(mappingRaw.toString("utf8")) as MappingDocument;
const assortment = JSON.parse(assortmentRaw.toString("utf8")) as AssortmentDocument;
const thumbnailIndex = JSON.parse(thumbnailIndexRaw.toString("utf8")) as ThumbnailIndex;
const components = new Map(assortment.components.map((component) => [component.id, component]));
const thumbnailEntries = new Map(thumbnailIndex.entries.map((entry) => [entry.componentId, entry]));
const transforms = prototypeTransforms(prototypeRaw.toString("utf8"));
const verifiedMappings = mapping.entries.filter((entry) => entry.status === "verified");

const entries = [];
for (const mappingEntry of verifiedMappings) {
  const component = components.get(mappingEntry.componentId);
  const thumbnailEntry = thumbnailEntries.get(mappingEntry.componentId);
  if (
    !component || component.role === "legsAssembly" || !thumbnailEntry || thumbnailEntry.status !== "verified" ||
    !mappingEntry.ldrawFile || !mappingEntry.ldrawUpdate || !mappingEntry.sourceUrl || !mappingEntry.fileSha256 ||
    !thumbnailEntry.modelUrl || !thumbnailEntry.modelSha256
  ) {
    throw new Error(`Incomplete verified LDraw fit input for ${mappingEntry.componentId}`);
  }
  const packedModelPath = resolve(`public${thumbnailEntry.modelUrl}`);
  const packedModel = await readFile(packedModelPath);
  if (sha256(packedModel) !== thumbnailEntry.modelSha256) {
    throw new Error(`Packed model hash mismatch for ${mappingEntry.componentId}`);
  }
  const model = await parsePackedModel(packedModel.toString("utf8"), materialsRaw.toString("utf8"));
  const incompleteAssembly = component.role === "torsoAssembly";
  entries.push({
    id: `fit-review:${mappingEntry.componentId}`,
    componentId: mappingEntry.componentId,
    rebrickablePartNum: mappingEntry.rebrickablePartNum,
    role: component.role,
    allowedSlots: component.attachmentProfile.allowedSlots,
    ldrawFile: mappingEntry.ldrawFile,
    ldrawUpdate: mappingEntry.ldrawUpdate,
    sourceUrl: mappingEntry.sourceUrl,
    sourceFileSha256: mappingEntry.fileSha256,
    packedModelUrl: thumbnailEntry.modelUrl,
    packedModelSha256: thumbnailEntry.modelSha256,
    geometry: geometryEvidence(model),
    placement: placementForRole(component.role, transforms),
    preflightStatus: incompleteAssembly ? "blocked-incomplete-assembly" : "ready-for-human-fit-review",
    compatibilityDecision: "blocked",
    humanReview: {
      status: incompleteAssembly ? "blocked" : "pending",
      requiredChecks: requiredChecks(component.role),
      reviewer: null,
      reviewedAt: null,
      evidenceReference: null,
      blocker: incompleteAssembly
        ? "Rebrickable 3814 maps to the torso shell 973.dat, not a complete torso assembly with arms and hands."
        : "Physical fit, retention and collision review has not been performed by a human reviewer.",
    },
  });
}

const heads = entries.filter(({ role }) => role === "head");
const headwear = entries.filter(({ role }) => role === "headwear");
const accessories = entries.filter(({ role }) => role === "handAccessory");
const torsos = entries.filter(({ role }) => role === "torsoAssembly");
const commonPendingChecks = [
  "Test with physical parts or an independently reliable fit reference.",
  "Record reviewer, date and evidence reference before changing compatibility status.",
];
const reviewCases = [
  ...heads.map((head) => ({
    id: `fit-case:${head.componentId}:reference-torso`,
    kind: "head-on-reference-torso" as const,
    componentIds: [head.componentId],
    slot: "head",
    referenceFiles: ["parts/973c01.dat"],
    status: "pending-human-fit-review" as const,
    requiredChecks: ["Check seating, rotation and neck-stud retention.", ...commonPendingChecks],
    result: null,
  })),
  ...headwear.flatMap((wear) => heads.map((head) => ({
    id: `fit-case:${wear.componentId}:${head.componentId}`,
    kind: "headwear-on-head" as const,
    componentIds: [wear.componentId, head.componentId],
    slot: "headwear",
    referenceFiles: [wear.ldrawFile, head.ldrawFile],
    status: "pending-human-fit-review" as const,
    requiredChecks: ["Check stud engagement, retention, collision and visible gap.", ...commonPendingChecks],
    result: null,
  }))),
  ...accessories.flatMap((accessory) => (["leftHandAccessory", "rightHandAccessory"] as const).map((slot) => ({
    id: `fit-case:${accessory.componentId}:${slot === "leftHandAccessory" ? "left" : "right"}`,
    kind: "accessory-in-reference-hand" as const,
    componentIds: [accessory.componentId],
    slot,
    referenceFiles: [accessory.ldrawFile, "parts/3820.dat"],
    status: "pending-human-fit-review" as const,
    requiredChecks: ["Check grip diameter, insertion depth, rotation, retention and hand stress.", ...commonPendingChecks],
    result: null,
  }))),
  ...torsos.map((torso) => ({
    id: `fit-case:${torso.componentId}:assembly-scope`,
    kind: "torso-assembly-scope" as const,
    componentIds: [torso.componentId],
    slot: "torsoAssembly",
    referenceFiles: [torso.ldrawFile, "parts/973c01.dat"],
    status: "blocked-incomplete-assembly" as const,
    requiredChecks: ["Obtain a complete mapped torso assembly before physical fit review."],
    result: null,
  })),
];

const document = ldrawFitReviewSchema.parse({
  schemaVersion: 1,
  ticket: "FF-05/FF-16-LDraw-preflight",
  generatedAt: mapping.updatedAt,
  sourcePolicy: mapping.sourcePolicy,
  prototypeOnly: true,
  publishable: false,
  sourceHashes: {
    mappingSha256: sha256(mappingRaw),
    thumbnailIndexSha256: sha256(thumbnailIndexRaw),
    prototypeModelSha256: sha256(prototypeRaw),
    materialsSha256: sha256(materialsRaw),
  },
  entries,
  reviewCases,
  summary: {
    entryCount: entries.length,
    readyForHumanReviewCount: entries.filter(({ preflightStatus }) => preflightStatus === "ready-for-human-fit-review").length,
    blockedEntryCount: entries.filter(({ preflightStatus }) => preflightStatus === "blocked-incomplete-assembly").length,
    pendingCaseCount: reviewCases.filter(({ status }) => status === "pending-human-fit-review").length,
    blockedCaseCount: reviewCases.filter(({ status }) => status === "blocked-incomplete-assembly").length,
    verifiedFitCount: 0,
  },
  openBlockers: [
    "No physical fit, retention or collision review has been recorded.",
    "Accessory files contain no verified part-specific hand transforms and remain separately displayed.",
    "Rebrickable 3814 maps only to the 973.dat torso shell, not a complete torso sales assembly.",
    "All FF-16 catalog compatibility decisions remain blocked until curated human evidence is reviewed.",
  ],
});

await writeFile(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ message: "LDraw fit-review preflight built", ...document.summary }));
