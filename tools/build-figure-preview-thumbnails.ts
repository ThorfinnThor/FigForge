import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import sharp from "sharp";
import {
  BufferGeometry,
  Color,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { FIGURE_TEMPLATES } from "../src/ideas/figure-templates.js";
import type { FigureDocumentSlot } from "../src/contracts/figure-document.js";

const ROOT = resolve("public/assets/ldraw/official-2609");
const OUTPUT_DIRECTORY = resolve("public/assets/figure-previews");
const MATERIALS_PATH = join(ROOT, "LDConfig.ldr");
const WIDTH = 720;
const HEIGHT = 720;

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

type RuntimeEntry = {
  componentId: string;
  modelUrl: string;
  placementTransformLdu: number[];
};

type RuntimePackage = {
  entries: RuntimeEntry[];
};

type Triangle = {
  color: Color;
  depth: number;
  points: [Vector3, Vector3, Vector3];
};

type LDrawMesh = Mesh<BufferGeometry, Material | Material[]>;

const ROLE_FILES: Record<FigureDocumentSlot, string> = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
};

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

function embeddedName(path: string): string {
  if (path.startsWith("parts/s/") || path.startsWith("p/48/")) return path;
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
    if (match) return match;
  }
  throw new Error(`Missing official LDraw dependency: ${reference}`);
}

async function dependencyClosure(content: string, fileIndex: ReadonlyMap<string, string>): Promise<string[]> {
  const visited = new Set<string>();
  const pending = content.split(/\r?\n/u).flatMap((line) => {
    if (!line.startsWith("1 ")) return [];
    const reference = line.trim().split(/\s+/u).at(-1);
    return reference ? [resolveReference(reference, fileIndex)] : [];
  });

  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) continue;
    visited.add(path);
    const dependency = await readFile(join(ROOT, path), "utf8");
    for (const line of dependency.split(/\r?\n/u)) {
      if (!line.startsWith("1 ")) continue;
      const reference = line.trim().split(/\s+/u).at(-1);
      if (reference) pending.push(resolveReference(reference, fileIndex));
    }
  }
  return [...visited].sort();
}

async function packRuntimeModel(modelPath: string, fileIndex: ReadonlyMap<string, string>): Promise<string> {
  const topLevel = await readFile(modelPath, "utf8");
  const dependencies = await dependencyClosure(topLevel, fileIndex);
  const sections = [`0 FILE ${basename(modelPath)}`, topLevel.trimEnd()];
  for (const dependency of dependencies) {
    sections.push(
      `0 FILE ${embeddedName(dependency)}`,
      (await readFile(join(ROOT, dependency), "utf8")).trimEnd(),
    );
  }
  return `${sections.join("\n")}\n`;
}

async function parsePackedModel(mpd: string, materials: string): Promise<Group> {
  const loader = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
  const materialsUrl = `data:text/plain;base64,${Buffer.from(materials, "utf8").toString("base64")}`;
  await loader.preloadMaterials(materialsUrl);
  return await new Promise<Group>((resolveModel, rejectModel) => {
    loader.parse(mpd, resolveModel, rejectModel);
  });
}

function materialFor(mesh: LDrawMesh, materialIndex: number): Material {
  const material = Array.isArray(mesh.material)
    ? (mesh.material[materialIndex] ?? mesh.material[0])
    : mesh.material;
  if (!material) throw new Error("LDraw mesh has no material");
  return material;
}

function trianglesFromFigure(figure: Group): Triangle[] {
  const triangles: Triangle[] = [];
  const xAxis = new Vector3(1, 0, 0);
  const yAxis = new Vector3(0, 1, 0);
  figure.updateMatrixWorld(true);

  figure.traverse((object) => {
    if (!(object instanceof Mesh)) return;
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
        const points = [offset, offset + 1, offset + 2].map((positionIndex) => {
          const vertexIndex = index ? index.getX(positionIndex) : positionIndex;
          return new Vector3()
            .fromBufferAttribute(position, vertexIndex)
            .applyMatrix4(mesh.matrixWorld)
            .applyAxisAngle(xAxis, Math.PI)
            .applyAxisAngle(yAxis, 0.58)
            .applyAxisAngle(xAxis, -0.22);
        }) as [Vector3, Vector3, Vector3];
        if (points.every((point) => Number.isFinite(point.x + point.y + point.z))) {
          triangles.push({ color, points, depth: (points[0].z + points[1].z + points[2].z) / 3 });
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
  const intensity = 0.68 + 0.32 * Math.abs(normal.dot(light));
  const shaded = color.clone();
  shaded.r = Math.min(1, shaded.r * intensity);
  shaded.g = Math.min(1, shaded.g * intensity);
  shaded.b = Math.min(1, shaded.b * intensity);
  return `#${shaded.getHexString()}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFigureSvg(figure: Group, name: string): string {
  const triangles = trianglesFromFigure(figure);
  if (triangles.length === 0) throw new Error(`No renderable LDraw faces for ${name}`);
  const points = triangles.flatMap((triangle) => triangle.points);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => -y));
  const maxY = Math.max(...points.map(({ y }) => -y));
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const scale = Math.min(560 / width, 540 / height);
  const offsetX = WIDTH / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = 335 - ((minY + maxY) / 2) * scale;
  const polygons = triangles.map(({ color, points: trianglePoints }) => {
    const coordinates = trianglePoints.map(({ x, y }) =>
      `${(x * scale + offsetX).toFixed(1)},${(-y * scale + offsetY).toFixed(1)}`,
    ).join(" ");
    return `<polygon points="${coordinates}" fill="${shadedHex(color, trianglePoints)}"/>`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title description">`,
    `<title id="title">${escapeXml(name)}</title>`,
    '<desc id="description">Complete FigForge figure preview rendered from verified official LDraw geometry.</desc>',
    '<rect width="720" height="720" fill="#1d2748"/>',
    '<path d="M260 0h200l128 620H132z" fill="#fff" opacity=".14"/>',
    '<ellipse cx="360" cy="625" rx="270" ry="66" fill="#f7edc8"/>',
    '<ellipse cx="360" cy="605" rx="154" ry="30" fill="#1f2d54" opacity=".14"/>',
    ...polygons,
    "</svg>",
  ].join("\n");
}

const runtimeEntries = new Map<string, RuntimeEntry>();
for (const file of Object.values(ROLE_FILES)) {
  const document = JSON.parse(await readFile(resolve(`data/generated/ldraw-runtime/${file}`), "utf8")) as RuntimePackage;
  for (const entry of document.entries) runtimeEntries.set(entry.componentId, entry);
}

const libraryFiles = (await collectFiles(ROOT))
  .map((path) => relative(ROOT, path).split(sep).join("/"))
  .filter((path) => path.endsWith(".dat"));
const fileIndex = new Map(libraryFiles.map((path) => [path.toLowerCase(), path]));
const materials = await readFile(MATERIALS_PATH, "utf8");
await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (const template of FIGURE_TEMPLATES) {
  const figure = new Group();
  for (const selection of template.document.selections) {
    const runtime = runtimeEntries.get(selection.componentId);
    if (!runtime || runtime.placementTransformLdu.length !== 16) {
      throw new Error(`Missing verified runtime placement for ${selection.componentId}`);
    }
    const modelPath = resolve(`public${runtime.modelUrl}`);
    const part = await parsePackedModel(await packRuntimeModel(modelPath, fileIndex), materials);
    new Matrix4().fromArray(runtime.placementTransformLdu).decompose(part.position, part.quaternion, part.scale);
    figure.add(part);
  }
  const svg = renderFigureSvg(figure, template.document.name);
  const webp = await sharp(Buffer.from(svg)).webp({ effort: 6, quality: 88 }).toBuffer();
  const outputPath = join(OUTPUT_DIRECTORY, `${template.id}.webp`);
  await writeFile(outputPath, webp);
  process.stdout.write(`Generated ${relative(process.cwd(), outputPath)} (${webp.byteLength} bytes)\n`);
}
