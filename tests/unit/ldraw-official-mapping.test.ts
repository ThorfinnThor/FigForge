import { describe, expect, it } from "vitest";
import {
  canonicalOfficialLDrawFile,
  resolveOfficialLDrawMappingFile,
} from "../../tools/lib/ldraw-official-mapping.js";

const files = new Map([
  ["parts/37.dat", "parts/37.dat"],
  ["parts/44658.dat", "parts/44658.dat"],
  ["parts/50003.dat", "parts/50003.dat"],
  ["parts/3626bp82.dat", "parts/3626bp82.dat"],
  ["parts/a.dat", "parts/a.dat"],
  ["parts/b.dat", "parts/b.dat"],
]);
const sources = new Map([
  ["parts/37.dat", "0 ~Moved to 44658\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 44658.dat"],
  ["parts/44658.dat", "0 Minifig Dagger"],
  ["parts/50003.dat", "0 =Minifig Head\n0 !LDRAW_ORG Part Alias UPDATE 2025-09\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 3626bp82.dat"],
  ["parts/3626bp82.dat", "0 Minifig Head"],
  ["parts/a.dat", "0 First variant"],
  ["parts/b.dat", "0 Second variant"],
]);

describe("official LDraw/Rebrickable mapping resolution", () => {
  it("follows official aliases and moved-to wrappers", () => {
    expect(canonicalOfficialLDrawFile("parts/37.dat", sources, files)).toBe("parts/44658.dat");
    expect(canonicalOfficialLDrawFile("parts/50003.dat", sources, files)).toBe("parts/3626bp82.dat");
  });

  it("prefers one explicit Rebrickable keyword target over a filename collision", () => {
    expect(resolveOfficialLDrawMappingFile([
      { file: "parts/37.dat", matchType: "exact-filename" },
      { file: "parts/44658.dat", matchType: "explicit-keyword" },
    ], sources, files)).toBe("parts/44658.dat");
  });

  it("collapses alias-equivalent keyword targets but preserves true ambiguity", () => {
    expect(resolveOfficialLDrawMappingFile([
      { file: "parts/50003.dat", matchType: "explicit-keyword" },
      { file: "parts/3626bp82.dat", matchType: "explicit-keyword" },
    ], sources, files)).toBe("parts/3626bp82.dat");
    expect(resolveOfficialLDrawMappingFile([
      { file: "parts/a.dat", matchType: "explicit-keyword" },
      { file: "parts/b.dat", matchType: "explicit-keyword" },
    ], sources, files)).toBeNull();
  });
});
