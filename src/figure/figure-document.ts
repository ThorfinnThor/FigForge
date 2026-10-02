import {
  FIGURE_DOCUMENT_MAX_BYTES,
  figureDocumentSchema,
  type FigureDocument,
  type FigureDocumentSlot,
} from "../contracts/figure-document.js";

export type FigureSelectionMap = Partial<Record<FigureDocumentSlot, string>>;
export type FigureColorSelectionMap = Partial<Record<FigureDocumentSlot, number>>;

const byteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

export const createFigureDocument = (
  selections: FigureSelectionMap,
  name = "Meine FigForge-Figur",
  updatedAt = new Date().toISOString(),
  colors: FigureColorSelectionMap = {},
): FigureDocument => figureDocumentSchema.parse({
  schemaVersion: 2,
  kind: "figforge-figure",
  name,
  updatedAt,
  selections: (["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"] as const).flatMap((slot) => {
    const componentId = selections[slot];
    return componentId ? [{
      slot,
      componentId,
      ...(colors[slot] === undefined ? {} : { rebrickableColorId: colors[slot] }),
    }] : [];
  }),
});

export const serializeFigureDocument = (document: FigureDocument): string => {
  const serialized = `${JSON.stringify(figureDocumentSchema.parse(document), null, 2)}\n`;
  if (byteLength(serialized) > FIGURE_DOCUMENT_MAX_BYTES) {
    throw new Error("Die Figurdatei überschreitet das 64-KiB-Limit.");
  }
  return serialized;
};

export const parseFigureDocument = (content: string): FigureDocument => {
  if (byteLength(content) > FIGURE_DOCUMENT_MAX_BYTES) {
    throw new Error("Die Figurdatei überschreitet das 64-KiB-Limit.");
  }
  return figureDocumentSchema.parse(JSON.parse(content) as unknown);
};

export const selectionsFromFigureDocument = (
  document: FigureDocument,
  isSupportedComponent: (componentId: string, slot: FigureDocumentSlot) => boolean,
): FigureSelectionMap => Object.fromEntries(
  document.selections
    .filter(({ componentId, slot }) => isSupportedComponent(componentId, slot))
    .map(({ componentId, slot }) => [slot, componentId]),
);

export const colorsFromFigureDocument = (
  document: FigureDocument,
  isSupportedColor: (componentId: string, slot: FigureDocumentSlot, rebrickableColorId: number) => boolean,
): FigureColorSelectionMap => Object.fromEntries(
  document.selections
    .filter((selection) => selection.rebrickableColorId !== undefined
      && isSupportedColor(selection.componentId, selection.slot, selection.rebrickableColorId))
    .map(({ rebrickableColorId, slot }) => [slot, rebrickableColorId]),
);
