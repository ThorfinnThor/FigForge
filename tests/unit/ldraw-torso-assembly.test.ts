import { describe, expect, it } from "vitest";
import { isCompleteStandardTorsoAssembly } from "../../tools/lib/ldraw-torso-assembly.js";

const completeShortcut = `0 Minifig Torso with Arms and Hands
0 !LDRAW_ORG Shortcut UPDATE 2024-11
1 16 0 0 0 1 0 0 0 1 0 0 0 1 973p1t.dat
1 14 -15.552 9 0 0.985 -0.17 0 0.17 0.985 0 0 0 1 3818.dat
1 14 15.552 9 0 0.985 0.17 0 -0.17 0.985 0 0 0 1 3819.dat
1 14 -23.69 26.774 -9.898 1 0 0 0 1 0 0 0 1 3820.dat
1 14 23.69 26.774 -9.898 1 0 0 0 1 0 0 0 1 3820.dat`;

describe("complete standard torso assembly detection", () => {
  it("accepts an official shortcut containing torso, both arms and two hands", () => {
    expect(isCompleteStandardTorsoAssembly(completeShortcut)).toBe(true);
  });

  it.each([
    completeShortcut.replace("Shortcut", "Part"),
    completeShortcut.replace(/^.*3818\.dat$/mu, ""),
    completeShortcut.replace(/^.*3819\.dat$/mu, ""),
    completeShortcut.replace(/^.*3820\.dat$/mu, ""),
    completeShortcut.replace(/^.*973p1t\.dat$/mu, ""),
  ])("rejects incomplete or non-shortcut geometry", (source) => {
    expect(isCompleteStandardTorsoAssembly(source)).toBe(false);
  });
});
