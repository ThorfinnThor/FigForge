import type { CatalogSetIndex } from "../contracts/catalog-set-index.js";

let catalogSetIndexPromise: Promise<CatalogSetIndex> | undefined;

export const loadCatalogSetIndex = (): Promise<CatalogSetIndex> => {
  catalogSetIndexPromise ??= Promise.all([
    import("../../data/generated/catalog-set-index.json"),
    import("../contracts/catalog-set-index.js"),
  ]).then(([indexModule, contractModule]) =>
    contractModule.catalogSetIndexSchema.parse(indexModule.default));
  return catalogSetIndexPromise;
};
