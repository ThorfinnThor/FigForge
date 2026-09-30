const firstMeaningfulLine = (source: string): string =>
  source.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? "";

export function isCompleteMinifigLowerBody(source: string): boolean {
  if (!/^0\s+!LDRAW_ORG\s+(?:Part|Shortcut)\b/mu.test(source)) return false;

  const title = firstMeaningfulLine(source);
  return /^0\s+Minifig Hips\b.*\b(?:Legs|Ghost|Skirt|Tentacles|Mermaid Tail|Genie)\b/iu.test(title)
    || /^0\s+Minifig Legs (?:Minecraft Enderman|Bionicle)$/iu.test(title);
}

export type DualMouldReferenceLine = {
  component: "3815b" | "20460bs01" | "20460bs02";
  transform: number[];
};

export type DualMouldReferenceAssembly = {
  lines: DualMouldReferenceLine[];
  shortcutCount: 1;
  agreeingShortcutCount: 1;
};

type TypeOneLine = { reference: string; transform: number[] };

const typeOneLines = (source: string): TypeOneLine[] => source.split(/\r?\n/u).flatMap((line) => {
  if (!line.startsWith("1 ")) return [];
  const fields = line.trim().split(/\s+/u);
  const transform = fields.slice(2, 14).map(Number);
  if (transform.length !== 12 || !transform.every(Number.isFinite)) return [];
  return [{ reference: fields.at(-1)!.replaceAll("\\", "/").toLowerCase(), transform }];
});

const multiplyTransforms = (parent: number[], child: number[]): number[] => {
  const [px, py, pz, pa, pb, pc, pd, pe, pf, pg, ph, pi] = parent;
  const [cx, cy, cz, ca, cb, cc, cd, ce, cf, cg, ch, ci] = child;
  return [
    px! + pa! * cx! + pb! * cy! + pc! * cz!,
    py! + pd! * cx! + pe! * cy! + pf! * cz!,
    pz! + pg! * cx! + ph! * cy! + pi! * cz!,
    pa! * ca! + pb! * cd! + pc! * cg!,
    pa! * cb! + pb! * ce! + pc! * ch!,
    pa! * cc! + pb! * cf! + pc! * ci!,
    pd! * ca! + pe! * cd! + pf! * cg!,
    pd! * cb! + pe! * ce! + pf! * ch!,
    pd! * cc! + pe! * cf! + pf! * ci!,
    pg! * ca! + ph! * cd! + pi! * cg!,
    pg! * cb! + ph! * ce! + pi! * ch!,
    pg! * cc! + ph! * cf! + pi! * ci!,
  ];
};

const exactlyOne = (lines: TypeOneLine[], reference: string): TypeOneLine => {
  const matches = lines.filter((line) => line.reference === reference);
  if (matches.length !== 1) throw new Error(`Expected one official ${reference} reference`);
  return matches[0]!;
};

// Expands the official dual-mould shortcut through its official left/right leg files,
// preserving their transforms while exposing upper and lower halves for separate colours.
export function deriveDualMouldLegReference(
  shortcutSource: string,
  leftLegSource: string,
  rightLegSource: string,
): DualMouldReferenceAssembly {
  const shortcutLines = typeOneLines(shortcutSource);
  const leftLegLines = typeOneLines(leftLegSource);
  const rightLegLines = typeOneLines(rightLegSource);
  if (shortcutLines.length !== 3 || leftLegLines.length !== 2 || rightLegLines.length !== 1) {
    throw new Error("Official dual-mould leg files have an unexpected component count");
  }

  const hips = exactlyOne(shortcutLines, "3815b.dat");
  const leftLeg = exactlyOne(shortcutLines, "20460b.dat");
  const rightLeg = exactlyOne(shortcutLines, "20461b.dat");
  const upper = exactlyOne(leftLegLines, "s/20460bs01.dat");
  const lower = exactlyOne(leftLegLines, "s/20460bs02.dat");
  const rightMirror = exactlyOne(rightLegLines, "20460b.dat");

  return {
    shortcutCount: 1,
    agreeingShortcutCount: 1,
    lines: [
      { component: "3815b", transform: hips.transform },
      { component: "20460bs01", transform: multiplyTransforms(leftLeg.transform, upper.transform) },
      { component: "20460bs02", transform: multiplyTransforms(leftLeg.transform, lower.transform) },
      { component: "20460bs01", transform: multiplyTransforms(multiplyTransforms(rightLeg.transform, rightMirror.transform), upper.transform) },
      { component: "20460bs02", transform: multiplyTransforms(multiplyTransforms(rightLeg.transform, rightMirror.transform), lower.transform) },
    ],
  };
}
