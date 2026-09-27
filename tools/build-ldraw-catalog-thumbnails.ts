import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
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

const ROOT = resolve("public/assets/ldraw/catalog");
const MAPPING_PATH = resolve("data/curated/ldraw-catalog-mappings.json");
const ASSORTMENT_PATH = resolve("data/curated/ff03-test-assortment.json");
const GENERATED_INDEX_PATH = resolve("data/generated/ldraw-catalog-thumbnails.json");
const PUBLIC_INDEX_PATH = resolve("public/assets/ldraw/catalog/index.json");
const MODEL_DIRECTORY = resolve("public/assets/ldraw/catalog/models");
const THUMBNAIL_DIRECTORY = resolve("public/assets/thumbnails/ldraw");
const CUSTOM_COLOR_CODE = 10_000;

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

type MappingEntry = {
  componentId: string;
  rebrickablePartNum: string;
  status: "verified" | "blocked";
  ldrawFile?: string;
  ldrawUpdate?: string;
  mappingEvidence?: string;
  sourceUrl?: string;
  packageUrl?: string;
  packageSha256?: string;
  fileSha256?: string;
  reason?: string;
};

type MappingDocument = {
  schemaVersion: 1;
  updatedAt: string;
  prototypeOnly: true;
  publishable: false;
  sourcePolicy: string;
  entries: MappingEntry[];
};

type AssortmentComponent = {
  id: string;
  rebrickablePartNum: string;
  name: string;
  colorEvidence: Array<{ rgb: string }>;
};

type AssortmentDocument = {
  components: AssortmentComponent[];
};

type Triangle = {
  points: [Vector3, Vector3, Vector3];
  color: Color;
  depth: number;
};

type LDrawMesh = Mesh<BufferGeometry, Material | Material[]>;

const sha256 = (content: string | Buffer): string => createHash("sha256").update(content).digest("hex");

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function embeddedName(path: string): string {
  if (path.startsWith("parts/s/") || path.startsWith("p/48/")) {
    return path;
  }
  return basename(path);
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
    if (match) {
      return match;
    }
  }
  throw new Error(`Missing official LDraw dependency: ${reference}`);
}

async function dependencyClosure(topLevelPath: string, fileIndex: ReadonlyMap<string, string>): Promise<string[]> {
  const visited = new Set<string>();
  const pending = [topLevelPath];

  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) {
      continue;
    }
    visited.add(path);
    const content = await readFile(join(ROOT, path), "utf8");
    for (const line of content.split(/\r?\n/u)) {
      if (!line.startsWith("1 ")) {
        continue;
      }
      const reference = line.trim().split(/\s+/u).at(-1);
      if (!reference) {
        continue;
      }
      pending.push(resolveReference(reference, fileIndex));
    }
  }

  return [...visited].sort();
}

async function buildPackedModel(entry: MappingEntry, colorRgb: string, fileIndex: ReadonlyMap<string, string>): Promise<string> {
  if (!entry.ldrawFile) {
    throw new Error(`Verified entry ${entry.componentId} has no LDraw file`);
  }
  const dependencies = await dependencyClosure(entry.ldrawFile, fileIndex);
  const sections = [
    `0 FILE ${entry.componentId}.mpd`,
    `0 FigForge local catalog thumbnail source for ${entry.rebrickablePartNum}`,
    `0 !COLOUR FigForge_Catalog CODE ${CUSTOM_COLOR_CODE} VALUE #${colorRgb} EDGE #333333`,
    `1 ${CUSTOM_COLOR_CODE} 0 0 0 1 0 0 0 1 0 0 0 1 ${embeddedName(entry.ldrawFile)}`,
  ];

  for (const dependency of dependencies) {
    const content = (await readFile(join(ROOT, dependency), "utf8")).trimEnd();
    sections.push(`0 FILE ${embeddedName(dependency)}`, content);
  }
  return `${sections.join("\n")}\n`;
}

async function parsePackedModel(mpd: string, materials: string): Promise<Group> {
  const loader = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
  const materialsUrl = `data:text/plain;base64,${Buffer.from(materials, "utf8").toString("base64")}`;
  await loader.preloadMaterials(materialsUrl);
  return new Promise<Group>((resolveModel, rejectModel) => {
    loader.parse(mpd, resolveModel, rejectModel);
  });
}

function materialFor(mesh: LDrawMesh, materialIndex: number): Material {
  const material = Array.isArray(mesh.material)
    ? (mesh.material[materialIndex] ?? mesh.material[0])
    : mesh.material;
  if (!material) {
    throw new Error("LDraw mesh has no material");
  }
  return material;
}

function trianglesFromModel(model: Group): Triangle[] {
  const triangles: Triangle[] = [];
  const xAxis = new Vector3(1, 0, 0);
  const yAxis = new Vector3(0, 1, 0);
  model.updateMatrixWorld(true);

  model.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    const mesh = object as LDrawMesh;
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    const count = index?.count ?? position.count;
    const groups = mesh.geometry.groups.length > 0
      ? mesh.geometry.groups
      : [{ start: 0, count, materialIndex: 0 }];

    for (const group of groups) {
      const material = materialFor(mesh, group.materialIndex ?? 0);
      const color = material instanceof MeshStandardMaterial ? material.color.clone() : new Color(0x777777);
      const end = Math.min(group.start + group.count, count);
      for (let offset = group.start; offset + 2 < end; offset += 3) {
        const vertices = [offset, offset + 1, offset + 2].map((positionIndex) => {
          const vertexIndex = index ? index.getX(positionIndex) : positionIndex;
          return new Vector3()
            .fromBufferAttribute(position, vertexIndex)
            .applyMatrix4(mesh.matrixWorld)
            .applyAxisAngle(xAxis, Math.PI)
            .applyAxisAngle(yAxis, 0.58)
            .applyAxisAngle(xAxis, -0.28);
        }) as [Vector3, Vector3, Vector3];
        if (vertices.every((vertex) => Number.isFinite(vertex.x + vertex.y + vertex.z))) {
          triangles.push({
            points: vertices,
            color,
            depth: (vertices[0].z + vertices[1].z + vertices[2].z) / 3,
          });
        }
      }
    }
  });

  return triangles.sort((left, right) => left.depth - right.depth);
}

function shadedHex(color: Color, points: [Vector3, Vector3, Vector3]): string {
  const edgeA = points[1].clone().sub(points[0]);
  const edgeB = points[2].clone().sub(points[0]);
  const normal = edgeA.cross(edgeB).normalize();
  const light = new Vector3(-0.35, 0.55, 1).normalize();
  const intensity = 0.7 + 0.3 * Math.abs(normal.dot(light));
  const shaded = color.clone();
  shaded.r = Math.min(1, shaded.r * intensity);
  shaded.g = Math.min(1, shaded.g * intensity);
  shaded.b = Math.min(1, shaded.b * intensity);
  return `#${shaded.getHexString()}`;
}

function renderThumbnail(model: Group, component: AssortmentComponent): string {
  const triangles = trianglesFromModel(model);
  if (triangles.length === 0) {
    throw new Error(`No renderable LDraw faces for ${component.id}`);
  }

  const points = triangles.flatMap((triangle) => triangle.points);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => -y));
  const maxY = Math.max(...points.map(({ y }) => -y));
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const scale = Math.min(184 / width, 172 / height);
  const offsetX = 128 - ((minX + maxX) / 2) * scale;
  const offsetY = 116 - ((minY + maxY) / 2) * scale;
  const polygons = triangles.map(({ color, points: trianglePoints }) => {
    const coordinates = trianglePoints.map(({ x, y }) =>
      `${(x * scale + offsetX).toFixed(1)},${(-y * scale + offsetY).toFixed(1)}`,
    ).join(" ");
    return `<polygon points="${coordinates}" fill="${shadedHex(color, trianglePoints)}"/>`;
  });

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title description">',
    `<title id="title">${escapeXml(component.name)}</title>`,
    `<desc id="description">Lokale Vorschau aus verifizierter offizieller LDraw-Geometrie für ${escapeXml(component.rebrickablePartNum)}.</desc>`,
    '<rect width="256" height="256" rx="24" fill="#f5f6f4"/>',
    '<rect x="16" y="16" width="224" height="224" rx="18" fill="#ffffff" stroke="#dde3de" stroke-width="2"/>',
    '<ellipse cx="128" cy="211" rx="68" ry="11" fill="#d9ddd8" opacity=".62"/>',
    ...polygons,
    '<rect x="25" y="222" width="122" height="18" rx="9" fill="#eff6f1"/>',
    '<text x="34" y="235" fill="#26735a" font-family="Arial,sans-serif" font-size="9" font-weight="700">OFFIZIELLES LDRAW</text>',
    '</svg>',
  ].join("\n");
}

const mapping = JSON.parse(await readFile(MAPPING_PATH, "utf8")) as MappingDocument;
const assortment = JSON.parse(await readFile(ASSORTMENT_PATH, "utf8")) as AssortmentDocument;
const components = new Map(assortment.components.map((component) => [component.id, component]));
const libraryFiles = (await collectFiles(ROOT))
  .map((path) => relative(ROOT, path).split(sep).join("/"))
  .filter((path) => path.endsWith(".dat"));
const fileIndex = new Map(libraryFiles.map((path) => [path.toLowerCase(), path]));
const materials = await readFile(join(ROOT, "LDConfig.ldr"), "utf8");

await mkdir(MODEL_DIRECTORY, { recursive: true });
await mkdir(THUMBNAIL_DIRECTORY, { recursive: true });

const outputEntries = [];
for (const entry of mapping.entries) {
  const component = components.get(entry.componentId);
  if (!component || component.rebrickablePartNum !== entry.rebrickablePartNum) {
    throw new Error(`Mapping does not match FF-03 assortment: ${entry.componentId}`);
  }
  if (entry.status === "blocked") {
    outputEntries.push({
      componentId: entry.componentId,
      rebrickablePartNum: entry.rebrickablePartNum,
      status: entry.status,
      reason: entry.reason,
      thumbnailUrl: null,
      modelUrl: null,
    });
    continue;
  }

  const colorRgb = component.colorEvidence[0]?.rgb;
  if (!colorRgb || !/^[A-F0-9]{6}$/u.test(colorRgb)) {
    throw new Error(`Missing catalog RGB evidence for ${component.id}`);
  }
  const mpd = await buildPackedModel(entry, colorRgb, fileIndex);
  const model = await parsePackedModel(mpd, materials);
  const thumbnail = renderThumbnail(model, component);
  const modelUrl = `/assets/ldraw/catalog/models/${entry.componentId}.mpd`;
  const thumbnailUrl = `/assets/thumbnails/ldraw/${entry.componentId}.svg`;
  await writeFile(resolve(`public${modelUrl}`), mpd, "utf8");
  await writeFile(resolve(`public${thumbnailUrl}`), thumbnail, "utf8");
  outputEntries.push({
    componentId: entry.componentId,
    rebrickablePartNum: entry.rebrickablePartNum,
    status: entry.status,
    ldrawFile: entry.ldrawFile,
    ldrawUpdate: entry.ldrawUpdate,
    mappingEvidence: entry.mappingEvidence,
    sourceUrl: entry.sourceUrl,
    modelUrl,
    modelSha256: sha256(mpd),
    thumbnailUrl,
    thumbnailSha256: sha256(thumbnail),
    thumbnailBytes: Buffer.byteLength(thumbnail, "utf8"),
    publishable: false,
  });
}

const verifiedCount = outputEntries.filter(({ status }) => status === "verified").length;
const blockedCount = outputEntries.filter(({ status }) => status === "blocked").length;
const index = {
  schemaVersion: 1,
  generatedAt: mapping.updatedAt,
  prototypeOnly: true,
  publishable: false,
  sourcePolicy: mapping.sourcePolicy,
  entries: outputEntries,
  summary: {
    componentCount: outputEntries.length,
    verifiedCount,
    blockedCount,
  },
  openBlockers: [
    "These thumbnails prove local renderability only and are not procurement mappings.",
    "Blocked components retain synthetic placeholders until an explicit official LDraw mapping exists.",
  ],
};
const serializedIndex = `${JSON.stringify(index, null, 2)}\n`;
await mkdir(dirname(GENERATED_INDEX_PATH), { recursive: true });
await writeFile(GENERATED_INDEX_PATH, serializedIndex, "utf8");
await writeFile(PUBLIC_INDEX_PATH, serializedIndex, "utf8");
console.log(JSON.stringify({ message: "official LDraw catalog thumbnails generated", ...index.summary }));
