import type { CatalogSetSourceLock } from "../../src/contracts/catalog-set-source-lock.js";
import { sourceLockSchema, type SourceLock } from "../../src/contracts/source-lock.js";

export const mergeCatalogSourceLocks = (core: SourceLock, sets: CatalogSetSourceLock): SourceLock =>
  sourceLockSchema.parse({
    ...core,
    updatedAt: core.updatedAt > sets.updatedAt ? core.updatedAt : sets.updatedAt,
    sources: [{
      ...core.sources[0],
      artifacts: [...core.sources[0].artifacts, ...sets.sources[0].artifacts],
    }],
  });
