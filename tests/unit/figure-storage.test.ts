import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  FIGURE_STORAGE_VERSION,
  savedFigureSchema,
} from "../../src/storage/figure-draft-store.js";
import { createFigureDocument } from "../../src/figure/figure-document.js";

describe("FF-22 local figure storage", () => {
  it("keeps a versioned collection record separate from the current draft", async () => {
    const source = await readFile("src/storage/figure-draft-store.ts", "utf8");
    const document = createFigureDocument({
      head: "ff03-head-3626c",
      torsoAssembly: "catalog:torsoAssembly:37191",
      legsAssembly: "catalog:legsAssembly:970c01",
    }, "Gespeicherte Figur", "2026-10-02T10:00:00.000Z");

    expect(FIGURE_STORAGE_VERSION).toBe(2);
    expect(savedFigureSchema.parse({
      id: "figure-1",
      document,
      createdAt: "2026-10-02T10:00:00.000Z",
      updatedAt: "2026-10-02T10:01:00.000Z",
    }).document).toEqual(document);
    expect(source).toContain('createObjectStore(COLLECTION_STORE_NAME, { keyPath: "id" })');
    expect(source).toContain("Keeping the draft store and key stable");
    expect(source).toContain("clearLocalFigureData");
  });
});
