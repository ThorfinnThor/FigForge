import { describe, expect, it } from "vitest";
import { isCompleteStandardTorsoAssembly, isCompleteTorsoAssembly } from "../../tools/lib/ldraw-torso-assembly.js";

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

  it("accepts an official shortcut containing a complete dual-mould arm pair", () => {
    expect(isCompleteStandardTorsoAssembly(completeShortcut
      .replace("3818.dat", "16000p01.dat")
      .replace("3819.dat", "16001p01.dat"))).toBe(true);
  });

  it("rejects a mixed standard and dual-mould arm pair", () => {
    expect(isCompleteStandardTorsoAssembly(completeShortcut
      .replace("3818.dat", "16000p01.dat"))).toBe(false);
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

describe("complete special torso assembly detection", () => {
  const shortcut = (references: string[]): string => [
    "0 Complete special torso assembly",
    "0 !LDRAW_ORG Shortcut UPDATE 2025-03",
    ...references.map((reference) => `1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${reference}`),
  ].join("\n");

  it.each([
    ["creature wings", ["973pcr6.dat", "6954p01.dat", "6954p02.dat", "3820.dat", "3820.dat"]],
    ["bird wings", ["973.dat", "11263.dat", "11263.dat"]],
    ["penguin flippers", ["973pys.dat", "24074.dat", "24074.dat"]],
    ["pirate hook", ["973p3k.dat", "3818.dat", "3819.dat", "3820.dat", "2531.dat"]],
    ["mechanical arm", ["973p91.dat", "62691.dat", "3819.dat", "3820.dat"]],
    ["short torso", ["98127pd7f.dat", "16000p04.dat", "16001p04.dat", "3820.dat", "3820.dat"]],
  ])("accepts a complete %s shortcut", (_label, references) => {
    expect(isCompleteTorsoAssembly(shortcut(references))).toBe(true);
  });

  it.each([
    ["single bird wing", ["973.dat", "11263.dat"]],
    ["hook without hand", ["973p3k.dat", "3818.dat", "3819.dat", "2531.dat"]],
    ["mechanical arm without standard arm", ["973p91.dat", "62691.dat", "3820.dat"]],
    ["short torso with mixed arms", ["98127pd7f.dat", "16000p04.dat", "3819.dat", "3820.dat", "3820.dat"]],
  ])("rejects an incomplete %s shortcut", (_label, references) => {
    expect(isCompleteTorsoAssembly(shortcut(references))).toBe(false);
  });
});
