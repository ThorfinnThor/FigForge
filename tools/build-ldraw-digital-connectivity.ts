import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Matrix4 } from "three";
import { ldrawDigitalConnectivitySchema } from "../src/contracts/ldraw-digital-connectivity.js";

const root = process.cwd();
const vendorRoot = resolve(root, "data/vendor/ldcad-shadow");
const outputPath = resolve(root, "data/generated/ldraw-digital-connectivity.json");
const prototypePath = resolve(root, "public/assets/ldraw/prototype/models/figforge-minifigure-packed.mpd");
const sourceFiles = [
  "p/stud16.dat",
  "p/stud4o.dat",
  "parts/10053.dat",
  "parts/21459.dat",
  "parts/29109.dat",
  "parts/3820.dat",
  "parts/3841.dat",
  "parts/3901.dat",
  "parts/95049.dat",
  "parts/95050.dat",
  "parts/95053.dat",
  "parts/95054.dat",
  "parts/99253.dat",
  "parts/604548.dat",
  "parts/s/3626cs02.dat",
  "parts/s/973s01.dat",
] as const;

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const rounded = (matrix: Matrix4): number[] => matrix.toArray().map((value) => Math.round(value * 1_000_000) / 1_000_000);

function ldrawMatrix(values: readonly number[]): Matrix4 {
  if (values.length !== 12 || values.some((value) => !Number.isFinite(value))) {
    throw new Error("LDraw transform must contain twelve finite values");
  }
  const [x, y, z, a, b, c, d, e, f, g, h, i] = values as [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  return new Matrix4().fromArray([a, d, g, 0, b, e, h, 0, c, f, i, 0, x, y, z, 1]);
}

function prototypeTransforms(source: string): Map<string, Matrix4> {
  const transforms = new Map<string, Matrix4>();
  for (const line of source.split(/\r?\n/u)) {
    const tokens = line.trim().split(/\s+/u);
    if (tokens[0] !== "1" || tokens.length < 15) continue;
    const values = tokens.slice(2, 14).map(Number);
    if (values.some((value) => !Number.isFinite(value))) continue;
    transforms.set(basename(tokens.slice(14).join(" ").replaceAll("\\", "/")), ldrawMatrix(values));
  }
  return transforms;
}

const [sourceRaw, prototypeRaw, ...vendorRaw] = await Promise.all([
  readFile(resolve(vendorRoot, "source.json"), "utf8"),
  readFile(prototypePath, "utf8"),
  ...sourceFiles.map((path) => readFile(resolve(vendorRoot, path), "utf8")),
]);
const source = JSON.parse(sourceRaw) as {
  repositoryUrl: string;
  revision: string;
  licenseId: string;
  licenseUrl: string;
};
const vendorByPath = new Map(sourceFiles.map((path, index) => [path, vendorRaw[index]]));
const requireMeta = (path: typeof sourceFiles[number], fragment: string): void => {
  if (!vendorByPath.get(path)?.includes(fragment)) throw new Error(`Missing required snap metadata in ${path}`);
};
requireMeta("parts/s/3626cs02.dat", "SNAP_CYL [gender=F]");
requireMeta("parts/s/973s01.dat", "//Head");
requireMeta("parts/3820.dat", "SNAP_CLP [radius=4]");
requireMeta("parts/10053.dat", "SNAP_CYL [gender=M]");
requireMeta("parts/3841.dat", "SNAP_CYL [gender=M]");

const transforms = prototypeTransforms(prototypeRaw);
const head = transforms.get("3626cpcbe.dat");
const headwear = transforms.get("25409.dat");
const torsoAssembly = transforms.get("973c01.dat");
const legsAssembly = transforms.get("73200b-f1.dat");
if (!head || !headwear || !torsoAssembly || !legsAssembly) throw new Error("Reference family transforms are missing");

const rightHand = ldrawMatrix([23.6904, 26.774, -9.8982, 0.985, 0.1202, -0.1202, -0.17, 0.6964, -0.6964, 0, 0.707, 0.707]);
const handGrip = ldrawMatrix([0, -0.82275, -9.8951, 1, 0, 0, 0, 0.9681, -0.2504, 0, 0.2504, 0.9681]);
const swordGrip = new Matrix4();
// The pickaxe connector is slideable over 70 LDU. Its midpoint gives a stable default hand placement.
const pickaxeGrip = ldrawMatrix([0, 7, 0, -1, 0, 0, 0, -1, 0, 0, 0, 1]);
const snapPlacement = (sourceConnector: Matrix4): number[] => rounded(
  rightHand.clone().multiply(handGrip).multiply(sourceConnector.clone().invert()),
);
const headTransform = rounded(head);
const headwearTransform = rounded(headwear);
const torsoAssemblyTransform = rounded(torsoAssembly);
const legsAssemblyTransform = rounded(legsAssembly);
const headEvidence = ["parts/s/3626cs02.dat", "parts/s/973s01.dat"];

const document = ldrawDigitalConnectivitySchema.parse({
  schemaVersion: 1,
  ticket: "FF-05/FF-16-digital-connectivity",
  generatedAt: "2026-09-27",
  sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
  publishable: false,
  source: {
    repositoryUrl: source.repositoryUrl,
    revision: source.revision,
    licenseId: source.licenseId,
    licenseUrl: source.licenseUrl,
    noticePath: "/licenses/LDCadShadowLibrary-NOTICE.txt",
  },
  sourceFiles: sourceFiles.map((path, index) => ({
    path: `data/vendor/ldcad-shadow/${path}`,
    sha256: sha256(vendorRaw[index]!),
  })),
  referenceAssemblySha256: sha256(prototypeRaw),
  familyProfiles: [
    {
      profileId: "standard-minifig-torso-assembly-v1",
      role: "torsoAssembly",
      placementMode: "prototype-family-origin",
      placementTransformLdu: torsoAssemblyTransform,
      targetSlot: "torsoAssembly",
      eligibility: "official-shortcut-standard-torso-arms-hands",
      evidenceFiles: ["parts/973c01.dat", "parts/s/973s01.dat"],
      note: "Complete official torso shortcuts containing a 973-family torso, both standard arms and two hands share the identity transform of the official 973c01 reference assembly.",
    },
    {
      profileId: "complete-minifig-legs-assembly-v1",
      role: "legsAssembly",
      placementMode: "prototype-family-origin",
      placementTransformLdu: legsAssemblyTransform,
      targetSlot: "legsAssembly",
      eligibility: "official-complete-minifig-hips-legs-title",
      evidenceFiles: ["parts/73200b-f1.dat"],
      note: "Official top-level parts or shortcuts whose own title declares a complete Minifig Hips and Legs assembly share the lower-body origin of the official 73200b-f1 reference assembly.",
    },
  ],
  entries: [
    ...["ff03-head-3626c", "ff03-head-3626cpr0001", "ff03-head-3626cpr0387"].map((componentId) => ({
      componentId,
      role: "head",
      status: "digitally-supported",
      placementMode: "prototype-family-origin",
      placementTransformLdu: headTransform,
      targetSlot: "head",
      evidenceFiles: headEvidence,
      note: "Standard head placement is derived from the official LDraw reference assembly and matching LDCad neck connectors.",
    })),
    ...[
      ["ff03-headwear-10048", "p/stud16.dat"],
      ["ff03-headwear-25409", "p/stud4o.dat"],
      ["ff03-headwear-3901", "parts/3901.dat"],
    ].map(([componentId, evidenceFile]) => ({
      componentId,
      role: "headwear",
      status: "digitally-supported",
      placementMode: "prototype-family-origin",
      placementTransformLdu: headwearTransform,
      targetSlot: "headwear",
      evidenceFiles: [evidenceFile, "parts/s/3626cs02.dat"],
      note: "Standard headwear placement is derived from the official LDraw reference assembly and matching LDCad head/headwear connectors.",
    })),
    {
      componentId: "ff03-torso-3814",
      role: "torsoAssembly",
      status: "blocked",
      placementMode: null,
      placementTransformLdu: null,
      targetSlot: null,
      evidenceFiles: ["parts/s/973s01.dat"],
      reasonCode: "incomplete-sales-assembly",
      note: "The mapped 973.dat file is a torso shell, not the complete Rebrickable sales assembly.",
    },
    {
      componentId: "ff03-hand-10053",
      role: "handAccessory",
      status: "digitally-supported",
      placementMode: "snap-connector",
      placementTransformLdu: snapPlacement(swordGrip),
      targetSlot: "rightHandAccessory",
      evidenceFiles: ["parts/10053.dat", "parts/3820.dat"],
      note: "The radius-4 sword connector is aligned to the radius-4 reference-hand clip.",
    },
    {
      componentId: "ff03-hand-11439",
      role: "handAccessory",
      status: "blocked",
      placementMode: null,
      placementTransformLdu: null,
      targetSlot: null,
      evidenceFiles: [],
      reasonCode: "missing-snap-metadata",
      note: "The pinned LDCad Shadow Library revision contains no connection metadata for 11439.dat.",
    },
    {
      componentId: "ff03-hand-3841",
      role: "handAccessory",
      status: "digitally-supported",
      placementMode: "snap-connector",
      placementTransformLdu: snapPlacement(pickaxeGrip),
      targetSlot: "rightHandAccessory",
      evidenceFiles: ["parts/3841.dat", "parts/3820.dat"],
      note: "The midpoint of the slideable radius-4 shaft is aligned to the radius-4 reference-hand clip.",
    },
  ],
  summary: { entryCount: 10, digitallySupportedCount: 8, blockedCount: 2, humanInputRequired: false },
  limitations: [
    "Digital connection metadata supports placement but is not a physical clutch-force or material-stress guarantee.",
    "Only the standard-minifigure subset listed in this artifact is supported.",
    "Part 11439 and the incomplete torso sales assembly remain blocked.",
  ],
});

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  message: "LDraw digital connectivity registry built",
  supported: document.summary.digitallySupportedCount,
  blocked: document.summary.blockedCount,
  revision: document.source.revision,
}));
