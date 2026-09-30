import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Matrix4, Vector3 } from "three";
import { ldrawMatrix, type CylinderEvidence } from "./ldraw-placement-candidates.js";

const MIN_HAND_GRIP_RADIUS_LDU = 3.75;
const MAX_HAND_GRIP_RADIUS_LDU = 4.25;
const MIN_HAND_GRIP_LENGTH_LDU = 8;

export const vendoredAccessoryGripFiles = [
  "parts/10169.dat",
  "parts/10170.dat",
  "parts/10172.dat",
  "parts/11156.dat",
  "parts/13793.dat",
  "parts/19118.dat",
  "parts/21459.dat",
  "parts/24324.dat",
  "parts/2614.dat",
  "parts/27150.dat",
  "parts/29109.dat",
  "parts/30035.dat",
  "parts/30092.dat",
  "parts/30148.dat",
  "parts/30162.dat",
  "parts/30304.dat",
  "parts/3899.dat",
  "parts/4341.dat",
  "parts/4360.dat",
  "parts/43887.dat",
  "parts/4628.dat",
  "parts/57467.dat",
  "parts/604549.dat",
  "parts/62885.dat",
  "parts/73117.dat",
  "parts/89801.dat",
  "parts/93092.dat",
  "parts/93252.dat",
  "parts/95049.dat",
  "parts/95050.dat",
  "parts/95053.dat",
  "parts/95054.dat",
  "parts/98338.dat",
  "parts/99253.dat",
  "parts/604548.dat",
] as const;

type SnapCylinderSection = {
  shape: string;
  radiusLdu: number;
  lengthLdu: number;
};

export type LDCadSnapCylinder = {
  gender: "M" | "F";
  center: boolean;
  positionLdu: [number, number, number];
  orientation: [number, number, number, number, number, number, number, number, number];
  sections: SnapCylinderSection[];
  lineNumber: number;
};

const finiteValues = (value: string | undefined, count: number, fallback: number[]): number[] | null => {
  if (value === undefined) return fallback;
  const values = value.trim().split(/\s+/u).map(Number);
  return values.length === count && values.every(Number.isFinite) ? values : null;
};

export function parseLDCadSnapCylinders(source: string): LDCadSnapCylinder[] {
  const cylinders: LDCadSnapCylinder[] = [];
  for (const [lineIndex, line] of source.split(/\r?\n/u).entries()) {
    if (!/^0\s+!LDCAD\s+SNAP_CYL\b/u.test(line.trim())) continue;
    const parameters = new Map<string, string>();
    for (const match of line.matchAll(/\[([A-Za-z]+)=([^\]]*)\]/gu)) {
      parameters.set(match[1]!.toLowerCase(), match[2]!.trim());
    }
    const gender = parameters.get("gender")?.toUpperCase();
    const position = finiteValues(parameters.get("pos"), 3, [0, 0, 0]);
    const orientation = finiteValues(parameters.get("ori"), 9, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const sectionTokens = parameters.get("secs")?.split(/\s+/u) ?? [];
    if ((gender !== "M" && gender !== "F") || !position || !orientation || sectionTokens.length % 3 !== 0) continue;
    const sections: SnapCylinderSection[] = [];
    for (let index = 0; index < sectionTokens.length; index += 3) {
      const radiusLdu = Number(sectionTokens[index + 1]);
      const lengthLdu = Number(sectionTokens[index + 2]);
      if (!Number.isFinite(radiusLdu) || !Number.isFinite(lengthLdu) || radiusLdu <= 0 || lengthLdu <= 0) {
        sections.length = 0;
        break;
      }
      sections.push({ shape: sectionTokens[index]!, radiusLdu, lengthLdu });
    }
    if (sections.length === 0) continue;
    cylinders.push({
      gender,
      center: parameters.get("center")?.toLowerCase() === "true",
      positionLdu: position as [number, number, number],
      orientation: orientation as LDCadSnapCylinder["orientation"],
      sections,
      lineNumber: lineIndex + 1,
    });
  }
  return cylinders;
}

const roundedNumber = (value: number): number => {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const roundedVector = (vector: Vector3): [number, number, number] => [
  roundedNumber(vector.x),
  roundedNumber(vector.y),
  roundedNumber(vector.z),
];
const roundedMatrix = (matrix: Matrix4): number[] => matrix.toArray().map(roundedNumber);

export function handGripEvidenceFromLDCadShadow(
  sourcePath: string,
  source: string,
): CylinderEvidence[] {
  return parseLDCadSnapCylinders(source).flatMap((connector) => {
    // Multi-section profiles can contain only a short radius-4 tip or several
    // independently plausible shafts. Keep this automated path deliberately
    // limited to one documented round bar of hand-grip dimensions.
    if (connector.gender !== "M" || connector.sections.length !== 1) return [];
    const section = connector.sections[0]!;
    if (
      section.shape !== "R"
      || section.radiusLdu < MIN_HAND_GRIP_RADIUS_LDU
      || section.radiusLdu > MAX_HAND_GRIP_RADIUS_LDU
      || section.lengthLdu < MIN_HAND_GRIP_LENGTH_LDU
    ) return [];

    const transform = ldrawMatrix([...connector.positionLdu, ...connector.orientation]);
    const elements = transform.elements;
    const localX = new Vector3(elements[0], elements[1], elements[2]).normalize();
    const localY = new Vector3(elements[4], elements[5], elements[6]).normalize();
    const localZ = new Vector3(elements[8], elements[9], elements[10]).normalize();
    const extentAxis = localY.clone().multiplyScalar(-section.lengthLdu);
    const center = new Vector3(...connector.positionLdu);
    if (!connector.center) center.add(extentAxis.clone().multiplyScalar(0.5));

    // SNAP_CYL sections extend along local -Y. Negating X together with Y keeps
    // the connector basis right-handed for the rigid placement validator.
    const sourceConnector = new Matrix4().makeBasis(
      localX.clone().negate(),
      localY.clone().negate(),
      localZ,
    ).setPosition(center);
    return [{
      primitive: `ldcad-shadow:${sourcePath}#SNAP_CYL:${connector.lineNumber}`,
      radiusLdu: section.radiusLdu,
      lengthLdu: section.lengthLdu,
      centerLdu: roundedVector(center),
      axis: roundedVector(extentAxis),
      sourceConnectorTransformLdu: roundedMatrix(sourceConnector),
    }];
  });
}

export async function collectVendoredLDCadHandGripEvidence(
  vendorRoot: string,
  ldrawFile: string,
): Promise<CylinderEvidence[]> {
  if (!(vendoredAccessoryGripFiles as readonly string[]).includes(ldrawFile)) return [];
  const source = await readFile(resolve(vendorRoot, ldrawFile), "utf8");
  const evidence = handGripEvidenceFromLDCadShadow(ldrawFile, source);
  if (evidence.length !== 1) {
    throw new Error(`Vendored LDCad accessory grip must be unique: ${ldrawFile}`);
  }
  return evidence;
}
