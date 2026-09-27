import { figureDocumentSchema, type FigureDocument } from "../contracts/figure-document.js";

const DATABASE_NAME = "figforge";
const DATABASE_VERSION = 1;
const STORE_NAME = "figure-drafts";
const CURRENT_DRAFT_KEY = "current";

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("IndexedDB konnte nicht geöffnet werden."));
});

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen."));
});

export const loadCurrentFigureDraft = async (): Promise<FigureDocument | null> => {
  const database = await openDatabase();
  try {
    const raw = await requestResult<unknown>(database.transaction(STORE_NAME).objectStore(STORE_NAME).get(CURRENT_DRAFT_KEY));
    return raw === undefined ? null : figureDocumentSchema.parse(raw);
  } finally {
    database.close();
  }
};

export const saveCurrentFigureDraft = async (document: FigureDocument): Promise<void> => {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(
      figureDocumentSchema.parse(document),
      CURRENT_DRAFT_KEY,
    ));
  } finally {
    database.close();
  }
};
