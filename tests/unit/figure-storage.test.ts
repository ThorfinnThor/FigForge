import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  FIGURE_STORAGE_VERSION,
  savedFigureSchema,
  transactionCompletion,
} from "../../src/storage/figure-draft-store.js";
import {
  PLAYGROUND_LAYOUT_MAX_FIGURES,
  createEmptyPlaygroundLayout,
  createPlaygroundStage,
  createPlaygroundStages,
  migratePlaygroundLayout,
  playgroundLayoutSchema,
  playgroundStagesSchema,
  reconcilePlaygroundLayout,
  reconcilePlaygroundStages,
} from "../../src/contracts/playground-layout.js";
import { createFigureDocument } from "../../src/figure/figure-document.js";

describe("FF-22 local figure storage", () => {
  const transactionDouble = () => {
    const target = new EventTarget();
    return Object.assign(target, { error: null }) as unknown as IDBTransaction;
  };

  it("does not report a mutation as committed before transaction completion", async () => {
    const transaction = transactionDouble();
    let settled = false;
    const completion = transactionCompletion(transaction).finally(() => { settled = true; });

    await Promise.resolve();
    expect(settled).toBe(false);
    transaction.dispatchEvent(new Event("complete"));
    await expect(completion).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });

  it("rejects a mutation when the transaction aborts after request success", async () => {
    const transaction = transactionDouble();
    const completion = transactionCompletion(transaction);

    transaction.dispatchEvent(new Event("abort"));
    await expect(completion).rejects.toThrow("IndexedDB-Transaktion wurde abgebrochen");
  });

  it("keeps a versioned collection record separate from the current draft", async () => {
    const source = await readFile("src/storage/figure-draft-store.ts", "utf8");
    const document = createFigureDocument({
      head: "ff03-head-3626c",
      torsoAssembly: "catalog:torsoAssembly:37191",
      legsAssembly: "catalog:legsAssembly:970c01",
    }, "Gespeicherte Figur", "2026-10-02T10:00:00.000Z");

    expect(FIGURE_STORAGE_VERSION).toBe(4);
    expect(savedFigureSchema.parse({
      id: "figure-1",
      document,
      createdAt: "2026-10-02T10:00:00.000Z",
      updatedAt: "2026-10-02T10:01:00.000Z",
    }).document).toEqual(document);
    expect(source).toContain('createObjectStore(COLLECTION_STORE_NAME, { keyPath: "id" })');
    expect(source).toContain("Keeping the draft store and key stable");
    expect(source).toContain("createObjectStore(PLAYGROUND_STORE_NAME)");
    expect(source).toContain("clearLocalFigureData");
  });

  it("stores an ordered playground of at most six unique collection references", () => {
    const layout = playgroundLayoutSchema.parse({
      schemaVersion: 1,
      kind: "figforge-playground-layout",
      updatedAt: "2026-10-06T20:00:00.000Z",
      savedFigureIds: ["figure-c", "figure-a", "figure-b"],
    });

    expect(PLAYGROUND_LAYOUT_MAX_FIGURES).toBe(6);
    expect(layout.savedFigureIds).toEqual(["figure-c", "figure-a", "figure-b"]);
    expect(createEmptyPlaygroundLayout("2026-10-06T20:00:00.000Z").savedFigureIds).toEqual([]);
    expect(() => playgroundLayoutSchema.parse({
      ...layout,
      savedFigureIds: ["figure-a", "figure-a"],
    })).toThrow("Playground figures must be unique");
    expect(() => playgroundLayoutSchema.parse({
      ...layout,
      savedFigureIds: Array.from({ length: 7 }, (_, index) => `figure-${index}`),
    })).toThrow();
  });

  it("removes unavailable collection references without changing the remaining order", () => {
    const layout = playgroundLayoutSchema.parse({
      schemaVersion: 1,
      kind: "figforge-playground-layout",
      updatedAt: "2026-10-06T20:00:00.000Z",
      savedFigureIds: ["figure-c", "figure-a", "figure-b"],
    });

    expect(reconcilePlaygroundLayout(
      layout,
      new Set(["figure-b", "figure-c"]),
      "2026-10-06T20:05:00.000Z",
    )).toEqual({
      ...layout,
      updatedAt: "2026-10-06T20:05:00.000Z",
      savedFigureIds: ["figure-c", "figure-b"],
    });
  });

  it("migrates the former single playground into one named stage", () => {
    const legacy = playgroundLayoutSchema.parse({
      schemaVersion: 1,
      kind: "figforge-playground-layout",
      updatedAt: "2026-10-06T20:00:00.000Z",
      savedFigureIds: ["figure-c", "figure-a"],
    });

    expect(migratePlaygroundLayout(legacy, "My stage", "stage-main")).toEqual({
      schemaVersion: 2,
      kind: "figforge-playground-stages",
      updatedAt: legacy.updatedAt,
      activeStageId: "stage-main",
      stages: [{
        id: "stage-main",
        name: "My stage",
        savedFigureIds: ["figure-c", "figure-a"],
      }],
    });
  });

  it("stores several named stages while keeping six figures per stage", () => {
    const pirates = createPlaygroundStage("stage-pirates", "Pirates", ["figure-a", "figure-b"]);
    const clowns = createPlaygroundStage("stage-clowns", "Clowns", ["figure-b", "figure-c"]);
    const playground = createPlaygroundStages(
      [pirates, clowns],
      clowns.id,
      "2026-10-09T18:00:00.000Z",
    );

    expect(playgroundStagesSchema.parse(playground).activeStageId).toBe("stage-clowns");
    expect(reconcilePlaygroundStages(
      playground,
      new Set(["figure-a", "figure-c"]),
      "2026-10-09T18:05:00.000Z",
    ).stages).toEqual([
      { ...pirates, savedFigureIds: ["figure-a"] },
      { ...clowns, savedFigureIds: ["figure-c"] },
    ]);
    expect(() => createPlaygroundStage(
      "stage-too-full",
      "Too full",
      Array.from({ length: 7 }, (_, index) => `figure-${index}`),
    )).toThrow();
  });
});
