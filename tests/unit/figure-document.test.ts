import { describe, expect, it } from "vitest";
import {
  createFigureDocument,
  parseFigureDocument,
  selectionsFromFigureDocument,
  serializeFigureDocument,
} from "../../src/figure/figure-document.js";

describe("FF-22/FF-23 local figure document", () => {
  it("round-trips all five versioned builder slots and component IDs", () => {
    const source = createFigureDocument({
      head: "ff03-head-3626c",
      headwear: "ff03-headwear-10048",
      torsoAssembly: "catalog:torsoAssembly:37191",
      legsAssembly: "catalog:legsAssembly:970c01",
      handAccessory: "ff03-hand-10053",
    }, "Testfigur", "2026-09-27T20:00:00.000Z");

    expect(parseFigureDocument(serializeFigureDocument(source))).toEqual(source);
    expect(source.selections.map(({ slot }) => slot)).toEqual([
      "head",
      "headwear",
      "torsoAssembly",
      "legsAssembly",
      "handAccessory",
    ]);
  });

  it("continues to accept existing three-slot version-1 documents", () => {
    const existing = JSON.stringify({
      schemaVersion: 1,
      kind: "figforge-figure",
      name: "Bestehende Figur",
      updatedAt: "2026-09-27T20:00:00.000Z",
      selections: [
        { slot: "head", componentId: "ff03-head-3626c" },
        { slot: "headwear", componentId: "ff03-headwear-10048" },
        { slot: "handAccessory", componentId: "ff03-hand-10053" },
      ],
    });

    expect(parseFigureDocument(existing).selections).toHaveLength(3);
  });

  it("persists expanded hand accessories selected from the catalog", () => {
    const source = createFigureDocument({
      handAccessory: "catalog:handAccessory:21459",
    }, "Katana", "2026-09-30T13:00:00.000Z");

    expect(parseFigureDocument(serializeFigureDocument(source))).toEqual(source);
  });

  it("rejects duplicate slots, unknown fields and oversized input", () => {
    expect(() => parseFigureDocument(JSON.stringify({
      schemaVersion: 1,
      kind: "figforge-figure",
      name: "Ungültig",
      updatedAt: "2026-09-27T20:00:00.000Z",
      selections: [
        { slot: "head", componentId: "ff03-head-3626c" },
        { slot: "head", componentId: "ff03-head-3626cpr0001" },
      ],
      modelUrl: "https://example.invalid/model.dat",
    }))).toThrow();
    expect(() => parseFigureDocument(" ".repeat(65 * 1024))).toThrow(/64-KiB/u);
  });

  it("does not invent replacements for unsupported imported IDs", () => {
    const document = createFigureDocument({
      head: "ff03-head-3626c",
      handAccessory: "ff03-hand-11439",
    }, "Teilweise unbekannt", "2026-09-27T20:00:00.000Z");
    const restored = selectionsFromFigureDocument(
      document,
      (componentId) => componentId !== "ff03-hand-11439",
    );

    expect(restored).toEqual({ head: "ff03-head-3626c" });
    expect(Object.keys(restored)).toHaveLength(1);
  });
});
