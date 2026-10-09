import type { FigureDocument } from "../contracts/figure-document.js";
import type { PlaygroundStage } from "../contracts/playground-layout.js";
import type { SavedFigure } from "../storage/figure-draft-store.js";
import type { LDrawCatalogRole, LDrawCatalogSelection } from "../scene/types.js";
import {
  builderComponentForId,
  digitalConnectivityForComponent,
  digitallySupportedLDrawEntryForComponent,
  loadCatalogParts,
} from "../components/catalog-workspace-data.js";

export type CollectionFigure = {
  id: string;
  name: string;
  selectedParts: readonly LDrawCatalogSelection[];
};

const LDRAW_ROLES: ReadonlySet<string> = new Set([
  "head",
  "headwear",
  "torsoAssembly",
  "legsAssembly",
  "handAccessory",
]);

const isLDrawRole = (role: string): role is LDrawCatalogRole => LDRAW_ROLES.has(role);

export const ldrawSelectionsForFigureDocument = (
  document: FigureDocument,
): readonly LDrawCatalogSelection[] => document.selections.flatMap(({ componentId, slot }) => {
  if (!isLDrawRole(slot)) return [];
  const component = builderComponentForId(componentId);
  const ldrawEntry = digitallySupportedLDrawEntryForComponent(componentId);
  const connectivity = digitalConnectivityForComponent(componentId);
  if (!component || !ldrawEntry || connectivity?.status !== "digitally-supported") return [];
  return [{
    componentId,
    label: component.name,
    ldrawFile: ldrawEntry.ldrawFile,
    ldrawUpdate: ldrawEntry.ldrawUpdate,
    modelUrl: ldrawEntry.modelUrl,
    placementMode: connectivity.placementMode,
    placementTransformLdu: connectivity.placementTransformLdu,
    rebrickablePartNum: component.rebrickablePartNum,
    role: slot,
  } satisfies LDrawCatalogSelection];
});

export const collectionFiguresForStage = async (
  collection: readonly SavedFigure[],
  stage: PlaygroundStage,
): Promise<readonly CollectionFigure[]> => {
  await loadCatalogParts("all");
  const byId = new Map(collection.map((saved) => [saved.id, saved]));
  return stage.savedFigureIds.flatMap((id) => {
    const saved = byId.get(id);
    return saved ? [{
      id,
      name: saved.document.name,
      selectedParts: ldrawSelectionsForFigureDocument(saved.document),
    }] : [];
  });
};
