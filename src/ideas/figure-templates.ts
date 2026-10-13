import { createFigureDocument } from "../figure/figure-document.js";
import type { FigureDocument, FigureDocumentSlot } from "../contracts/figure-document.js";

export type FigureTemplateId = "pirate-captain" | "castle-knight" | "space-explorer" | "firefighter";

export type FigureTemplate = {
  id: FigureTemplateId;
  accent: "gold" | "red" | "blue" | "green";
  nameKey: string;
  descriptionKey: string;
  document: FigureDocument;
  thumbnails: readonly string[];
};

const TEMPLATE_UPDATED_AT = "2026-10-13T00:00:00.000Z";

const createTemplate = (
  id: FigureTemplateId,
  accent: FigureTemplate["accent"],
  name: string,
  nameKey: string,
  descriptionKey: string,
  selections: Partial<Record<FigureDocumentSlot, string>>,
  thumbnails: readonly string[],
): FigureTemplate => ({
  id,
  accent,
  nameKey,
  descriptionKey,
  document: createFigureDocument(selections, name, TEMPLATE_UPDATED_AT),
  thumbnails,
});

/** Curated only from entries in the generated, digitally supported LDraw runtime. */
export const FIGURE_TEMPLATES: readonly FigureTemplate[] = [
  createTemplate(
    "pirate-captain",
    "gold",
    "Pirate Captain",
    "ideas.pirate.name",
    "ideas.pirate.description",
    {
      head: "catalog:head:3626bpr0027",
      headwear: "catalog:headwear:2528pr0002",
      torsoAssembly: "catalog:torsoAssembly:973c01h01pr0030",
      legsAssembly: "catalog:legsAssembly:970c01pr0123",
      handAccessory: "catalog:handAccessory:2530",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0027.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-2528pr0002.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c01h01pr0030.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c01pr0123.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-2530.webp",
    ],
  ),
  createTemplate(
    "castle-knight",
    "red",
    "Castle Knight",
    "ideas.knight.name",
    "ideas.knight.description",
    {
      head: "catalog:head:3626bpr0010",
      headwear: "catalog:headwear:3844",
      torsoAssembly: "catalog:torsoAssembly:973c03h01pr0040",
      legsAssembly: "catalog:legsAssembly:970c03pr0154",
      handAccessory: "catalog:handAccessory:3847",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0010.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-3844.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h01pr0040.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c03pr0154.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-3847.webp",
    ],
  ),
  createTemplate(
    "space-explorer",
    "blue",
    "Classic Space Explorer",
    "ideas.space.name",
    "ideas.space.description",
    {
      head: "catalog:head:3626bpr0048",
      headwear: "catalog:headwear:87781",
      torsoAssembly: "catalog:torsoAssembly:973c01h01pr0006",
      legsAssembly: "catalog:legsAssembly:970c27",
      handAccessory: "catalog:handAccessory:30035",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0048.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-87781.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c01h01pr0006.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c27.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-30035.webp",
    ],
  ),
  createTemplate(
    "firefighter",
    "green",
    "Firefighter",
    "ideas.firefighter.name",
    "ideas.firefighter.description",
    {
      head: "catalog:head:3626bpr0001",
      headwear: "catalog:headwear:3834pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c03h01pr0121",
      legsAssembly: "catalog:legsAssembly:970c38pr1598",
      handAccessory: "catalog:handAccessory:39144pr0001",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0001.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-3834pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h01pr0121.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c38pr1598.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-39144pr0001.webp",
    ],
  ),
] as const;

export const figureTemplateForId = (id: string | null): FigureTemplate | undefined => (
  FIGURE_TEMPLATES.find((template) => template.id === id)
);
