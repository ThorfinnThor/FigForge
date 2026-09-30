import { describe, expect, it } from "vitest";
import { ldrawRuntimePackage, ldrawRuntimePackages } from "../../tools/lib/ldraw-runtime.js";

const entry = (role: string, rebrickablePartNum: string, placementTransformLdu: number[], fallback: string | null = null) => ({
  role,
  rebrickablePartNum,
  ldrawFile: `parts/${rebrickablePartNum}.dat`,
  ldrawUpdate: "2026-08",
  modelUrl: `/assets/${rebrickablePartNum}.ldr`,
  thumbnailUrl: `/assets/${rebrickablePartNum}.webp`,
  geometryFallback: fallback ? { kind: fallback } : null,
  placementMode: "fixed",
  placementTransformLdu,
});

describe("LDraw runtime packages", () => {
  it("keeps only the requested role and shares identical placements", () => {
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    const shifted = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, -24, 0];
    const runtime = ldrawRuntimePackage("head", "abc", [
      entry("head", "3626c", identity),
      entry("torsoAssembly", "973c01", identity),
      entry("head", "3626cpr0001", identity, "unprinted-print-parent"),
      entry("head", "3626cpr0002", shifted),
    ]);

    expect(runtime.placements).toEqual([
      { placementMode: "fixed", placementTransformLdu: identity },
      { placementMode: "fixed", placementTransformLdu: shifted },
    ]);
    expect(runtime.entries.map(([partNum, , , , , fallback, placement]) => [partNum, fallback, placement])).toEqual([
      ["3626c", null, 0],
      ["3626cpr0001", "unprinted-print-parent", 0],
      ["3626cpr0002", null, 1],
    ]);
  });

  it("writes one file per builder role", () => {
    expect(ldrawRuntimePackages("abc", []).map(({ file }) => file)).toEqual([
      "head.json",
      "headwear.json",
      "torso-assembly.json",
      "legs-assembly.json",
      "hand-accessory.json",
    ]);
  });
});
