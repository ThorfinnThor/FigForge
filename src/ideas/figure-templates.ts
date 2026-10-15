import { createFigureDocument } from "../figure/figure-document.js";
import type { FigureDocument, FigureDocumentSlot } from "../contracts/figure-document.js";

export type FigureThemeId = "pirates" | "castle" | "space" | "fire-rescue";

export type FigureTemplateId =
  | "pirate-captain"
  | "pirate-deckhand"
  | "pirate-lookout"
  | "castle-knight"
  | "castle-guard"
  | "forest-scout"
  | "space-explorer"
  | "space-pilot"
  | "space-robot-engineer"
  | "firefighter"
  | "fire-chief"
  | "rescue-specialist";

export type FigureTemplate = {
  id: FigureTemplateId;
  themeId: FigureThemeId;
  accent: "gold" | "red" | "blue" | "green";
  nameKey: string;
  descriptionKey: string;
  document: FigureDocument;
  thumbnails: readonly string[];
};

const TEMPLATE_UPDATED_AT = "2026-10-13T00:00:00.000Z";

const createTemplate = (
  id: FigureTemplateId,
  themeId: FigureThemeId,
  accent: FigureTemplate["accent"],
  name: string,
  nameKey: string,
  descriptionKey: string,
  selections: Partial<Record<FigureDocumentSlot, string>>,
  thumbnails: readonly string[],
): FigureTemplate => ({
  id,
  themeId,
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
    "pirates",
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
    "pirate-deckhand",
    "pirates",
    "gold",
    "Pirate Deckhand",
    "ideas.pirateDeckhand.name",
    "ideas.pirateDeckhand.description",
    {
      head: "catalog:head:3626bpr0011",
      headwear: "catalog:headwear:2544",
      torsoAssembly: "catalog:torsoAssembly:973c01h01pr1440",
      legsAssembly: "catalog:legsAssembly:970c07",
      handAccessory: "catalog:handAccessory:64644",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0011.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-2544.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c01h01pr1440.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c07.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-64644.webp",
    ],
  ),
  createTemplate(
    "pirate-lookout",
    "pirates",
    "gold",
    "Pirate Lookout",
    "ideas.pirateLookout.name",
    "ideas.pirateLookout.description",
    {
      head: "catalog:head:3626bpr0298",
      headwear: "catalog:headwear:93557pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c05h01pr1445",
      legsAssembly: "catalog:legsAssembly:970c28",
      handAccessory: "catalog:handAccessory:30162",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0298.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-93557pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c05h01pr1445.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c28.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-30162.webp",
    ],
  ),
  createTemplate(
    "castle-knight",
    "castle",
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
    "castle-guard",
    "castle",
    "red",
    "Royal Castle Guard",
    "ideas.castleGuard.name",
    "ideas.castleGuard.description",
    {
      head: "catalog:head:3626bpr0411",
      headwear: "catalog:headwear:4503",
      torsoAssembly: "catalog:torsoAssembly:973c27h01pr0010",
      legsAssembly: "catalog:legsAssembly:970c22",
      handAccessory: "catalog:handAccessory:3848",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0411.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-4503.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c27h01pr0010.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c22.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-3848.webp",
    ],
  ),
  createTemplate(
    "forest-scout",
    "castle",
    "red",
    "Forest Scout",
    "ideas.forestScout.name",
    "ideas.forestScout.description",
    {
      head: "catalog:head:3626bpr9953",
      headwear: "catalog:headwear:4506",
      torsoAssembly: "catalog:torsoAssembly:973c22h01pr6191",
      legsAssembly: "catalog:legsAssembly:970c31",
      handAccessory: "catalog:handAccessory:4499",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr9953.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-4506.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c22h01pr6191.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c31.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-4499.webp",
    ],
  ),
  createTemplate(
    "space-explorer",
    "space",
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
    "space-pilot",
    "space",
    "blue",
    "Space Pilot",
    "ideas.spacePilot.name",
    "ideas.spacePilot.description",
    {
      head: "catalog:head:3626bpr0008",
      headwear: "catalog:headwear:10907",
      torsoAssembly: "catalog:torsoAssembly:973c27h27pr0176",
      legsAssembly: "catalog:legsAssembly:970c27",
      handAccessory: "catalog:handAccessory:30304",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0008.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-10907.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c27h27pr0176.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c27.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-30304.webp",
    ],
  ),
  createTemplate(
    "space-robot-engineer",
    "space",
    "blue",
    "Space Robot Engineer",
    "ideas.spaceRobot.name",
    "ideas.spaceRobot.description",
    {
      head: "catalog:head:3626bpr0023",
      headwear: "catalog:headwear:22380",
      torsoAssembly: "catalog:torsoAssembly:973c03h22pr0063",
      legsAssembly: "catalog:legsAssembly:970c22pr0019",
      handAccessory: "catalog:handAccessory:4006",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0023.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-22380.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h22pr0063.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c22pr0019.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-4006.webp",
    ],
  ),
  createTemplate(
    "firefighter",
    "fire-rescue",
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
  createTemplate(
    "fire-chief",
    "fire-rescue",
    "green",
    "Fire Chief",
    "ideas.fireChief.name",
    "ideas.fireChief.description",
    {
      head: "catalog:head:3626bpr0038",
      headwear: "catalog:headwear:3834pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c03h01pr1187",
      legsAssembly: "catalog:legsAssembly:970c03",
      handAccessory: "catalog:handAccessory:3962b",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0038.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-3834pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h01pr1187.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c03.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-3962b.webp",
    ],
  ),
  createTemplate(
    "rescue-specialist",
    "fire-rescue",
    "green",
    "Rescue Specialist",
    "ideas.rescueSpecialist.name",
    "ideas.rescueSpecialist.description",
    {
      head: "catalog:head:3626bpr0037",
      headwear: "catalog:headwear:4485pr0003",
      torsoAssembly: "catalog:torsoAssembly:973c27h01pr0040",
      legsAssembly: "catalog:legsAssembly:970c12",
      handAccessory: "catalog:handAccessory:39802pr0001",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0037.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-4485pr0003.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c27h01pr0040.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c12.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-39802pr0001.webp",
    ],
  ),
] as const;

export const figureTemplateForId = (id: string | null): FigureTemplate | undefined => (
  FIGURE_TEMPLATES.find((template) => template.id === id)
);
