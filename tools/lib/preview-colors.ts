import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { previewColorsSchema, type PreviewColors } from "../../src/contracts/preview-colors.js";
import { shopExportPackageSchema } from "../../src/contracts/shop-export.js";
import { LDRAW_RELEASE, OFFICIAL_LDRAW_PUBLIC_PATH } from "../../src/scene/ldraw-release.js";
import { runtimeFileByRole } from "./ldraw-runtime-packages.js";

export const PREVIEW_COLORS_PATH = "data/generated/preview-colors.json";

type LDrawColor = { name: string; code: number; hex: string; alpha: number; hasMaterialEffect: boolean };

/** Rebrickable and LDraw spell the same colour name differently: Reddish_Brown, Trans_Clear, Grey. */
export const normalizeColorName = (name: string): string => name
  .toLowerCase()
  .replace(/[_-]+/gu, " ")
  .replace(/\bgrey\b/gu, "gray")
  .replace(/\s+/gu, " ")
  .trim();

export function parseLDrawColors(ldConfig: string): LDrawColor[] {
  return ldConfig.split(/\r?\n/u).flatMap((line) => {
    const match = /^0\s+!COLOU?R\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})\s+EDGE\s+\S+(.*)$/u.exec(line);
    if (!match) return [];
    const rest = match[4] ?? "";
    const alpha = /\bALPHA\s+(\d+)\b/u.exec(rest);
    return [{
      name: match[1]!,
      code: Number(match[2]),
      hex: match[3]!.toUpperCase(),
      alpha: alpha ? Number(alpha[1]) / 255 : 1,
      // Glitter and speckle cannot be shown with one flat colour.
      hasMaterialEffect: /\bMATERIAL\b/u.test(rest),
    }];
  });
}

export async function buildPreviewColors(root: string): Promise<PreviewColors> {
  const ldConfig = await readFile(resolve(root, `public${OFFICIAL_LDRAW_PUBLIC_PATH}LDConfig.ldr`), "utf8");
  const ldrawByName = new Map<string, LDrawColor[]>();
  for (const color of parseLDrawColors(ldConfig)) {
    const key = normalizeColorName(color.name);
    ldrawByName.set(key, [...(ldrawByName.get(key) ?? []), color]);
  }

  const shopColors = new Map<number, string>();
  for (const file of Object.values(runtimeFileByRole)) {
    const exportPackage = shopExportPackageSchema.parse(
      JSON.parse(await readFile(resolve(root, `data/generated/shop-export/${file}`), "utf8")) as unknown,
    );
    for (const { colors } of exportPackage.entries) {
      for (const { rebrickableColorId, colorName } of colors) shopColors.set(rebrickableColorId, colorName);
    }
  }

  const colors: PreviewColors["colors"] = [];
  const unmapped: PreviewColors["unmapped"] = [];
  for (const [rebrickableColorId, colorName] of [...shopColors].sort(([left], [right]) => left - right)) {
    const matches = ldrawByName.get(normalizeColorName(colorName)) ?? [];
    const match = matches[0];
    if (!match || matches.length === 0) {
      unmapped.push({ rebrickableColorId, colorName, reason: "no-ldraw-name-match" });
    } else if (matches.length > 1) {
      unmapped.push({ rebrickableColorId, colorName, reason: "ambiguous-ldraw-name" });
    } else if (match.hasMaterialEffect) {
      unmapped.push({ rebrickableColorId, colorName, reason: "ldraw-material-effect" });
    } else {
      colors.push({
        rebrickableColorId,
        colorName,
        ldrawCode: match.code,
        hex: match.hex,
        alpha: Math.round(match.alpha * 1000) / 1000,
      });
    }
  }
  return previewColorsSchema.parse({
    schemaVersion: 1,
    sourcePolicy: "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.",
    ldrawRelease: LDRAW_RELEASE,
    colors,
    unmapped,
  });
}

export async function writePreviewColors(root: string): Promise<{ mapped: number; unmapped: number }> {
  const result = await buildPreviewColors(root);
  await writeFile(resolve(root, PREVIEW_COLORS_PATH), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return { mapped: result.colors.length, unmapped: result.unmapped.length };
}
