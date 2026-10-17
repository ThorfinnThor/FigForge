import { FIGURE_TEMPLATES } from "../ideas/figure-templates.js";
import { createFigureDocument, type FigureSelectionMap } from "./figure-document.js";
import type { FigureDocument } from "../contracts/figure-document.js";

/**
 * The figure a first-time visitor starts with. It must be a complete template whose
 * components all come from the generated, digitally supported LDraw runtime, so the
 * preview shows a whole figure and a saved draft can always be restored.
 */
export const DEFAULT_FIGURE_TEMPLATE_ID = "pirate-captain";

const defaultTemplate = FIGURE_TEMPLATES.find(({ id }) => id === DEFAULT_FIGURE_TEMPLATE_ID);

export const defaultFigureSelections = (): FigureSelectionMap => Object.fromEntries(
  (defaultTemplate?.document.selections ?? []).map(({ slot, componentId }) => [slot, componentId]),
);

/**
 * Earlier versions started from the curated reference variant, whose torso and legs
 * have no digital LDraw support. Drafts that still contain only those components were
 * never edited by the user and are replaced by the current default figure.
 */
export const isUntouchedLegacyDefault = (
  document: FigureDocument,
  legacyComponentIds: ReadonlySet<string>,
): boolean => document.selections.length > 0
  && document.selections.every(({ componentId }) => legacyComponentIds.has(componentId));

export const defaultFigureDocument = (name: string, updatedAt?: string): FigureDocument =>
  createFigureDocument(defaultFigureSelections(), name, updatedAt);
