import { z } from "zod";
import { figureDocumentSchema, type FigureDocument } from "../contracts/figure-document.js";
import {
  migratePlaygroundLayout,
  playgroundLayoutSchema,
  playgroundStagesSchema,
  type PlaygroundStages,
} from "../contracts/playground-layout.js";

const DATABASE_NAME = "figforge";
export const FIGURE_STORAGE_VERSION = 4;
const DATABASE_VERSION = FIGURE_STORAGE_VERSION;
const DRAFT_STORE_NAME = "figure-drafts";
const COLLECTION_STORE_NAME = "figure-collection";
const PLAYGROUND_STORE_NAME = "playground-layout";
const CURRENT_DRAFT_KEY = "current";
const CURRENT_PLAYGROUND_KEY = "current";

export const savedFigureSchema = z.object({
  id: z.string().min(1).max(120),
  document: figureDocumentSchema,
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

export const saveFigureToCollection = async (document: FigureDocument, id = collectionId()): Promise<SavedFigure> => {
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

export const clearLocalFigureData = async (): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, COLLECTION_STORE_NAME, PLAYGROUND_STORE_NAME],
      "readwrite",
    );
    await committedMutation(transaction, [
      transaction.objectStore(DRAFT_STORE_NAME).clear(),
      transaction.objectStore(COLLECTION_STORE_NAME).clear(),
      transaction.objectStore(PLAYGROUND_STORE_NAME).clear(),
    ]);
  } finally {
    database.close();
  }
};
