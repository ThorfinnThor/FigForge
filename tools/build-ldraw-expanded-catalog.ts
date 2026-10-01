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
import { OFFICIAL_LDRAW_PUBLIC_PATH } from "../src/scene/ldraw-release.js";
import { deriveDualMouldLegReference, isCompleteMinifigLowerBody } from "./lib/ldraw-legs-assembly.js";
import { rebrickableKeywordIds } from "./lib/ldraw-keywords.js";
import { browserReferencePath, embeddedLdrawName } from "./lib/ldraw-paths.js";
import { isCompleteStandardTorsoAssembly, isCompleteTorsoAssembly } from "./lib/ldraw-torso-assembly.js";
import {
  confirmAssemblyColors,
  deriveAssemblyColorCodeTable,
  deriveReferenceAssembly,
  parseAssemblyPartNum,
  type ReferenceAssembly,
} from "./lib/rebrickable-assembly-colors.js";
import {
  digitalAccessoryLimits,
  selectUnambiguousDigitalAccessoryGrip,
  validateDigitalAccessoryPlacement,
  type DigitalAccessoryGripEvaluation,
  type DigitalAccessoryValidation,
} from "./lib/ldraw-accessory-clearance.js";
import {
  collectCylinderEvidence,
  proposedHandPlacements,
  proposedSlidingHandPlacements,
  type CylinderEvidence,
  type HandPlacementCandidate,
} from "./lib/ldraw-placement-candidates.js";
import { collectVendoredLDCadHandGripEvidence } from "./lib/ldcad-shadow-connectivity.js";
import {
  ambiguousMappingKey,
  readAmbiguousMappingResolutions,
  selectedAmbiguousMappings,
} from "./lib/ldraw-ambiguous-mapping-resolutions.js";
import { resolveOfficialLDrawMappingFile } from "./lib/ldraw-official-mapping.js";
import { writeLDrawRuntimePackages } from "./lib/ldraw-runtime-packages.js";

const root = process.cwd();
const libraryRoot = resolve(root, "data/incoming/ldraw-official/extracted/ldraw");
const archivePath = resolve(root, "data/incoming/ldraw-official/complete.zip");
const lockPath = resolve(root, "data/ldraw-source.lock.json");
const outputPath = resolve(root, "data/generated/ldraw-expanded-catalog.json");
const compositionsPath = resolve(root, "data/generated/ldraw-assembly-compositions.json");
const ldcadShadowRoot = resolve(root, "data/vendor/ldcad-shadow");
const publicRoot = resolve(root, `public${OFFICIAL_LDRAW_PUBLIC_PATH}`);
const modelDirectory = resolve(publicRoot, "models");
const thumbnailDirectory = resolve(root, "public/assets/thumbnails/ldraw-expanded");
const CUSTOM_COLOR_CODE = 10_000;
const ASSEMBLY_COLOR_CODES = {
  catalog: CUSTOM_COLOR_CODE,
  arms: 10_001,
  hands: 10_002,
  legs: 10_001,
  boots: 10_002,
  leftLeg: 10_001,
  rightLeg: 10_002,
} as const;
const FAMILY_BUILD_ROLES = ["head", "headwear", "torsoAssembly", "legsAssembly"] as const satisfies readonly CatalogRole[];
const BUILD_ROLES = [...FAMILY_BUILD_ROLES, "handAccessory"] as const satisfies readonly CatalogRole[];

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
  matchType:
    | "curated-official-metadata"
    | "exact-filename"
    | "explicit-keyword"
    | "official-assembly-wrapper"
    | "rebrickable-print-parent"
    | "rebrickable-assembly-code";
  update: string;
  printParentPartNums?: string[];
  wrappedPartFile?: string;
};

type NormalizedPart = {
  partNum: string;
  name: string;
  colorVariants: Array<{ rgb: string; colorName: string }>;
  printParentPartNums: string[];
};

type AssemblyColorRole = keyof typeof ASSEMBLY_COLOR_CODES;

type AssemblyComposition = {
  kind: "rebrickable-color-coded-assembly";
  printRendered: boolean;
  referenceShortcutCount: number;
  agreeingReferenceShortcutCount: number;
  components: Array<{
    file: string;
    colorRole: AssemblyColorRole;
    colorName: string | null;
    colorRgb: string | null;
    transform: number[];
  }>;
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
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
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

const identityTransform = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];

type ModelLine = { colorCode: number; transform: number[]; file: string };
type ModelColor = { name: string; code: number; rgb: string };

const colorDefinition = ({ name, code, rgb }: ModelColor): string =>
  `0 !COLOUR ${name} CODE ${code} VALUE #${rgb} EDGE #333333`;

async function packedModel(
  lines: readonly ModelLine[],
  colors: readonly ModelColor[],
  modelName: string,
  fileIndex: ReadonlyMap<string, string>,
): Promise<{ packed: string; dependencies: string[] }> {
  const dependencies = [...new Set((await Promise.all(lines.map(({ file }) => dependencyClosure(file, fileIndex)))).flat())].sort();
  const sections = [
    `0 FILE ${modelName}.ldr`,
    "0 FigForge render input from official LDraw parts only",
    ...colors.map(colorDefinition),
    ...lines.map(({ colorCode, transform, file }) => `1 ${colorCode} ${transform.join(" ")} ${embeddedLdrawName(file)}`),
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
const ldrawUpdateFromSource = (source: string): string =>
  /0\s+!LDRAW_ORG\s+(?:Part|Shortcut)[^\r\n]*?\s+UPDATE\s+([0-9]{4}-[0-9]{2})/iu.exec(source)?.[1] ?? lock.release;
const addCandidate = (partNum: string, candidate: Candidate): void => {
  const key = normalize(partNum);
  const values = candidateIndex.get(key) ?? [];
  if (!values.some(({ file, matchType }) => file === candidate.file && matchType === candidate.matchType)) values.push(candidate);
  candidateIndex.set(key, values);
};
for (const file of topLevelParts) {
  const source = await sourceFor(file);
  const update = ldrawUpdateFromSource(source);
  addCandidate(basename(file, ".dat"), { file, matchType: "exact-filename", update });
  for (const line of source.split(/\r?\n/u)) {
    for (const partNum of rebrickableKeywordIds(line)) addCandidate(partNum, { file, matchType: "explicit-keyword", update });
  }
}
const topLevelSourceByFile = new Map(topLevelParts.map((file) => [file, sourceCache.get(file)!]));
const ambiguousMappingResolutions = await readAmbiguousMappingResolutions(root);
const ambiguousMappingSelections = selectedAmbiguousMappings(ambiguousMappingResolutions);
const resolvedCandidatesFor = (partNum: string, role: CatalogRole): Candidate[] => {
  const candidates = candidateIndex.get(normalize(partNum)) ?? [];
  const curated = ambiguousMappingSelections.get(ambiguousMappingKey(role, partNum));
  if (curated) {
    const selected = candidates.find(({ file }) => file === curated.selectedFile);
    if (!selected) throw new Error(`Curated official mapping is not a candidate: ${role}:${partNum}`);
    return [{ ...selected, matchType: "curated-official-metadata" }];
  }
  const resolvedFile = resolveOfficialLDrawMappingFile(candidates, topLevelSourceByFile, fileIndex);
  if (!resolvedFile) return candidates;
  const existing = candidates.find(({ file, matchType }) => file === resolvedFile && matchType === "explicit-keyword")
    ?? candidates.find(({ file }) => file === resolvedFile);
  if (existing) return [existing];
  const explicit = candidates.find(({ matchType }) => matchType === "explicit-keyword");
  const source = topLevelSourceByFile.get(resolvedFile);
  return explicit && source
    ? [{ ...explicit, file: resolvedFile, update: ldrawUpdateFromSource(source) }]
    : [];
};

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
const placementByRole = new Map(FAMILY_BUILD_ROLES.map((role) => {
  const reference = digitalConnectivity.familyProfiles.find((profile) => profile.role === role)
    ?? digitalConnectivity.entries.find((entry) => entry.role === role && entry.status === "digitally-supported");
  if (!reference?.placementTransformLdu) throw new Error(`Missing ${role} family-origin transform`);
  return [role, reference.placementTransformLdu] as const;
}));

// Rebrickable colour codes are only trusted when every unprinted base assembly names the same catalog colour.
const colorRgbsByName = new Map<string, Set<string>>();
for (const part of normalizedCatalog.parts) {
  for (const { colorName, rgb } of part.colorVariants) {
    colorRgbsByName.set(colorName, (colorRgbsByName.get(colorName) ?? new Set()).add(rgb));
  }
}
const colorRgbByName = new Map([...colorRgbsByName]
  .filter(([, rgbs]) => rgbs.size === 1 && /^[A-F0-9]{6}$/u.test([...rgbs][0]!))
  .map(([name, rgbs]) => [name, [...rgbs][0]!]));
const knownAssemblyColorNames = new Set(colorRgbByName.keys());
const assemblyColorCodes = deriveAssemblyColorCodeTable(
  normalizedCatalog.parts.filter(({ partNum }) => parseAssemblyPartNum(partNum)?.kind !== "splitLegs"),
  knownAssemblyColorNames,
);
const splitLegColorCodes = deriveAssemblyColorCodeTable(
  normalizedCatalog.parts.filter(({ partNum }) => parseAssemblyPartNum(partNum)?.kind === "splitLegs"),
  knownAssemblyColorNames,
);
const topLevelSources = await Promise.all(topLevelParts.map(sourceFor));
const referenceAssemblies = {
  torso: deriveReferenceAssembly(
    topLevelSources.filter(isCompleteStandardTorsoAssembly),
    ["973", "3818", "3819", "3820"],
  ),
  legs: deriveReferenceAssembly(
    topLevelSources.filter((source) => /^0\s+!LDRAW_ORG\s+Shortcut\b/mu.test(source) && isCompleteMinifigLowerBody(source)),
    ["3815b", "3816c", "3817c"],
  ),
  dualMouldLegs: deriveDualMouldLegReference(
    await sourceFor("parts/21019b.dat"),
    await sourceFor("parts/20460b.dat"),
    await sourceFor("parts/20461b.dat"),
  ),
} satisfies Record<"torso" | "legs" | "dualMouldLegs", ReferenceAssembly>;
const plainComponentFiles: Record<string, string> = {
  "3818": "parts/3818.dat",
  "3819": "parts/3819.dat",
  "3820": "parts/3820.dat",
  "3815b": "parts/3815b.dat",
  "3816c": "parts/3816c.dat",
  "3817c": "parts/3817c.dat",
  "20460bs01": "parts/s/20460bs01.dat",
  "20460bs02": "parts/s/20460bs02.dat",
};
// These Rebrickable standard colour assemblies collide with obsolete LDraw aliases:
// 970c02 points to sitting legs and 970c36 to a wooden-leg assembly. Their catalog
// names still fully confirm the standard 970 colour code, so use the deterministic
// standard assembly instead of publishing the unrelated legacy geometry.
const obsoleteLDrawLegAliasCollisions = new Set(["970c02", "970c36"]);
for (const file of [...Object.values(plainComponentFiles), "parts/973.dat"]) {
  if (!fileIndex.has(file)) throw new Error(`Missing official assembly component: ${file}`);
}

const isTorsoPrintPart = async (file: string): Promise<boolean> => {
  if (!/^parts\/973p[a-z0-9]+\.dat$/iu.test(file)) return false;
  const source = await sourceFor(file);
  return /^0\s+!LDRAW_ORG\s+Part\b/mu.test(source) && /^0\s+Minifig Torso\b/u.test(source.trimStart());
};

const uniquePrintedLegComponents = async (
  files: string[],
): Promise<Map<"3815b" | "3816c" | "3817c", string> | null> => {
  const candidates = new Map<"3815b" | "3816c" | "3817c", string[]>();
  for (const file of files) {
    const description = (await sourceFor(file)).split(/\r?\n/u)[0] ?? "";
    const component = /^0 Minifig Hips\b/u.test(description)
      ? "3815b"
      : /^0 Minifig Leg Right\b/u.test(description)
        ? "3816c"
        : /^0 Minifig Leg Left\b/u.test(description) ? "3817c" : null;
    if (component) candidates.set(component, [...(candidates.get(component) ?? []), file]);
  }
  const right = candidates.get("3816c") ?? [];
  const left = candidates.get("3817c") ?? [];
  const hips = candidates.get("3815b") ?? [];
  if (right.length !== 1 || left.length !== 1 || hips.length > 1) return null;
  return new Map([
    ...(hips.length === 1 ? [["3815b", hips[0]!] as const] : []),
    ["3816c", right[0]!],
    ["3817c", left[0]!],
  ]);
};

// Builds a standard assembly from official parts when the Rebrickable number and name both state its colours.
const composeColorCodedAssembly = async (
  part: CatalogPackagePart,
  role: CatalogRole,
): Promise<{ candidate: Candidate; composition: AssemblyComposition } | null> => {
  const parsed = parseAssemblyPartNum(part.rebrickablePartNum);
  if (!parsed) return null;
  if ((role === "torsoAssembly") !== (parsed.kind === "torso") || (role === "legsAssembly") !== (parsed.kind !== "torso")) return null;
  const colors = confirmAssemblyColors(
    part.rebrickablePartNum,
    part.name,
    parsed.kind === "splitLegs" ? splitLegColorCodes : assemblyColorCodes,
  );
  if (!colors) return null;
  const officialFiles = [...new Set((candidateIndex.get(normalize(part.rebrickablePartNum)) ?? []).map(({ file }) => file))];
  const printedLegComponents = parsed.kind === "legs" && parsed.printed && !parsed.bootCode
    ? await uniquePrintedLegComponents(officialFiles)
    : null;
  const plainBodyFile = colors.kind === "torso" ? "parts/973.dat" : "parts/3815b.dat";
  let bodyFile: string;
  if (colors.kind === "torso" && parsed.printed && officialFiles.length === 1) {
    if (!(await isTorsoPrintPart(officialFiles[0]!))) return null;
    bodyFile = officialFiles[0]!;
  } else if (printedLegComponents) {
    bodyFile = printedLegComponents.get("3815b") ?? plainBodyFile;
  } else if ((parsed.kind === "legs" && parsed.bootCode) || parsed.kind === "splitLegs") {
    // Exact keyword matches for these numbers are the separate left/right leg files,
    // never a complete lower body. The official dual-mould shortcut is expanded below.
    bodyFile = plainBodyFile;
  } else {
    // Without any official file for this number, the plain body is used; a print is then marked as not rendered.
    if (officialFiles.length > 0 && !obsoleteLDrawLegAliasCollisions.has(part.rebrickablePartNum)) return null;
    bodyFile = plainBodyFile;
  }
  const printRendered = !parsed.printed || bodyFile !== plainBodyFile || Boolean(printedLegComponents);
  const colorVariants = normalizedByPartNum.get(normalize(part.rebrickablePartNum))?.colorVariants ?? [];
  const catalogRgbs = [...new Set(colorVariants
    .map(({ rgb }) => rgb)
    .filter((rgb) => /^[A-F0-9]{6}$/u.test(rgb)))];
  const uniqueBodyRgb = catalogRgbs.length === 1 ? catalogRgbs[0] : undefined;
  const firstBodyRgb = colorVariants[0]?.rgb;
  const hasLegacyBodyRgb = Boolean(firstBodyRgb && /^[A-F0-9]{6}$/u.test(firstBodyRgb));
  if (parsed.kind === "splitLegs" ? !uniqueBodyRgb : (!printRendered || (parsed.kind === "legs" && parsed.bootCode)) && !hasLegacyBodyRgb) return null;
  const colorFor = (component: string): { colorRole: AssemblyColorRole; colorName: string | null } => {
    if (colors.kind === "torso") {
      if (component === "3818" || component === "3819") return { colorRole: "arms", colorName: colors.armColorName };
      if (component === "3820") return { colorRole: "hands", colorName: colors.handColorName };
      return { colorRole: "catalog", colorName: null };
    }
    if (colors.kind === "splitLegs") {
      // Official LDraw 3817c is the left leg and 3816c is the right leg.
      if (component === "3817c") return { colorRole: "leftLeg", colorName: colors.leftLegColorName };
      if (component === "3816c") return { colorRole: "rightLeg", colorName: colors.rightLegColorName };
      return { colorRole: "catalog", colorName: null };
    }
    if (component === "3816c" || component === "3817c" || component === "20460bs01") {
      return { colorRole: "legs", colorName: colors.legColorName };
    }
    if (component === "20460bs02") return { colorRole: "boots", colorName: colors.bootColorName ?? null };
    return { colorRole: "catalog", colorName: null };
  };
  const reference = parsed.kind === "legs" && parsed.bootCode
    ? referenceAssemblies.dualMouldLegs
    : colors.kind === "torso" ? referenceAssemblies.torso : referenceAssemblies.legs;
  const components = reference.lines.map(({ component, transform }) => {
    const { colorRole, colorName } = colorFor(component);
    const file = printedLegComponents?.get(component as "3815b" | "3816c" | "3817c")
      ?? (component === "973" || component === "3815b" ? bodyFile : plainComponentFiles[component]);
    if (!file) throw new Error(`Missing assembly component file: ${component}`);
    return {
      file,
      colorRole,
      colorName,
      colorRgb: colorName ? colorRgbByName.get(colorName) ?? null : null,
      transform,
    };
  });
  if (components.some(({ colorName, colorRgb }) => colorName && !colorRgb)) return null;
  const bodySource = await sourceFor(bodyFile);
  const update = /0\s+!LDRAW_ORG\s+(?:Part|Shortcut)[^\r\n]*?\s+UPDATE\s+([0-9]{4}-[0-9]{2})/iu.exec(bodySource)?.[1] ?? lock.release;
  return {
    candidate: { file: bodyFile, matchType: "rebrickable-assembly-code", update },
    composition: {
      kind: "rebrickable-color-coded-assembly",
      printRendered,
      referenceShortcutCount: reference.shortcutCount,
      agreeingReferenceShortcutCount: reference.agreeingShortcutCount,
      components,
    },
  };
};

const supportsRoleAssembly = async (role: CatalogRole, candidate: Candidate): Promise<boolean> => {
  if (role === "torsoAssembly") return isCompleteTorsoAssembly(await sourceFor(candidate.file));
  if (role === "legsAssembly") return isCompleteMinifigLowerBody(await sourceFor(candidate.file));
  return true;
};

const roleAssemblyWrappersByComponent = new Map<string, Candidate[]>();
for (const wrapperFile of topLevelParts) {
  const wrapperSource = await sourceFor(wrapperFile);
  for (const role of ["torsoAssembly", "legsAssembly"] as const) {
    const wrapper = { file: wrapperFile, matchType: "official-assembly-wrapper", update: ldrawUpdateFromSource(wrapperSource) } as const;
    if (!(await supportsRoleAssembly(role, wrapper))) continue;
    for (const line of wrapperSource.split(/\r?\n/u)) {
      if (!line.startsWith("1 ")) continue;
      const reference = line.trim().split(/\s+/u).at(-1);
      if (!reference) continue;
      let componentFile: string;
      try {
        componentFile = resolveReference(reference, fileIndex);
      } catch {
        continue;
      }
      if (!topLevelSourceByFile.has(componentFile)) continue;
      const key = `${role}:${componentFile.toLowerCase()}`;
      const candidates = roleAssemblyWrappersByComponent.get(key) ?? [];
      if (!candidates.some(({ file }) => file === wrapperFile)) {
        candidates.push({ ...wrapper, wrappedPartFile: componentFile });
        roleAssemblyWrappersByComponent.set(key, candidates);
      }
    }
  }
}

const uniqueOfficialAssemblyWrapper = (
  part: CatalogPackagePart,
  role: CatalogRole,
): { candidate: Candidate | null; candidateCount: number } => {
  const mapped = resolvedCandidatesFor(part.rebrickablePartNum, role);
  const mappedFiles = [...new Set(mapped.map(({ file }) => file))];
  if (mappedFiles.length !== 1) return { candidate: null, candidateCount: 0 };
  const mappedFile = mappedFiles[0]!;
  const eligible = role === "torsoAssembly"
    ? /^973p[a-z0-9]+$/iu.test(part.rebrickablePartNum) && /^parts\/973p[a-z0-9]+\.dat$/iu.test(mappedFile)
    : role === "legsAssembly"
      ? /^970c\d{2}(?:pat\d{2})?pr\d+$/iu.test(part.rebrickablePartNum) && /^Hips\b/u.test(part.name)
      : false;
  if (!eligible) return { candidate: null, candidateCount: 0 };
  const wrappers = roleAssemblyWrappersByComponent.get(`${role}:${mappedFile.toLowerCase()}`) ?? [];
  const wrapperFiles = [...new Set(wrappers.map(({ file }) => file))];
  return {
    candidate: wrapperFiles.length === 1 ? wrappers.find(({ file }) => file === wrapperFiles[0]) ?? null : null,
    candidateCount: wrapperFiles.length,
  };
};

const matchedParts: Array<{
  part: CatalogPackagePart;
  candidate: Candidate;
  placementMode: "prototype-family-origin" | "snap-connector";
  placementTransformLdu: number[];
  gripCandidates: Array<{
    evidence: CylinderEvidence;
    placementCandidates: HandPlacementCandidate[];
  }>;
  selectedGripEvidence: CylinderEvidence | null;
  selectedGripCandidateIndex: number | null;
  composition: AssemblyComposition | null;
}> = [];
let ambiguousMappingsExcluded = 0;
let accessoryGripCandidatesExcluded = 0;
let accessoryMultipleGripCandidatesEvaluated = 0;
let accessoryLdcadGripCandidatesDisambiguated = 0;
let accessoryLdcadPrintParentGripCandidatesEvaluated = 0;
let ambiguousAssemblyWrappersExcluded = 0;
for (const role of BUILD_ROLES) {
  const raw: unknown = JSON.parse(await readFile(resolve(root, "data/generated/catalog-packages", packageFileByRole[role]), "utf8"));
  const catalogPackage = catalogPackageSchema.parse(raw);
  for (const part of catalogPackage.parts) {
    if (curatedKeys.has(`${role}:${normalize(part.rebrickablePartNum)}`)) continue;
    const normalizedPart = normalizedByPartNum.get(normalize(part.rebrickablePartNum));
    let directCandidates = [];
    for (const candidate of candidateIndex.get(normalize(part.rebrickablePartNum)) ?? []) {
      if (await supportsRoleAssembly(role, candidate)) directCandidates.push(candidate);
    }
    let directFiles = [...new Set(directCandidates.map(({ file }) => file))];
    if (directFiles.length > 1) {
      // Preserve the stronger deterministic colour-assembly path before resolving
      // keyword collisions in complete shortcuts.
      if (role !== "handAccessory") {
        const composed = await composeColorCodedAssembly(part, role);
        if (composed) {
          const placementTransformLdu = placementByRole.get(role);
          if (!placementTransformLdu) throw new Error(`Missing ${role} placement transform`);
          matchedParts.push({
            part: { ...part, role },
            candidate: composed.candidate,
            placementMode: "prototype-family-origin",
            placementTransformLdu,
            gripCandidates: [],
            selectedGripEvidence: null,
            selectedGripCandidateIndex: null,
            composition: composed.composition,
          });
          continue;
        }
      }
      const resolved = resolvedCandidatesFor(part.rebrickablePartNum, role);
      const resolvedSupported = [];
      for (const candidate of resolved) {
        if (await supportsRoleAssembly(role, candidate)) resolvedSupported.push(candidate);
      }
      const resolvedFiles = [...new Set(resolvedSupported.map(({ file }) => file))];
      if (resolvedFiles.length === 1) {
        directCandidates = resolvedSupported;
        directFiles = resolvedFiles;
      } else {
        ambiguousMappingsExcluded += 1;
        continue;
      }
    }
    const direct = directCandidates.find(({ matchType }) => matchType === "exact-filename") ?? directCandidates[0];
    if (directFiles.length === 1 && direct) {
      if (role === "handAccessory") {
        const geometricConnectorCandidates = (await collectCylinderEvidence(libraryRoot, direct.file)).filter((evidence) =>
          evidence.radiusLdu >= 3.75 && evidence.radiusLdu <= 4.25 && evidence.lengthLdu >= 4
        );
        const geometricGripCandidates = geometricConnectorCandidates.filter((evidence) =>
          evidence.lengthLdu >= digitalAccessoryLimits.minimumGripLengthLdu
        );
        const ldcadGripCandidates = await collectVendoredLDCadHandGripEvidence(ldcadShadowRoot, direct.file);
        const printParentLdcadGripCandidates = [];
        for (const parentPartNum of normalizedPart?.printParentPartNums ?? []) {
          for (const parentCandidate of candidateIndex.get(normalize(parentPartNum)) ?? []) {
            printParentLdcadGripCandidates.push(
              ...await collectVendoredLDCadHandGripEvidence(ldcadShadowRoot, parentCandidate.file),
            );
          }
        }
        const uniquePrintParentLdcadGripCandidates = [...new Map(printParentLdcadGripCandidates
          .map((evidence) => [evidence.primitive, evidence])).values()];
        const inheritedLdcadGripCandidates = ldcadGripCandidates.length === 0
          && uniquePrintParentLdcadGripCandidates.length === 1
          ? uniquePrintParentLdcadGripCandidates
          : [];
        const documentedGripCandidates = ldcadGripCandidates.length === 1
          ? ldcadGripCandidates
          : inheritedLdcadGripCandidates;
        // A single explicit connector from the pinned LDCad Shadow source names
        // the intended grip. Rebrickable-declared print children may reuse the
        // connector of exactly one print parent while retaining their exact printed
        // LDraw geometry. Geometry remains the fallback when neither source exists.
        const gripCandidates = documentedGripCandidates.length === 1
          ? documentedGripCandidates
          : geometricGripCandidates;
        if (documentedGripCandidates.length === 1 && geometricConnectorCandidates.length > 1) {
          accessoryLdcadGripCandidatesDisambiguated += 1;
        }
        if (inheritedLdcadGripCandidates.length === 1) accessoryLdcadPrintParentGripCandidatesEvaluated += 1;
        if (gripCandidates.length === 0) {
          accessoryGripCandidatesExcluded += 1;
          continue;
        }
        if (gripCandidates.length > 1) accessoryMultipleGripCandidatesEvaluated += 1;
        const candidates = gripCandidates.map((evidence) => ({
          evidence,
          placementCandidates: gripCandidates.length === 1
            ? proposedSlidingHandPlacements(evidence)
            : proposedHandPlacements(evidence).map((placementTransformLdu) => ({
              placementTransformLdu,
              sourceGripCenterLdu: evidence.centerLdu,
            })),
        }));
        matchedParts.push({
          part: { ...part, role },
          candidate: direct,
          placementMode: "snap-connector",
          placementTransformLdu: candidates[0]!.placementCandidates[0]!.placementTransformLdu,
          gripCandidates: candidates,
          selectedGripEvidence: null,
          selectedGripCandidateIndex: null,
          composition: null,
        });
        continue;
      }
      const placementTransformLdu = placementByRole.get(role);
      if (!placementTransformLdu) throw new Error(`Missing ${role} placement transform`);
      matchedParts.push({
        part: { ...part, role },
        candidate: direct,
        placementMode: "prototype-family-origin",
        placementTransformLdu,
        gripCandidates: [],
        selectedGripEvidence: null,
        selectedGripCandidateIndex: null,
        composition: null,
      });
      continue;
    }

    if (role === "handAccessory") continue;

    const officialWrapper = uniqueOfficialAssemblyWrapper(part, role);
    if (officialWrapper.candidate) {
      const placementTransformLdu = placementByRole.get(role);
      if (!placementTransformLdu) throw new Error(`Missing ${role} placement transform`);
      matchedParts.push({
        part: { ...part, role },
        candidate: officialWrapper.candidate,
        placementMode: "prototype-family-origin",
        placementTransformLdu,
        gripCandidates: [],
        selectedGripEvidence: null,
        selectedGripCandidateIndex: null,
        composition: null,
      });
      continue;
    }
    if (officialWrapper.candidateCount > 1) ambiguousAssemblyWrappersExcluded += 1;

    const parentCandidates = [];
    for (const parentPartNum of normalizedPart?.printParentPartNums ?? []) {
      for (const candidate of candidateIndex.get(normalize(parentPartNum)) ?? []) {
        if (await supportsRoleAssembly(role, candidate)) parentCandidates.push({ candidate, parentPartNum });
      }
    }
    const parentFiles = [...new Set(parentCandidates.map(({ candidate }) => candidate.file))];
    const parentMatch = parentCandidates.find(({ candidate }) => candidate.matchType === "exact-filename") ?? parentCandidates[0];
    if (parentFiles.length === 1 && parentMatch) {
      const placementTransformLdu = placementByRole.get(role);
      if (!placementTransformLdu) throw new Error(`Missing ${role} placement transform`);
      matchedParts.push({
        part: { ...part, role },
        candidate: {
          ...parentMatch.candidate,
          matchType: "rebrickable-print-parent",
          printParentPartNums: [...new Set(parentCandidates
            .filter(({ candidate }) => candidate.file === parentMatch.candidate.file)
            .map(({ parentPartNum }) => parentPartNum))].sort(),
        },
        placementMode: "prototype-family-origin",
        placementTransformLdu,
        gripCandidates: [],
        selectedGripEvidence: null,
        selectedGripCandidateIndex: null,
        composition: null,
      });
      continue;
    }

    const composed = await composeColorCodedAssembly(part, role);
    if (composed) {
      const placementTransformLdu = placementByRole.get(role);
      if (!placementTransformLdu) throw new Error(`Missing ${role} placement transform`);
      matchedParts.push({
        part: { ...part, role },
        candidate: composed.candidate,
        placementMode: "prototype-family-origin",
        placementTransformLdu,
        gripCandidates: [],
        selectedGripEvidence: null,
        selectedGripCandidateIndex: null,
        composition: composed.composition,
      });
    } else if (parentFiles.length > 1) {
      // A deterministic standard assembly is safer than choosing between ambiguous
      // parent shortcuts (for example standing vs. sitting black legs).
      ambiguousMappingsExcluded += 1;
    }
  }
}

await rm(publicRoot, { force: true, recursive: true });
// Folders of earlier locked releases are removed so only the locked release is published.
for (const entry of await readdir(dirname(publicRoot), { withFileTypes: true })) {
  if (entry.isDirectory() && /^official-\d{4}$/u.test(entry.name)) await rm(resolve(dirname(publicRoot), entry.name), { recursive: true });
}
await mkdir(modelDirectory, { recursive: true });
await mkdir(thumbnailDirectory, { recursive: true });
await cp(resolve(libraryRoot, "LDConfig.ldr"), resolve(publicRoot, "LDConfig.ldr"));
await cp(resolve(libraryRoot, "CAlicense.txt"), resolve(root, "public/licenses/LDraw-CAlicense-2.0.txt"));
await cp(resolve(libraryRoot, "CAlicense4.txt"), resolve(root, "public/licenses/LDraw-CAlicense-4.0.txt"));
await chmod(resolve(root, "public/licenses/LDraw-CAlicense-2.0.txt"), 0o644);
await chmod(resolve(root, "public/licenses/LDraw-CAlicense-4.0.txt"), 0o644);
const materials = await readFile(resolve(libraryRoot, "LDConfig.ldr"), "utf8");
const referenceFigure = matchedParts.some(({ part }) => part.role === "handAccessory")
  ? await parsePackedModel(
    await readFile(resolve(root, "public/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd"), "utf8"),
    materials,
  )
  : null;
const copiedDependencies = new Set<string>();
const outputEntries: Array<Record<string, unknown>> = [];
const skippedEntries: Array<{ rebrickablePartNum: string; ldrawFile: string; reason: string }> = [];
const digitalPlacementRejections: Array<{
  rebrickablePartNum: string;
  ldrawFile: string;
  reasonCode: string;
  collisionSampleCount: number;
  collisionSamplesByPart: Record<string, number>;
  gripCandidatesTested: number;
  safeGripCandidatesFound: number;
  orientationCollisionCountsByGrip: number[][];
}> = [];
let accessoryMultipleGripCandidatesPassed = 0;
let accessoryMultipleGripCandidatesAmbiguous = 0;
let accessoryMultipleGripCandidatesNoSafe = 0;
let accessoryMultipleGripCandidatesRenderFailed = 0;
let accessoryPlacementRenderFailuresExcluded = 0;
type GeneratedAsset = {
  modelUrl: string;
  modelSha256: string;
  thumbnailUrl: string;
  thumbnailSha256: string;
  thumbnailBytes: number;
};

type PreviousGeneratedAsset = GeneratedAsset & {
  componentId: string;
};

const previousAssetsByModelUrl = new Map<string, PreviousGeneratedAsset>();
try {
  const previous = JSON.parse(await readFile(outputPath, "utf8")) as { entries?: PreviousGeneratedAsset[] };
  for (const entry of previous.entries ?? []) {
    if (entry.modelUrl && !previousAssetsByModelUrl.has(entry.modelUrl)) {
      previousAssetsByModelUrl.set(entry.modelUrl, entry);
    }
  }
} catch {
  // The first generation has no prior assets to reuse.
}

const fallbackAssetCache = new Map<string, GeneratedAsset>();
const fallbackFailureCache = new Map<string, string>();

for (const [index, match] of matchedParts.entries()) {
  const { part, candidate } = match;
  const normalizedPart = normalizedByPartNum.get(normalize(part.rebrickablePartNum));
  const colorVariant = normalizedPart?.colorVariants[0];
  const colorRgb = colorVariant?.rgb && /^[A-F0-9]{6}$/u.test(colorVariant.rgb) ? colorVariant.rgb : "A0A8A4";
  const isPrintParentFallback = candidate.matchType === "rebrickable-print-parent";
  const isUnprintedAssembly = match.composition?.printRendered === false;
  const isSharedAsset = isPrintParentFallback || isUnprintedAssembly;
  const assetRole = part.role === "torsoAssembly" ? "torso" : part.role === "legsAssembly" ? "legs" : part.role;
  const unprintedColors = [
    colorRgb,
    ...[...new Map((match.composition?.components ?? []).flatMap(({ colorRole, colorRgb: rgb }) => rgb ? [[colorRole, rgb] as const] : []))]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([colorRole, rgb]) => `${colorRole}${rgb}`),
  ].join("-").toLowerCase();
  const modelName = isPrintParentFallback
    ? `${assetRole}-geometry-${basename(candidate.file, ".dat")}-${colorRgb.toLowerCase()}`.replaceAll(/[^a-z0-9._-]/gu, "-")
    : isUnprintedAssembly
      ? `${assetRole}-unprinted-${unprintedColors}`
      : `${assetRole}-${normalize(part.rebrickablePartNum).replaceAll(/[^a-z0-9._-]/gu, "-")}`;
  const assetKey = isSharedAsset ? `${part.role}:${modelName}` : `${part.role}:${part.rebrickablePartNum}`;
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
  let digitalValidation: (DigitalAccessoryValidation & {
    gripCandidatesTested: number;
    safeGripCandidatesFound: number;
    selectedGripCandidateIndex: number;
    orientationCandidatesTested: number;
    selectedOrientationIndex: number;
  }) | null = null;
  const modelColors: ModelColor[] = [{ name: "FigForge_Catalog", code: CUSTOM_COLOR_CODE, rgb: colorRgb }];
  const modelLines: ModelLine[] = [{ colorCode: CUSTOM_COLOR_CODE, transform: identityTransform, file: candidate.file }];
  if (match.composition) {
    modelLines.length = 0;
    for (const component of match.composition.components) {
      const code = ASSEMBLY_COLOR_CODES[component.colorRole];
      if (component.colorRgb && !modelColors.some((color) => color.code === code)) {
        modelColors.push({ name: `FigForge_${component.colorRole[0]!.toUpperCase()}${component.colorRole.slice(1)}`, code, rgb: component.colorRgb });
      }
      modelLines.push({ colorCode: code, transform: component.transform, file: component.file });
    }
  }
  if (!asset) {
    const { packed, dependencies } = await packedModel(modelLines, modelColors, modelName, fileIndex);
    const wrapper = [
      `0 ${isPrintParentFallback
        ? `Unprinted parent geometry for ${candidate.printParentPartNums?.join(", ")}`
        : isUnprintedAssembly ? `Unprinted ${assetRole} assembly from official parts` : part.name}`,
      `0 Name: ${modelName}.ldr`,
      `0 // License: ${lock.license}; see referenced official part and ${basename(lock.noticePath)}`,
      ...modelColors.map(colorDefinition),
      ...modelLines.map(({ colorCode, transform, file }) => `1 ${colorCode} ${transform.join(" ")} ${browserReferencePath(file)}`),
      "",
    ].join("\n");
    const modelUrl = `${OFFICIAL_LDRAW_PUBLIC_PATH}models/${modelName}.ldr`;
    const modelSha256 = sha256(wrapper);
    const thumbnailUrl = `/assets/thumbnails/ldraw-expanded/${modelName}.webp`;
    let thumbnail: Buffer;
    try {
      const model = await parsePackedModel(packed, materials);
      if (part.role === "handAccessory") {
        if (!referenceFigure || match.gripCandidates.length === 0) throw new Error("Missing accessory validation input");
        const gripEvaluations: DigitalAccessoryGripEvaluation[] = match.gripCandidates.map(({ evidence, placementCandidates }) => ({
          orientations: placementCandidates.map(({ placementTransformLdu, sourceGripCenterLdu }) => ({
            placementTransformLdu,
            validation: validateDigitalAccessoryPlacement(
              model,
              referenceFigure,
              placementTransformLdu,
              sourceGripCenterLdu,
              evidence.lengthLdu,
            ),
          })),
        }));
        const selection = selectUnambiguousDigitalAccessoryGrip(gripEvaluations);
        if (selection.status === "rejected") {
          const allOrientations = gripEvaluations.flatMap(({ orientations }) => orientations);
          const bestRejected = allOrientations.reduce((best, current) =>
            current.validation.collisionSampleCount < best.validation.collisionSampleCount ? current : best
          );
          if (match.gripCandidates.length > 1) {
            if (selection.reasonCode === "multiple-safe-grip-candidates") {
              accessoryMultipleGripCandidatesAmbiguous += 1;
            } else {
              accessoryMultipleGripCandidatesNoSafe += 1;
            }
          }
          digitalPlacementRejections.push({
            rebrickablePartNum: part.rebrickablePartNum,
            ldrawFile: candidate.file,
            reasonCode: match.gripCandidates.length === 1
              ? bestRejected.validation.reasonCode ?? selection.reasonCode
              : selection.reasonCode,
            collisionSampleCount: bestRejected.validation.collisionSampleCount,
            collisionSamplesByPart: bestRejected.validation.collisionSamplesByPart,
            gripCandidatesTested: gripEvaluations.length,
            safeGripCandidatesFound: selection.safeGripCandidatesFound,
            orientationCollisionCountsByGrip: gripEvaluations.map(({ orientations }) =>
              orientations.map(({ validation }) => validation.collisionSampleCount)
            ),
          });
          continue;
        }
        const selectedGrip = match.gripCandidates[selection.selectedGripCandidateIndex];
        const selected = gripEvaluations[selection.selectedGripCandidateIndex]?.orientations[selection.selectedOrientationIndex];
        if (!selectedGrip || !selected) throw new Error("Selected accessory placement is missing");
        digitalValidation = {
          ...selected.validation,
          gripCandidatesTested: gripEvaluations.length,
          safeGripCandidatesFound: selection.safeGripCandidatesFound,
          selectedGripCandidateIndex: selection.selectedGripCandidateIndex,
          orientationCandidatesTested: selectedGrip.placementCandidates.length,
          selectedOrientationIndex: selection.selectedOrientationIndex,
        };
        match.placementTransformLdu = selected.placementTransformLdu;
        match.selectedGripEvidence = selectedGrip.evidence;
        match.selectedGripCandidateIndex = selection.selectedGripCandidateIndex;
        if (match.gripCandidates.length > 1) accessoryMultipleGripCandidatesPassed += 1;
      }
      const renderedSvg = Buffer.from(renderSvg(model));
      const previousAsset = previousAssetsByModelUrl.get(modelUrl);
      let previousThumbnail: Buffer | null = null;
      if (previousAsset?.modelSha256 === modelSha256 && previousAsset.thumbnailUrl === thumbnailUrl) {
        try {
          const candidateThumbnail = await readFile(resolve(root, `public${thumbnailUrl}`));
          if (
            candidateThumbnail.byteLength === previousAsset.thumbnailBytes
            && sha256(candidateThumbnail) === previousAsset.thumbnailSha256
          ) {
            previousThumbnail = candidateThumbnail;
          }
        } catch {
          // Missing or stale prior thumbnails are regenerated below.
        }
      }
      thumbnail = previousThumbnail
        ?? await sharp(renderedSvg).webp({ quality: 82, effort: 4 }).toBuffer();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown render failure";
      if (isSharedAsset) fallbackFailureCache.set(assetKey, reason);
      if (part.role === "handAccessory") {
        accessoryPlacementRenderFailuresExcluded += 1;
        if (match.gripCandidates.length > 1) accessoryMultipleGripCandidatesRenderFailed += 1;
      }
      skippedEntries.push({
        rebrickablePartNum: part.rebrickablePartNum,
        ldrawFile: candidate.file,
        reason,
      });
      continue;
    }
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
      modelSha256,
      thumbnailUrl,
      thumbnailSha256: sha256(thumbnail),
      thumbnailBytes: thumbnail.byteLength,
    };
    if (isSharedAsset) fallbackAssetCache.set(assetKey, asset);
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
    assemblyWrapperFor: candidate.matchType === "official-assembly-wrapper" ? candidate.wrappedPartFile : null,
    geometryFallback: isPrintParentFallback ? {
      kind: "unprinted-print-parent",
      parentPartNums: candidate.printParentPartNums,
    } : isUnprintedAssembly ? {
      kind: "unprinted-assembly-code",
      parentPartNums: normalizedPart?.printParentPartNums ?? [],
    } : null,
    modelUrl: asset.modelUrl,
    modelSha256: asset.modelSha256,
    thumbnailUrl: asset.thumbnailUrl,
    thumbnailSha256: asset.thumbnailSha256,
    thumbnailBytes: asset.thumbnailBytes,
    placementMode: match.placementMode,
    placementTransformLdu: match.placementTransformLdu,
    digitalValidation: part.role === "handAccessory" ? {
      ...digitalValidation,
      gripPrimitive: match.selectedGripEvidence?.primitive,
      gripEvidenceSource: match.selectedGripEvidence?.primitive.startsWith("ldcad-shadow:")
        ? "ldcad-shadow-snap"
        : "official-ldraw-geometry",
      limits: digitalAccessoryLimits,
      physicalFitGuaranteed: false,
    } : null,
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

const outputComponentIds = new Set(outputEntries.map(({ componentId }) => componentId));
const outputThumbnailPaths = new Set(outputEntries.map(({ thumbnailUrl }) =>
  resolve(root, `public${String(thumbnailUrl)}`)
));
for (const thumbnailPath of await collectFiles(thumbnailDirectory)) {
  if (!outputThumbnailPaths.has(thumbnailPath)) await rm(thumbnailPath);
}
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
    legsAssemblyCount: outputEntries.filter(({ role }) => role === "legsAssembly").length,
    handAccessoryCount: outputEntries.filter(({ role }) => role === "handAccessory").length,
    directMappingCount: outputEntries.filter(({ mappingEvidence }) =>
      mappingEvidence !== "rebrickable-print-parent" && mappingEvidence !== "rebrickable-assembly-code"
    ).length,
    colorCodedAssemblyCount: outputEntries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-assembly-code").length,
    officialAssemblyWrapperCount: outputEntries.filter(({ mappingEvidence }) => mappingEvidence === "official-assembly-wrapper").length,
    ambiguousAssemblyWrappersExcluded,
    unprintedColorCodedAssemblyCount: outputEntries.filter(({ geometryFallback }) =>
      (geometryFallback as { kind?: string } | null)?.kind === "unprinted-assembly-code"
    ).length,
    printParentGeometryFallbackCount: outputEntries.filter(({ mappingEvidence }) => mappingEvidence === "rebrickable-print-parent").length,
    generatedAssetCount: outputEntries.filter(({ geometryFallback }) => geometryFallback === null).length + fallbackAssetCache.size,
    sharedOfficialFileCount: copiedDependencies.size,
    ambiguousMappingsExcluded,
    accessoryGripCandidatesExcluded,
    accessoryLdcadGripCandidatesDisambiguated,
    accessoryLdcadPrintParentGripCandidatesEvaluated,
    accessoryMultipleGripCandidatesEvaluated,
    accessoryMultipleGripCandidatesPassed,
    accessoryMultipleGripCandidatesAmbiguous,
    accessoryMultipleGripCandidatesNoSafe,
    accessoryMultipleGripCandidatesRenderFailed,
    accessoryPlacementCandidatesEvaluated: matchedParts.filter(({ part }) => part.role === "handAccessory").length,
    accessoryPlacementRenderFailuresExcluded,
    digitalPlacementPassedCount: outputEntries.filter(({ role }) => role === "handAccessory").length,
    digitalPlacementRejectionsExcluded: digitalPlacementRejections.length,
    renderFailuresExcluded: skippedEntries.length,
    mocFilesUsed: 0,
  },
  assemblyColorCodes: {
    derivation: "Unprinted Rebrickable base assemblies 973cNNhMM, 970cNN, 970cNNpatMM and 970lNNrMM whose names follow the fixed grammar 'Torso, A Arms, H Hands', 'Hips and L Legs', 'Hips with L Legs and B Boots Pattern' or 'Hips and L Left Leg, R Right Leg'; a code is used only when all such names agree on one catalog colour with one RGB value.",
    codes: [...assemblyColorCodes.codes].map(([code, colorName]) => ({
      code,
      colorName,
      colorRgb: colorRgbByName.get(colorName),
      evidencePartNums: assemblyColorCodes.evidence.get(code) ?? [],
    })),
    unresolvedCodes: [...assemblyColorCodes.unresolved].map(([code, { colorNames, reason }]) => ({
      code,
      colorNames,
      reason,
      evidencePartNums: assemblyColorCodes.evidence.get(code) ?? [],
    })),
    splitLegCodes: [...splitLegColorCodes.codes].map(([code, colorName]) => ({
      code,
      colorName,
      colorRgb: colorRgbByName.get(colorName),
      evidencePartNums: splitLegColorCodes.evidence.get(code) ?? [],
    })),
    unresolvedSplitLegCodes: [...splitLegColorCodes.unresolved].map(([code, { colorNames, reason }]) => ({
      code,
      colorNames,
      reason,
      evidencePartNums: splitLegColorCodes.evidence.get(code) ?? [],
    })),
    referenceAssemblies: Object.fromEntries(Object.entries(referenceAssemblies).map(([kind, reference]) => [kind, {
      shortcutCount: reference.shortcutCount,
      agreeingShortcutCount: reference.agreeingShortcutCount,
      lines: reference.lines,
    }])),
  },
  renderFailures: skippedEntries,
  digitalPlacementRejections,
  limitations: [
    "Direct mappings require an unambiguous exact filename or explicit LDraw !KEYWORDS Rebrickable identifier.",
    "Print variants may reuse the unique official unprinted parent geometry declared by the locked Rebrickable part_relationships.csv; their printed decoration is not rendered.",
    "Standard torso and legs assemblies without an official LDraw file are composed from official torso, arm, hand, hip and leg parts in the placement shared by the official shortcuts; arm, hand and leg colours come from the Rebrickable assembly code and must be confirmed by the entry's own name.",
    "Dual-moulded 970cNNpatMM legs are composed from the official LDraw hip and dual-mould upper/lower leg geometry; leg and boot colours must both be confirmed by the Rebrickable assembly code and entry name, and the hip needs catalog-backed colour evidence.",
    "Asymmetric 970lNNrMM legs are composed from the official LDraw hip, left-leg and right-leg geometry only when both leg colours are confirmed by the Rebrickable assembly code and entry name and exactly one catalog-backed hip colour exists.",
    "Printed torso and legs assemblies without any official LDraw file for their number use the same composition with the plain official body in the catalog colour; they are marked as not rendering their print and share one generated asset per colour combination.",
    "Family-origin placement is a digital convention, not a physical clutch-force guarantee.",
    "Hand accessories pass only when exactly one radius-4 grip candidate from official LDraw geometry or the pinned LDCad Shadow Library satisfies deterministic minimum-length, rigid-transform, model-bounds and reference-figure clearance checks; exact printed geometry may reuse one pinned LDCad grip only when locked Rebrickable part_relationships.csv declares exactly one print parent. Physical clutch force remains unverified.",
    "The first catalog-backed color is used for preview; parts without color evidence use neutral gray.",
  ],
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeLDrawRuntimePackages(root);
// Composition evidence stays outside the runtime packages because the browser does not need it.
await writeFile(compositionsPath, `${JSON.stringify({
  schemaVersion: 1,
  sourcePolicy: lock.sourcePolicy,
  catalogPath: "data/generated/ldraw-expanded-catalog.json",
  compositions: Object.fromEntries(matchedParts
    .flatMap(({ part, composition }) => composition ? [[`catalog:${part.role}:${normalize(part.rebrickablePartNum)}`, composition] as const] : [])
    .filter(([componentId]) => outputComponentIds.has(componentId))),
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ message: "expanded official LDraw catalog built", ...output.summary }));
