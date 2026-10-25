import { z } from "zod";
import { figureDocumentSchema, type FigureDocument } from "../contracts/figure-document.js";
import {
  migratePlaygroundLayout,
  playgroundLayoutSchema,
  playgroundStagesSchema,
  type PlaygroundStages,
} from "../contracts/playground-layout.js";
import { partInventorySchema, type PartInventory } from "../contracts/part-inventory.js";

const DATABASE_NAME = "figforge";
export const FIGURE_STORAGE_VERSION = 5;
const DATABASE_VERSION = FIGURE_STORAGE_VERSION;
const DRAFT_STORE_NAME = "figure-drafts";
const COLLECTION_STORE_NAME = "figure-collection";
const PLAYGROUND_STORE_NAME = "playground-layout";
const PART_INVENTORY_STORE_NAME = "part-inventory";
const CURRENT_DRAFT_KEY = "current";
const CURRENT_PLAYGROUND_KEY = "current";
const CURRENT_PART_INVENTORY_KEY = "current";

export const savedFigureSchema = z.object({
  id: z.string().min(1).max(120),
  document: figureDocumentSchema,
  previewImageDataUrl: z.string()
    .max(500_000)
    .regex(/^data:image\/(?:png|webp);base64,/u)
    .optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export type SavedFigure = z.infer<typeof savedFigureSchema>;

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
      database.createObjectStore(DRAFT_STORE_NAME);
    }
    // Version 2 adds the collection without rewriting the existing current draft.
    // Keeping the draft store and key stable is the migration guarantee for v1 data.
    if (!database.objectStoreNames.contains(COLLECTION_STORE_NAME)) {
      database.createObjectStore(COLLECTION_STORE_NAME, { keyPath: "id" });
    }
    // Version 3 stores only ordered collection references for the playground.
    // Saved figure documents remain in the version-2 collection store.
    if (!database.objectStoreNames.contains(PLAYGROUND_STORE_NAME)) {
      database.createObjectStore(PLAYGROUND_STORE_NAME);
    }
    // Version 4 upgrades the value in the existing playground store from one
    // layout to a named-stage collection. The object store itself stays stable.
    if (!database.objectStoreNames.contains(PART_INVENTORY_STORE_NAME)) {
      database.createObjectStore(PART_INVENTORY_STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("IndexedDB konnte nicht geöffnet werden."));
  request.onblocked = () => reject(new Error("IndexedDB-Upgrade wird von einem anderen Tab blockiert."));
});

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen."));
});

export const transactionCompletion = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.addEventListener("complete", () => resolve(), { once: true });
  transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB-Transaktion wurde abgebrochen.")), { once: true });
  transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen.")), { once: true });
});

export const committedMutation = async <T>(
  transaction: IDBTransaction,
  requests: readonly IDBRequest<T>[],
): Promise<void> => {
  const completion = transactionCompletion(transaction);
  await Promise.all([
    ...requests.map(requestResult),
    completion,
  ]);
};

export const loadCurrentFigureDraft = async (): Promise<FigureDocument | null> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(database.transaction(DRAFT_STORE_NAME).objectStore(DRAFT_STORE_NAME).get(CURRENT_DRAFT_KEY));
    return raw === undefined ? null : figureDocumentSchema.parse(raw);
  } finally {
    database.close();
  }
};

export const saveCurrentFigureDraft = async (document: FigureDocument): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    await committedMutation(transaction, [
      transaction.objectStore(DRAFT_STORE_NAME).put(
        figureDocumentSchema.parse(document),
        CURRENT_DRAFT_KEY,
      ),
    ]);
  } finally {
    database.close();
  }
};

export const listSavedFigures = async (): Promise<readonly SavedFigure[]> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown[]>(database.transaction(COLLECTION_STORE_NAME).objectStore(COLLECTION_STORE_NAME).getAll());
    return raw
      .map((entry) => savedFigureSchema.safeParse(entry))
      .filter((result): result is { success: true; data: SavedFigure } => result.success)
      .map(({ data }) => data)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } finally {
    database.close();
  }
};

const collectionId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `figure-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const saveFigureToCollection = async (
  document: FigureDocument,
  id = collectionId(),
  previewImageDataUrl?: string,
): Promise<SavedFigure> => {
  const database = await openDatabase();
  try {
    // Read and write use separate transactions: IndexedDB transactions may become
    // inactive after an awaited request completes.
    const existing = await requestResult<unknown>(
      database.transaction(COLLECTION_STORE_NAME).objectStore(COLLECTION_STORE_NAME).get(id),
    );
    const now = new Date().toISOString();
    const previous = existing === undefined ? undefined : savedFigureSchema.parse(existing);
    const saved = savedFigureSchema.parse({
      id,
      document: figureDocumentSchema.parse({ ...document, updatedAt: now }),
      previewImageDataUrl: previewImageDataUrl ?? previous?.previewImageDataUrl,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    });
    const transaction = database.transaction(COLLECTION_STORE_NAME, "readwrite");
    await committedMutation(transaction, [transaction.objectStore(COLLECTION_STORE_NAME).put(saved)]);
    return saved;
  } finally {
    database.close();
  }
};

export const updateSavedFigurePreview = async (
  id: string,
  previewImageDataUrl: string,
): Promise<SavedFigure> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(
      database.transaction(COLLECTION_STORE_NAME).objectStore(COLLECTION_STORE_NAME).get(id),
    );
    if (raw === undefined) throw new Error("Saved figure not found");
    const saved = savedFigureSchema.parse({
      ...savedFigureSchema.parse(raw),
      previewImageDataUrl,
    });
    const transaction = database.transaction(COLLECTION_STORE_NAME, "readwrite");
    await committedMutation(transaction, [transaction.objectStore(COLLECTION_STORE_NAME).put(saved)]);
    return saved;
  } finally {
    database.close();
  }
};

/**
 * Renames a saved figure in place. Only the name changes: the save date, the parts and the
 * preview stay as they were, so the figure keeps its position and its stages.
 */
export const renameSavedFigure = async (id: string, name: string): Promise<SavedFigure> => {
  const database = await openDatabase();
  try {
    const existing = await requestResult<unknown>(
      database.transaction(COLLECTION_STORE_NAME).objectStore(COLLECTION_STORE_NAME).get(id),
    );
    if (existing === undefined) throw new Error("Saved figure not found");
    const previous = savedFigureSchema.parse(existing);
    const renamed = savedFigureSchema.parse({
      ...previous,
      document: figureDocumentSchema.parse({ ...previous.document, name }),
    });
    const transaction = database.transaction(COLLECTION_STORE_NAME, "readwrite");
    await committedMutation(transaction, [transaction.objectStore(COLLECTION_STORE_NAME).put(renamed)]);
    return renamed;
  } finally {
    database.close();
  }
};

export const deleteSavedFigure = async (id: string): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(COLLECTION_STORE_NAME, "readwrite");
    await committedMutation(transaction, [transaction.objectStore(COLLECTION_STORE_NAME).delete(id)]);
  } finally {
    database.close();
  }
};

export const loadCurrentPlaygroundStages = async (
  migratedStageName = "My stage",
): Promise<PlaygroundStages | null> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(
      database.transaction(PLAYGROUND_STORE_NAME).objectStore(PLAYGROUND_STORE_NAME).get(CURRENT_PLAYGROUND_KEY),
    );
    if (raw === undefined) return null;
    const current = playgroundStagesSchema.safeParse(raw);
    if (current.success) return current.data;
    const migrated = migratePlaygroundLayout(playgroundLayoutSchema.parse(raw), migratedStageName);
    const transaction = database.transaction(PLAYGROUND_STORE_NAME, "readwrite");
    await committedMutation(transaction, [
      transaction.objectStore(PLAYGROUND_STORE_NAME).put(migrated, CURRENT_PLAYGROUND_KEY),
    ]);
    return migrated;
  } finally {
    database.close();
  }
};

export const saveCurrentPlaygroundStages = async (playground: PlaygroundStages): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PLAYGROUND_STORE_NAME, "readwrite");
    await committedMutation(transaction, [
      transaction.objectStore(PLAYGROUND_STORE_NAME).put(
        playgroundStagesSchema.parse(playground),
        CURRENT_PLAYGROUND_KEY,
      ),
    ]);
  } finally {
    database.close();
  }
};

export const loadPartInventory = async (): Promise<PartInventory | null> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(database.transaction(PART_INVENTORY_STORE_NAME)
      .objectStore(PART_INVENTORY_STORE_NAME).get(CURRENT_PART_INVENTORY_KEY));
    return raw === undefined ? null : partInventorySchema.parse(raw);
  } finally {
    database.close();
  }
};

export const savePartInventory = async (inventory: PartInventory): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PART_INVENTORY_STORE_NAME, "readwrite");
    await committedMutation(transaction, [transaction.objectStore(PART_INVENTORY_STORE_NAME)
      .put(partInventorySchema.parse(inventory), CURRENT_PART_INVENTORY_KEY)]);
  } finally {
    database.close();
  }
};

export const clearLocalFigureData = async (): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, COLLECTION_STORE_NAME, PLAYGROUND_STORE_NAME, PART_INVENTORY_STORE_NAME],
      "readwrite",
    );
    await committedMutation(transaction, [
      transaction.objectStore(DRAFT_STORE_NAME).clear(),
      transaction.objectStore(COLLECTION_STORE_NAME).clear(),
      transaction.objectStore(PLAYGROUND_STORE_NAME).clear(),
      transaction.objectStore(PART_INVENTORY_STORE_NAME).clear(),
    ]);
  } finally {
    database.close();
  }
};
