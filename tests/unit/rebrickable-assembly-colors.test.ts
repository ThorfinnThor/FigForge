import { describe, expect, it } from "vitest";
import {
  confirmAssemblyColors,
  deriveAssemblyColorCodeTable,
  deriveReferenceAssembly,
  parseAssemblyPartNum,
} from "../../tools/lib/rebrickable-assembly-colors.js";

const knownColors = new Set(["Yellow", "White", "Black", "Light Nougat", "Dark Blue", "Trans-Yellow"]);
const plainParts = [
  { partNum: "973c01h01", name: "Torso, Yellow Arms and Hands [Plain]" },
  { partNum: "973c27h01", name: "Torso, White Arms, Yellow Hands [Plain]" },
  { partNum: "973c03h02", name: "Torso, Black Arms, Light Nougat Hands [PLAIN]" },
  { partNum: "970c05", name: "Hips and Dark Blue Legs" },
  { partNum: "970c68", name: "Hips and Trans-Yellow Legs" },
];

describe("Rebrickable assembly part numbers", () => {
  it("parses torso and legs assembly codes", () => {
    expect(parseAssemblyPartNum("973c27h01")).toEqual({ kind: "torso", armCode: "27", handCode: "01", printed: false });
    expect(parseAssemblyPartNum("973c03h03pr2167")).toEqual({ kind: "torso", armCode: "03", handCode: "03", printed: true });
    expect(parseAssemblyPartNum("970c05")).toEqual({ kind: "legs", legCode: "05", printed: false });
    expect(parseAssemblyPartNum("970c24pat10pr1234")).toEqual({
      kind: "legs",
      legCode: "24",
      bootCode: "10",
      printed: true,
    });
  });

  it.each(["973", "973pr1234", "973g22c01h01", "76382p1t", "970c02pr1099x", "3818"])("ignores %s", (partNum) => {
    expect(parseAssemblyPartNum(partNum)).toBeNull();
  });
});

describe("assembly colour code table", () => {
  it("derives one colour per code from unprinted base assemblies only", () => {
    const table = deriveAssemblyColorCodeTable(
      [...plainParts, { partNum: "973c01h01pr0005", name: "Torso Vest, Red Truck Print, White Arms and Hands" }],
      knownColors,
    );
    expect(Object.fromEntries(table.codes)).toEqual({
      "01": "Yellow",
      "02": "Light Nougat",
      "03": "Black",
      "05": "Dark Blue",
      "27": "White",
      "68": "Trans-Yellow",
    });
    expect(table.evidence.get("01")).toEqual(["973c01h01", "973c27h01"]);
    expect(table.unresolved.size).toBe(0);
  });

  it("refuses codes with contradicting names or unknown colours", () => {
    const table = deriveAssemblyColorCodeTable(
      [
        ...plainParts,
        { partNum: "970c01", name: "Hips and White Legs" },
        { partNum: "970c51", name: "Hips and Chrome Black Legs" },
      ],
      knownColors,
    );
    expect(table.codes.has("01")).toBe(false);
    expect(table.unresolved.get("01")).toEqual({ colorNames: ["White", "Yellow"], reason: "conflicting-names" });
    expect(table.unresolved.get("51")).toEqual({ colorNames: ["Chrome Black"], reason: "unknown-color" });
  });

  it("ignores base assemblies whose names leave the fixed grammar", () => {
    const table = deriveAssemblyColorCodeTable(
      [{ partNum: "973c44h44", name: "Torso, Bright Light Yellow Arms, Hands [PLAIN]" }],
      new Set(["Bright Light Yellow"]),
    );
    expect(table.codes.size).toBe(0);
  });

  it("derives both colours from unprinted dual-mould leg assemblies", () => {
    const table = deriveAssemblyColorCodeTable(
      [{ partNum: "970c05pat03", name: "Hips with Dark Blue Legs and Black Boots Pattern" }],
      knownColors,
    );
    expect(Object.fromEntries(table.codes)).toEqual({ "03": "Black", "05": "Dark Blue" });
    expect(table.evidence.get("03")).toEqual(["970c05pat03"]);
  });
});

describe("per-entry colour confirmation", () => {
  const table = deriveAssemblyColorCodeTable(plainParts, knownColors);

  it("accepts entries whose own name states the coded colours", () => {
    expect(confirmAssemblyColors("973c27h01", "Torso, White Arms, Yellow Hands [Plain]", table))
      .toEqual({ kind: "torso", armColorName: "White", handColorName: "Yellow" });
    expect(confirmAssemblyColors("973c03h03pr2167", "Torso Muscles, White Venom Logo Print, Black Arms, Black Hands", table))
      .toEqual({ kind: "torso", armColorName: "Black", handColorName: "Black" });
    expect(confirmAssemblyColors("973c01h01pr0005", "Torso Vest, Red Truck Print, Yellow Arms and Hands", table))
      .toEqual({ kind: "torso", armColorName: "Yellow", handColorName: "Yellow" });
    expect(confirmAssemblyColors("970c05", "Hips and Dark Blue Legs", table))
      .toEqual({ kind: "legs", legColorName: "Dark Blue" });
    expect(confirmAssemblyColors("970c05pat03pr0001", "Hips with Dark Blue Legs and Black Boots Pattern with Silver Toes Print", table))
      .toEqual({ kind: "legs", legColorName: "Dark Blue", bootColorName: "Black" });
  });

  it.each([
    ["973c03h02pr5547", "Torso Jacket, White Shirt, Blue Tie Print, White Arms, Light Nougat Arms"],
    ["973c03h02", "Torso, Black Arms, Black Hands"],
    ["973c27h01", "Torso, Dark White Arms, Yellow Hands"],
    ["973c99h01", "Torso, Purple Arms, Yellow Hands"],
    ["973c27h01", "Torso, White Arms, Yellow Hands, Black Arms"],
    ["970c05", "Hips and Blue Legs"],
    ["970c05", "Hips and Dark Blue Legs, White Legs Print"],
    ["970c05pat03pr0001", "Hips with Dark Blue Legs and Black Boots Pattern with White Legs Print"],
    ["970c05pat03pr0001", "Hips with Dark Blue Legs and Black Boots Pattern with White Boots Print"],
  ])("blocks %s when the name does not confirm the code", (partNum, name) => {
    expect(confirmAssemblyColors(partNum, name, table)).toBeNull();
  });
});

describe("reference assembly placement", () => {
  const shortcut = (handX: string) => `0 Minifig Torso with Arms and Hands
0 !LDRAW_ORG Shortcut UPDATE 2024-11
1 16 0 0 0 1 0 0 0 1 0 0 0 1 973p1t.dat
1 14 -15.552 9 0 0.985 -0.17 0 0.17 0.985 0 0 0 1 3818.dat
1 14 15.552 9 0 0.985 0.17 0 -0.17 0.985 0 0 0 1 3819.dat
1 14 ${handX} 26.774 -9.898 1 0 0 0 1 0 0 0 1 3820.dat
1 14 23.69 26.774 -9.898 1 0 0 0 1 0 0 0 1 3820.dat`;
  const classes = ["973", "3818", "3819", "3820"];

  it("uses the placement shared by the official shortcuts", () => {
    const reference = deriveReferenceAssembly(
      [...Array.from({ length: 9 }, () => shortcut("-23.69")), shortcut("-23.6904")],
      classes,
    );
    expect(reference.shortcutCount).toBe(10);
    expect(reference.agreeingShortcutCount).toBe(9);
    expect(reference.lines.map(({ component }) => component)).toEqual(["3818", "3819", "3820", "3820", "973"]);
    expect(reference.lines[2]?.transform[0]).toBe(-23.69);
  });

  it("ignores shortcuts with components outside the family", () => {
    const reference = deriveReferenceAssembly([shortcut("-23.69"), `${shortcut("-23.69")}\n1 0 0 0 0 1 0 0 0 1 0 0 0 1 3626b.dat`], classes);
    expect(reference.shortcutCount).toBe(1);
  });

  it("refuses when the shortcuts do not agree", () => {
    expect(() => deriveReferenceAssembly([shortcut("-23.69"), shortcut("-20")], classes)).toThrow();
  });
});
