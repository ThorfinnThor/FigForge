import { describe, expect, it } from "vitest";
import { deriveDualMouldLegReference, isCompleteMinifigLowerBody } from "../../tools/lib/ldraw-legs-assembly.js";

describe("complete minifig legs assembly detection", () => {
  it.each([
    `0 Minifig Hips and Legs with Belt Pattern
0 !LDRAW_ORG Shortcut UPDATE 2026-08
1 16 0 0 0 1 0 0 0 1 0 0 0 1 3815b.dat`,
    `0 Minifig Hips and Legs Short with Yellow Feet Pattern
0 !LDRAW_ORG Part UPDATE 2026-08
1 16 0 0 0 1 0 0 0 1 0 0 0 1 s\\16709s05.dat`,
    `0 Minifig Hips with Spring Legs (Straight)
0 !LDRAW_ORG Shortcut UPDATE 2026-08
1 16 0 0 0 1 0 0 0 1 0 0 0 1 43221.dat`,
  ])("accepts an official complete lower-body file", (source) => {
    expect(isCompleteMinifigLowerBody(source)).toBe(true);
  });

  it.each([
    "Minifig Hips Ghost with Dark Blue Pattern",
    "Minifig Hips and Skirt with Black Folds Pattern",
    "Minifig Hips with Tentacles",
    "Minifig Hips Mermaid Tail Sitting",
    "Minifig Hips Genie with Red Belt Pattern",
  ])("accepts an official complete special lower-body family: %s", (title) => {
    const source = `0 ${title}\n0 !LDRAW_ORG Part UPDATE 2026-08`;
    expect(isCompleteMinifigLowerBody(source)).toBe(true);
  });

  it.each([
    "Minifig Legs Minecraft Enderman",
    "Minifig Legs Bionicle",
  ])("accepts an official complete stud-connected legs family: %s", (title) => {
    const source = `0 ${title}\n0 !LDRAW_ORG Part UPDATE 2026-08`;
    expect(isCompleteMinifigLowerBody(source)).toBe(true);
  });

  it.each([
    `0 Minifig Hips
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Leg Right
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Skeleton Leg with Black Foot
0 !LDRAW_ORG Shortcut UPDATE 2026-08`,
    `0 Minifig Mechanical Legs
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Martian Legs
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Legs SW Super Battle Droid
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 ~Moved to 3815c01
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Hips and Legs
0 !LDRAW_ORG Subpart UPDATE 2026-08`,
  ])("rejects individual, redirected, or non-top-level geometry", (source) => {
    expect(isCompleteMinifigLowerBody(source)).toBe(false);
  });
});

describe("dual-mould leg reference expansion", () => {
  it("preserves the official hip, left-leg and mirrored right-leg transforms", () => {
    const reference = deriveDualMouldLegReference(
      `0 ~Minifig Hips and Legs Dual Mould
1 16 0 0 0 1 0 0 0 1 0 0 0 1 3815b.dat
1 16 0 12 0 1 0 0 0 1 0 0 0 1 20460b.dat
1 16 0 12 0 1 0 0 0 1 0 0 0 1 20461b.dat`,
      `0 ~Minifig Leg Left Dual Mould
1 16 0 0 0 1 0 0 0 1 0 0 0 1 s\\20460bs01.dat
1 16 0 0 0 1 0 0 0 1 0 0 0 1 s\\20460bs02.dat`,
      `0 ~Minifig Leg Right Dual Mould
1 16 0 0 0 -1 0 0 0 1 0 0 0 1 20460b.dat`,
    );

    expect(reference.lines.map(({ component }) => component)).toEqual([
      "3815b",
      "20460bs01",
      "20460bs02",
      "20460bs01",
      "20460bs02",
    ]);
    expect(reference.lines[1]?.transform).toEqual([0, 12, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(reference.lines[3]?.transform).toEqual([0, 12, 0, -1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});
