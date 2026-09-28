import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import sharp from "sharp";
import {
  BufferGeometry,
  Color,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { catalogPackageSchema, type CatalogPackagePart, type CatalogRole } from "../src/contracts/catalog-package.js";
import { browserReferencePath, embeddedLdrawName } from "./lib/ldraw-paths.js";
import { isCompleteStandardTorsoAssembly } from "./lib/ldraw-torso-assembly.js";

const root = process.cwd();
const libraryRoot = resolve(root, "data/incoming/ldraw-2608/extracted/ldraw");
const archivePath = resolve(root, "data/incoming/ldraw-2608/complete.zip");
const lockPath = resolve(root, "data/ldraw-source.lock.json");
const outputPath = resolve(root, "data/generated/ldraw-expanded-catalog.json");
const publicRoot = resolve(root, "public/assets/ldraw/official-2608");
const modelDirectory = resolve(publicRoot, "models");
const thumbnailDirectory = resolve(root, "public/assets/thumbnails/ldraw-expanded");
const CUSTOM_COLOR_CODE = 10_000;
const BUILD_ROLES = ["head", "headwear", "torsoAssembly"] as const satisfies readonly CatalogRole[];

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

type SourceLock = {
  schemaVersion: 1;
  sourcePolicy: string;
  library: string;
  release: string;
  archiveUrl: string;
  archiveSha256: string;
  license: string;
  licenseUrl: string;
  noticePath: string;
  contentPolicy: string;
};

type Candidate = {
  file: string;
  matchType: "exact-filename" | "explicit-keyword" | "rebrickable-print-parent";
  update: string;
  printParentPartNums?: string[];
};

type NormalizedPart = {
  partNum: string;
  colorVariants: Array<{ rgb: string; colorName: string }>;
  printParentPartNums: string[];
};

type Triangle = {
  points: [Vector3, Vector3, Vector3];
  color: Color;
  depth: number;
};

type LDrawMesh = Mesh<BufferGeometry, Material | Material[]>;

const sha256 = (content: string | Buffer): string => createHash("sha256").update(content).digest("hex");
const normalize = (value: string): string => value.trim().toLowerCase();
const packageFileByRole = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
} as const;

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

function resolveReference(reference: string, fileIndex: ReadonlyMap<string, string>): string {
  const normalized = reference.replaceAll("\\", "/").toLowerCase();
  const candidates = normalized.startsWith("s/")
    ? [`parts/${normalized}`]
    : normalized.startsWith("48/")
      ? [`p/${normalized}`]
      : [normalized, `parts/${normalized}`, `p/${normalized}`];
  for (const candidate of candidates) {
    const match = fileIndex.get(candidate);
    if (match) return match;
  }
  throw new Error(`Missing official LDraw dependency: ${reference}`);
}

const sourceCache = new Map<string, string>();
async function sourceFor(path: string): Promise<string> {
  const cached = sourceCache.get(path);
  if (cached) return cached;
  const source = await readFile(resolve(libraryRoot, path), "utf8");
  sourceCache.set(path, source);
  return source;
}

async function dependencyClosure(topLevelPath: string, fileIndex: ReadonlyMap<string, string>): Promise<string[]> {
  const visited = new Set<string>();
  const pending = [topLevelPath];
  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) continue;
    visited.add(path);
    const source = await sourceFor(path);
    for (const line of source.split(/\r?\n/u)) {
      if (!line.startsWith("1 ")) continue;
      const reference = line.trim().split(/\s+/u).at(-1);
      if (reference) pending.push(resolveReference(reference, fileIndex));
    }
  }
  return [...visited].sort();
}

async function packedModel(
  ldrawFile: string,
  modelName: string,
  colorRgb: string,
  fileIndex: ReadonlyMap<string, string>,
): Promise<{ packed: string; dependencies: string[] }> {
  const dependencies = await dependencyClosure(ldrawFile, fileIndex);
  const sections = [
    `0 FILE ${modelName}.ldr`,
    "0 FigForge render input from official LDraw parts only",
    `0 !COLOUR FigForge_Catalog CODE ${CUSTOM_COLOR_CODE} VALUE #${colorRgb} EDGE #333333`,
    `1 ${CUSTOM_COLOR_CODE} 0 0 0 1 0 0 0 1 0 0 0 1 ${embeddedLdrawName(ldrawFile)}`,
  ];
  for (const dependency of dependencies) {
    sections.push(`0 FILE ${embeddedLdrawName(dependency)}`, (await sourceFor(dependency)).trimEnd());
  }
  return { packed: `${sections.join("\n")}\n`, dependencies };
}

async function parsePackedModel(packed: string, materials: string): Promise<Group> {
  const loader = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
  await loader.preloadMaterials(`data:text/plain;base64,${Buffer.from(materials).toString("base64")}`);
  return new Promise<Group>((resolveModel, rejectModel) => {
    const timeout = setTimeout(() => rejectModel(new Error("LDraw parser timed out")), 2_000);
    loader.parse(
      packed,
      (model) => {
        clearTimeout(timeout);
        resolveModel(model);
      },
      (error) => {
        clearTimeout(timeout);
        rejectModel(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function materialFor(mesh: LDrawMesh, materialIndex: number): Material {
  const material = Array.isArray(mesh.material) ? (mesh.material[materialIndex] ?? mesh.material[0]) : mesh.material;
  if (!material) throw new Error("LDraw mesh has no material");
  return material;
}

function trianglesFromModel(model: Group): Triangle[] {
  const triangles: Triangle[] = [];
  const xAxis = new Vector3(1, 0, 0);
  const yAxis = new Vector3(0, 1, 0);
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object as LDrawMesh;
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    const count = index?.count ?? position.count;
    const groups = mesh.geometry.groups.length > 0 ? mesh.geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const group of groups) {
      const material = materialFor(mesh, group.materialIndex ?? 0);
      const color = material instanceof MeshStandardMaterial ? material.color.clone() : new Color(0x777777);
      const end = Math.min(group.start + group.count, count);
      for (let offset = group.start; offset + 2 < end; offset += 3) {
        const points = [offset, offset + 1, offset + 2].map((positionIndex) => {
          const vertexIndex = index ? index.getX(positionIndex) : positionIndex;
          return new Vector3().fromBufferAttribute(position, vertexIndex).applyMatrix4(mesh.matrixWorld)
            .applyAxisAngle(xAxis, Math.PI).applyAxisAngle(yAxis, 0.58).applyAxisAngle(xAxis, -0.28);
        }) as [Vector3, Vector3, Vector3];
        if (points.every((point) => Number.isFinite(point.x + point.y + point.z))) {
          triangles.push({ points, color, depth: (points[0].z + points[1].z + points[2].z) / 3 });
        }
      }
    }
  });
  return triangles.sort((left, right) => left.depth - right.depth);
}

function shadedHex(color: Color, points: [Vector3, Vector3, Vector3]): string {
  const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
  const intensity = 0.7 + 0.3 * Math.abs(normal.dot(new Vector3(-0.35, 0.55, 1).normalize()));
  const shaded = color.clone();
  shaded.r = Math.min(1, shaded.r * intensity);
  shaded.g = Math.min(1, shaded.g * intensity);
  shaded.b = Math.min(1, shaded.b * intensity);
  return `#${shaded.getHexString()}`;
}

function renderSvg(model: Group): string {
  const triangles = trianglesFromModel(model);
  if (triangles.length === 0) throw new Error("No renderable LDraw faces");
  const points = triangles.flatMap(({ points: trianglePoints }) => trianglePoints);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => -y));
  const maxY = Math.max(...points.map(({ y }) => -y));
  const scale = Math.min(184 / Math.max(0.001, maxX - minX), 172 / Math.max(0.001, maxY - minY));
  const offsetX = 128 - ((minX + maxX) / 2) * scale;
  const offsetY = 116 - ((minY + maxY) / 2) * scale;
  const polygons = triangles.map(({ color, points: trianglePoints }) => {
    const coordinates = trianglePoints.map(({ x, y }) => `${(x * scale + offsetX).toFixed(1)},${(-y * scale + offsetY).toFixed(1)}`).join(" ");
    return `<polygon points="${coordinates}" fill="${shadedHex(color, trianglePoints)}"/>`;
  });
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    '<rect width="256" height="256" rx="24" fill="#f5f6f4"/>',
    '<rect x="16" y="16" width="224" height="224" rx="18" fill="#fff" stroke="#dde3de" stroke-width="2"/>',
    '<ellipse cx="128" cy="211" rx="68" ry="11" fill="#d9ddd8" opacity=".62"/>',
    ...polygons,
    '<rect x="25" y="222" width="122" height="18" rx="9" fill="#eff6f1"/>',
    '<text x="34" y="235" fill="#26735a" font-family="Arial,sans-serif" font-size="9" font-weight="700">OFFIZIELLES LDRAW</text>',
    "</svg>",
  ].join("\n");
}

const lock = JSON.parse(await readFile(lockPath, "utf8")) as SourceLock;
const archive = await readFile(archivePath);
if (sha256(archive) !== lock.archiveSha256) throw new Error("LDraw archive hash does not match data/ldraw-source.lock.json");
if (!lock.contentPolicy.includes("MOC files are excluded")) throw new Error("LDraw source lock must explicitly exclude MOC files");

const allLibraryFiles = (await collectFiles(libraryRoot))
  .map((path) => relative(libraryRoot, path).split(sep).join("/"))
  .filter((path) => path.toLowerCase().endsWith(".dat"));
const fileIndex = new Map(allLibraryFiles.map((path) => [path.toLowerCase(), path]));
const topLevelParts = (await readdir(resolve(libraryRoot, "parts"), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".dat"))
  .map((entry) => `parts/${entry.name}`)
  .sort();

const candidateIndex = new Map<string, Candidate[]>();
const addCandidate = (partNum: string, candidate: Candidate): void => {
  const key = normalize(partNum);
  const values = candidateIndex.get(key) ?? [];
  if (!values.some(({ file, matchType }) => file === candidate.file && matchType === candidate.matchType)) values.push(candidate);
  candidateIndex.set(key, values);
};
for (const file of topLevelParts) {
  const source = await sourceFor(file);
  const update = /0\s+!LDRAW_ORG\s+(?:Part|Shortcut)[^\r\n]*?\s+UPDATE\s+([0-9]{4}-[0-9]{2})/iu.exec(source)?.[1] ?? lock.release;
  addCandidate(basename(file, ".dat"), { file, matchType: "exact-filename", update });
  for (const line of source.split(/\r?\n/u)) {
    if (!/^0\s+!KEYWORDS\b/iu.test(line)) continue;
    const match = /(?:^|,\s*)Rebrickable\s+([^,\s]+)/iu.exec(line);
    if (match?.[1]) addCandidate(match[1], { file, matchType: "explicit-keyword", update });
  }
}

const normalizedCatalog = JSON.parse(await readFile(resolve(root, "data/generated/catalog-normalized.json"), "utf8")) as {
  parts: NormalizedPart[];
};
const normalizedByPartNum = new Map(normalizedCatalog.parts.map((part) => [normalize(part.partNum), part]));
const curatedAssortment = JSON.parse(await readFile(resolve(root, "data/curated/ff03-test-assortment.json"), "utf8")) as {
  components: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
};
const curatedKeys = new Set(curatedAssortment.components.map(({ role, rebrickablePartNum }) => `${role}:${normalize(rebrickablePartNum)}`));
const digitalConnectivity = JSON.parse(await readFile(resolve(root, "data/generated/ldraw-digital-connectivity.json"), "utf8")) as {
  entries: Array<{ role: CatalogRole; status: string; placementTransformLdu: number[] | null }>;
  familyProfiles: Array<{ role: CatalogRole; placementTransformLdu: number[] }>;
};
const placementByRole = new Map(BUILD_ROLES.map((role) => {
  const reference = digitalConnectivity.familyProfiles.find((profile) => profile.role === role)
    ?? digitalConnectivity.entries.find((entry) => entry.role === role && entry.status === "digitally-supported");
  if (!reference?.placementTransformLdu) throw new Error(`Missing ${role} family-origin transform`);
  return [role, reference.placementTransformLdu] as const;
}));

const supportsRoleAssembly = async (role: (typeof BUILD_ROLES)[number], candidate: Candidate): Promise<boolean> =>
  role !== "torsoAssembly" || isCompleteStandardTorsoAssembly(await sourceFor(candidate.file));

const matchedParts: Array<{
  part: CatalogPackagePart & { role: (typeof BUILD_ROLES)[number] };
  candidate: Candidate;
}> = [];
let ambiguousMappingsExcluded = 0;
for (const role of BUILD_ROLES) {
  const raw: unknown = JSON.parse(await readFile(resolve(root, "data/generated/catalog-packages", packageFileByRole[role]), "utf8"));
  const catalogPackage = catalogPackageSchema.parse(raw);
  for (const part of catalogPackage.parts) {
    if (curatedKeys.has(`${role}:${normalize(part.rebrickablePartNum)}`)) continue;
    const directCandidates = [];
    for (const candidate of candidateIndex.get(normalize(part.rebrickablePartNum)) ?? []) {
      if (await supportsRoleAssembly(role, candidate)) directCandidates.push(candidate);
    }
    const directFiles = [...new Set(directCandidates.map(({ file }) => file))];
    if (directFiles.length > 1) {
      ambiguousMappingsExcluded += 1;
      continue;
    }
    const direct = directCandidates.find(({ matchType }) => matchType === "exact-filename") ?? directCandidates[0];
    if (directFiles.length === 1 && direct) {
      matchedParts.push({
        part: { ...part, role },
        candidate: direct,
      });
      continue;
    }

    const normalizedPart = normalizedByPartNum.get(normalize(part.rebrickablePartNum));
    const parentCandidates = [];
    for (const parentPartNum of normalizedPart?.printParentPartNums ?? []) {
      for (const candidate of candidateIndex.get(normalize(parentPartNum)) ?? []) {
        if (await supportsRoleAssembly(role, candidate)) parentCandidates.push({ candidate, parentPartNum });
      }
    }
    const parentFiles = [...new Set(parentCandidates.map(({ candidate }) => candidate.file))];
    if (parentFiles.length > 1) {
      ambiguousMappingsExcluded += 1;
      continue;
    }
    const parentMatch = parentCandidates.find(({ candidate }) => candidate.matchType === "exact-filename") ?? parentCandidates[0];
    if (parentFiles.length === 1 && parentMatch) matchedParts.push({
      part: { ...part, role },
      candidate: {
        ...parentMatch.candidate,
        matchType: "rebrickable-print-parent",
        printParentPartNums: [...new Set(parentCandidates
          .filter(({ candidate }) => candidate.file === parentMatch.candidate.file)
          .map(({ parentPartNum }) => parentPartNum))].sort(),
      },
    });
  }
}

await rm(publicRoot, { force: true, recursive: true });
await rm(thumbnailDirectory, { force: true, recursive: true });
await mkdir(modelDirectory, { recursive: true });
await mkdir(thumbnailDirectory, { recursive: true });
await cp(resolve(libraryRoot, "LDConfig.ldr"), resolve(publicRoot, "LDConfig.ldr"));
await cp(resolve(libraryRoot, "CAlicense.txt"), resolve(root, "public/licenses/LDraw-CAlicense-2.0.txt"));
await cp(resolve(libraryRoot, "CAlicense4.txt"), resolve(root, "public/licenses/LDraw-CAlicense-4.0.txt"));
await chmod(resolve(root, "public/licenses/LDraw-CAlicense-2.0.txt"), 0o644);
await chmod(resolve(root, "public/licenses/LDraw-CAlicense-4.0.txt"), 0o644);
const materials = await readFile(resolve(libraryRoot, "LDConfig.ldr"), "utf8");
const copiedDependencies = new Set<string>();
const outputEntries: Array<Record<string, unknown>> = [];
const skippedEntries: Array<{ rebrickablePartNum: string; ldrawFile: string; reason: string }> = [];
type GeneratedAsset = {
  modelUrl: string;
  modelSha256: string;
  thumbnailUrl: string;
  thumbnailSha256: string;
  thumbnailBytes: number;
};
const fallbackAssetCache = new Map<string, GeneratedAsset>();
const fallbackFailureCache = new Map<string, string>();

for (const [index, { part, candidate }] of matchedParts.entries()) {
  const normalizedPart = normalizedByPartNum.get(normalize(part.rebrickablePartNum));
  const colorVariant = normalizedPart?.colorVariants[0];
  const colorRgb = colorVariant?.rgb && /^[A-F0-9]{6}$/u.test(colorVariant.rgb) ? colorVariant.rgb : "A0A8A4";
  const isPrintParentFallback = candidate.matchType === "rebrickable-print-parent";
  const assetRole = part.role === "torsoAssembly" ? "torso" : part.role;
  const modelName = isPrintParentFallback
    ? `${assetRole}-geometry-${basename(candidate.file, ".dat")}-${colorRgb.toLowerCase()}`.replaceAll(/[^a-z0-9._-]/gu, "-")
    : `${assetRole}-${normalize(part.rebrickablePartNum).replaceAll(/[^a-z0-9._-]/gu, "-")}`;
  const assetKey = isPrintParentFallback ? `${part.role}:${candidate.file}:${colorRgb}` : `${part.role}:${part.rebrickablePartNum}`;
  const cachedFailure = fallbackFailureCache.get(assetKey);
  if (cachedFailure) {
    skippedEntries.push({
      rebrickablePartNum: part.rebrickablePartNum,
      ldrawFile: candidate.file,
      reason: cachedFailure,
    });
    continue;
  }
  let asset = fallbackAssetCache.get(assetKey);
  if (!asset) {
    const { packed, dependencies } = await packedModel(candidate.file, modelName, colorRgb, fileIndex);
    let thumbnail: Buffer;
    try {
      const model = await parsePackedModel(packed, materials);
      thumbnail = await sharp(Buffer.from(renderSvg(model))).webp({ quality: 82, effort: 4 }).toBuffer();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown render failure";
      if (isPrintParentFallback) fallbackFailureCache.set(assetKey, reason);
      skippedEntries.push({
        rebrickablePartNum: part.rebrickablePartNum,
        ldrawFile: candidate.file,
        reason,
      });
      continue;
    }
    const wrapper = [
      `0 ${isPrintParentFallback ? `Unprinted parent geometry for ${candidate.printParentPartNums?.join(", ")}` : part.name}`,
      `0 Name: ${modelName}.ldr`,
      `0 // License: ${lock.license}; see referenced official part and ${basename(lock.noticePath)}`,
      `0 !COLOUR FigForge_Catalog CODE ${CUSTOM_COLOR_CODE} VALUE #${colorRgb} EDGE #333333`,
      `1 ${CUSTOM_COLOR_CODE} 0 0 0 1 0 0 0 1 0 0 0 1 ${basename(candidate.file)}`,
      "",
    ].join("\n");
    const modelUrl = `/assets/ldraw/official-2608/models/${modelName}.ldr`;
    const thumbnailUrl = `/assets/thumbnails/ldraw-expanded/${modelName}.webp`;
    await writeFile(resolve(root, `public${modelUrl}`), wrapper, "utf8");
    await writeFile(resolve(root, `public${thumbnailUrl}`), thumbnail);
    for (const dependency of dependencies) {
      if (copiedDependencies.has(dependency)) continue;
      const destination = resolve(publicRoot, dependency);
      await mkdir(dirname(destination), { recursive: true });
      await cp(resolve(libraryRoot, dependency), destination);
      copiedDependencies.add(dependency);
    }
    asset = {
      modelUrl,
      modelSha256: sha256(wrapper),
      thumbnailUrl,
      thumbnailSha256: sha256(thumbnail),
      thumbnailBytes: thumbnail.byteLength,
    };
    if (isPrintParentFallback) fallbackAssetCache.set(assetKey, asset);
  }
  outputEntries.push({
    componentId: `catalog:${part.role}:${normalize(part.rebrickablePartNum)}`,
    role: part.role,
    rebrickablePartNum: part.rebrickablePartNum,
    name: part.name,
    rebrickableCategoryId: part.rebrickableCategoryId,
    rebrickableCategoryName: part.rebrickableCategoryName,
    material: part.material,
    colorNames: part.colorNames,
    previewColorName: colorVariant?.colorName ?? null,
    previewColorRgb: colorRgb,
    previewColorEvidence: colorVariant ? "rebrickable-elements-first" : "neutral-fallback",
    status: "verified",
    ldrawFile: candidate.file,
    ldrawUpdate: candidate.update,
    mappingEvidence: candidate.matchType,
    geometryFallback: isPrintParentFallback ? {
      kind: "unprinted-print-parent",
      parentPartNums: candidate.printParentPartNums,
    } : null,
    modelUrl: asset.modelUrl,
    modelSha256: asset.modelSha256,
    thumbnailUrl: asset.thumbnailUrl,
    thumbnailSha256: asset.thumbnailSha256,
    thumbnailBytes: asset.thumbnailBytes,
    placementMode: "prototype-family-origin",
    placementTransformLdu: placementByRole.get(part.role),
  });
  if ((index + 1) % 50 === 0 || index + 1 === matchedParts.length) {
    console.log(`Generated ${index + 1}/${matchedParts.length}`);
  }
}

const browserFileMap = new Map<string, string>();
for (const path of [...copiedDependencies].sort()) {
  const reference = path.startsWith("parts/") ? path.slice("parts/".length) : path.slice("p/".length);
  if (browserFileMap.has(reference)) {
    throw new Error(`Ambiguous browser LDraw reference: ${reference}`);
  }
  browserFileMap.set(reference, browserReferencePath(path));
}
await writeFile(
  resolve(publicRoot, "file-map.json"),
  `${JSON.stringify(Object.fromEntries(browserFileMap))}\n`,
  "utf8",
);

const output = {
  schemaVersion: 1,
  generatedAt: "2026-09-28",
  sourcePolicy: lock.sourcePolicy,
  source: {
    library: lock.library,
    release: lock.release,
    archiveUrl: lock.archiveUrl,
    archiveSha256: lock.archiveSha256,
    license: lock.license,
    noticePath: lock.noticePath,
  },
  entries: outputEntries,
  summary: {
    catalogPartCount: 20_202,
    digitallySupportedCount: outputEntries.length,
    headCount: outputEntries.filter(({ role }) => role === "head").length,
    headwearCount: outputEntries.filter(({ role }) => role === "headwear").length,
    torsoAssemblyCount: outputEntries.filter(({ role }) => role === "torsoAssembly").length,
    directMappingCount: outputEntries.filter(({ mappingEvidence }) => mappingEvidence !== "rebrickable-print-parent").length,
    printParentGeometryFallbackCount: outputEntries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-print-parent").length,
    generatedAssetCount: outputEntries.length - outputEntries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-print-parent").length + fallbackAssetCache.size,
    sharedOfficialFileCount: copiedDependencies.size,
    ambiguousMappingsExcluded,
    renderFailuresExcluded: skippedEntries.length,
    mocFilesUsed: 0,
  },
  renderFailures: skippedEntries,
  limitations: [
    "Direct mappings require an unambiguous exact filename or explicit LDraw !KEYWORDS Rebrickable identifier.",
    "Print variants may reuse the unique official unprinted parent geometry declared by the locked Rebrickable part_relationships.csv; their printed decoration is not rendered.",
    "Family-origin placement is a digital convention, not a physical clutch-force guarantee.",
    "The first catalog-backed color is used for preview; parts without color evidence use neutral gray.",
  ],
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ message: "expanded official LDraw catalog built", ...output.summary }));
