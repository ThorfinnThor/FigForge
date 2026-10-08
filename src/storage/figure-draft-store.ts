import { z } from "zod";
import { figureDocumentSchema, type FigureDocument } from "../contracts/figure-document.js";
import { playgroundLayoutSchema, type PlaygroundLayout } from "../contracts/playground-layout.js";

const DATABASE_NAME = "figforge";
export const FIGURE_STORAGE_VERSION = 3;
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
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion wurde abgebrochen."));
  transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen."));
});

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
    const completion = transactionCompletion(transaction);
    await Promise.all([
      requestResult(transaction.objectStore(DRAFT_STORE_NAME).put(
        figureDocumentSchema.parse(document),
        CURRENT_DRAFT_KEY,
      )),
      completion,
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
    const completion = transactionCompletion(transaction);
    await Promise.all([
      requestResult(transaction.objectStore(COLLECTION_STORE_NAME).put(saved)),
      completion,
    ]);
    return saved;
  } finally {
    database.close();
  }
};

export const deleteSavedFigure = async (id: string): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(COLLECTION_STORE_NAME, "readwrite");
    const completion = transactionCompletion(transaction);
    await Promise.all([
      requestResult(transaction.objectStore(COLLECTION_STORE_NAME).delete(id)),
      completion,
    ]);
  } finally {
    database.close();
  }
};

export const loadCurrentPlaygroundLayout = async (): Promise<PlaygroundLayout | null> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(
      database.transaction(PLAYGROUND_STORE_NAME).objectStore(PLAYGROUND_STORE_NAME).get(CURRENT_PLAYGROUND_KEY),
    );
    return raw === undefined ? null : playgroundLayoutSchema.parse(raw);
  } finally {
    database.close();
  }
};

export const saveCurrentPlaygroundLayout = async (layout: PlaygroundLayout): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PLAYGROUND_STORE_NAME, "readwrite");
    const completion = transactionCompletion(transaction);
    await Promise.all([
      requestResult(transaction.objectStore(PLAYGROUND_STORE_NAME).put(
        playgroundLayoutSchema.parse(layout),
        CURRENT_PLAYGROUND_KEY,
      )),
      completion,
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
    const completion = transactionCompletion(transaction);
    await Promise.all([
      requestResult(transaction.objectStore(DRAFT_STORE_NAME).clear()),
      requestResult(transaction.objectStore(COLLECTION_STORE_NAME).clear()),
      requestResult(transaction.objectStore(PLAYGROUND_STORE_NAME).clear()),
      completion,
    ]);
  } finally {
    database.close();
  }
};
