import { describe, expect, it } from "vitest";
import { isCompleteMinifigLegsAssembly } from "../../tools/lib/ldraw-legs-assembly.js";

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
    expect(isCompleteMinifigLegsAssembly(source)).toBe(true);
  });

  it.each([
    `0 Minifig Hips
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Leg Right
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Skeleton Leg with Black Foot
0 !LDRAW_ORG Shortcut UPDATE 2026-08`,
    `0 ~Moved to 3815c01
0 !LDRAW_ORG Part UPDATE 2026-08`,
    `0 Minifig Hips and Legs
0 !LDRAW_ORG Subpart UPDATE 2026-08`,
  ])("rejects individual, redirected, or non-top-level geometry", (source) => {
    expect(isCompleteMinifigLegsAssembly(source)).toBe(false);
  });
});
