import { describe, expect, it } from "vitest";
import { browserReferencePath, embeddedLdrawName } from "../../tools/lib/ldraw-paths.js";

describe("LDraw dependency paths", () => {
  it.each([
    ["parts/s/28621s01.dat", "parts/s/28621s01.dat"],
    ["p/48/4-4ring3.dat", "p/48/4-4ring3.dat"],
    ["p/8/3-8cylo.dat", "8/3-8cylo.dat"],
    ["p/t04o6250.dat", "t04o6250.dat"],
  ])("packs %s under the cache key expected by Three.js", (path, expected) => {
    expect(embeddedLdrawName(path)).toBe(expected);
  });

  it.each([
    ["parts/s/28621s01.dat", "s/28621s01.dat"],
    ["parts/28621.dat", "28621.dat"],
    ["p/8/3-8cylo.dat", "../p/8/3-8cylo.dat"],
  ])("maps %s to its browser library URL", (path, expected) => {
    expect(browserReferencePath(path)).toBe(expected);
  });
});
