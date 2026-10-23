import { createFigureDocument } from "../figure/figure-document.js";
import type { FigureDocument, FigureDocumentSlot } from "../contracts/figure-document.js";

export type FigureThemeId = "pirates" | "castle" | "space" | "fire-rescue" | "zombies" | "fantasy" | "vikings" | "egypt" | "monsters" | "wildwest";

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
  | "rescue-specialist"
  | "zombie-pirate-captain"
  | "zombie-surgeon"
  | "grim-reaper"
  | "wizard"
  | "dwarf-warrior"
  | "elf-archer"
  | "viking-chieftain"
  | "shieldmaiden"
  | "berserker"
  | "pharaoh"
  | "mummy-warrior"
  | "temple-guard"
  | "witch"
  | "vampire"
  | "werewolf"
  | "sheriff"
  | "outlaw"
  | "cowboy";

export type FigureTemplate = {
  id: FigureTemplateId;
  themeId: FigureThemeId;
  accent: "gold" | "red" | "blue" | "green" | "purple" | "teal" | "orange" | "sand" | "pink" | "brown";
  nameKey: string;
  descriptionKey: string;
  document: FigureDocument;
  previewImageUrl: string;
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
  previewImageUrl: `/assets/figure-previews/${id}.webp`,
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
  createTemplate(
    "zombie-pirate-captain",
    "zombies",
    "purple",
    "Zombie Pirate Captain",
    "ideas.zombiePirate.name",
    "ideas.zombiePirate.description",
    {
      head: "catalog:head:3626bpr0619",
      headwear: "catalog:headwear:2528pr0010",
      torsoAssembly: "catalog:torsoAssembly:84638c06pr0003",
      legsAssembly: "catalog:legsAssembly:970e02",
      handAccessory: "catalog:handAccessory:39802pr0001",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0619.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-2528pr0010.webp",
      "/assets/thumbnails/ldraw-expanded/torso-84638c06pr0003.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970e02.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-39802pr0001.webp",
    ],
  ),
  createTemplate(
    "zombie-surgeon",
    "zombies",
    "purple",
    "Zombie Surgeon",
    "ideas.zombieSurgeon.name",
    "ideas.zombieSurgeon.description",
    {
      head: "catalog:head:3626cpr1735",
      headwear: "catalog:headwear:2645",
      torsoAssembly: "catalog:torsoAssembly:973c27h01pr4199",
      legsAssembly: "catalog:legsAssembly:970c19pat34pr0001",
      handAccessory: "catalog:handAccessory:11601",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626cpr1735.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-2645.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c27h01pr4199.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c19pat34pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-11601.webp",
    ],
  ),
  createTemplate(
    "grim-reaper",
    "zombies",
    "purple",
    "Grim Reaper",
    "ideas.grimReaper.name",
    "ideas.grimReaper.description",
    {
      head: "catalog:head:3626bpr0190",
      headwear: "catalog:headwear:30381",
      torsoAssembly: "catalog:torsoAssembly:973c03h03pr1437",
      legsAssembly: "catalog:legsAssembly:19859pat0007",
      handAccessory: "catalog:handAccessory:98141",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0190.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-30381.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h03pr1437.webp",
      "/assets/thumbnails/ldraw-expanded/legs-19859pat0007.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-98141.webp",
    ],
  ),
  createTemplate(
    "wizard",
    "fantasy",
    "teal",
    "Wizard",
    "ideas.wizard.name",
    "ideas.wizard.description",
    {
      head: "catalog:head:3626bpr0679",
      headwear: "catalog:headwear:6131pr0004",
      torsoAssembly: "catalog:torsoAssembly:973c03h03pr2077",
      legsAssembly: "catalog:legsAssembly:36036",
      handAccessory: "catalog:handAccessory:95049",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0679.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-6131pr0004.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h03pr2077.webp",
      "/assets/thumbnails/ldraw-expanded/legs-36036.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-95049.webp",
    ],
  ),
  createTemplate(
    "dwarf-warrior",
    "fantasy",
    "teal",
    "Dwarf Warrior",
    "ideas.dwarfWarrior.name",
    "ideas.dwarfWarrior.description",
    {
      head: "catalog:head:3626bpr0251",
      headwear: "catalog:headwear:53450",
      torsoAssembly: "catalog:torsoAssembly:973c11h19pr2063",
      legsAssembly: "catalog:legsAssembly:970c07pr0334",
      handAccessory: "catalog:handAccessory:75904pr0002",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0251.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-53450.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c11h19pr2063.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c07pr0334.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-75904pr0002.webp",
    ],
  ),
  createTemplate(
    "elf-archer",
    "fantasy",
    "teal",
    "Elf Archer",
    "ideas.elfArcher.name",
    "ideas.elfArcher.description",
    {
      head: "catalog:head:3626cpr0677",
      headwear: "catalog:headwear:19206pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c20h01pr6141",
      legsAssembly: "catalog:legsAssembly:970c11",
      handAccessory: "catalog:handAccessory:4499",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626cpr0677.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-19206pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c20h01pr6141.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c11.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-4499.webp",
    ],
  ),
  createTemplate(
    "viking-chieftain",
    "vikings",
    "orange",
    "Viking Chieftain",
    "ideas.vikingChief.name",
    "ideas.vikingChief.description",
    {
      head: "catalog:head:3626bpr0649",
      headwear: "catalog:headwear:67037pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c35h01pr6825",
      legsAssembly: "catalog:legsAssembly:970c11pr2550",
      handAccessory: "catalog:handAccessory:95330pr0001",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0649.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-67037pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c35h01pr6825.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c11pr2550.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-95330pr0001.webp",
    ],
  ),
  createTemplate(
    "shieldmaiden",
    "vikings",
    "orange",
    "Shieldmaiden",
    "ideas.shieldmaiden.name",
    "ideas.shieldmaiden.description",
    {
      head: "catalog:head:3626cpr1966",
      headwear: "catalog:headwear:30114",
      torsoAssembly: "catalog:torsoAssembly:973c03h12pr1626",
      legsAssembly: "catalog:legsAssembly:970c07pr0334",
      handAccessory: "catalog:handAccessory:76764",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626cpr1966.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-30114.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h12pr1626.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c07pr0334.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-76764.webp",
    ],
  ),
  createTemplate(
    "berserker",
    "vikings",
    "orange",
    "Berserker",
    "ideas.berserker.name",
    "ideas.berserker.description",
    {
      head: "catalog:head:3626bpr0411",
      headwear: "catalog:headwear:3201",
      torsoAssembly: "catalog:torsoAssembly:973c19h19pr0002",
      legsAssembly: "catalog:legsAssembly:970c19pr2231",
      handAccessory: "catalog:handAccessory:95052",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0411.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-3201.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c19h19pr0002.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c19pr2231.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-95052.webp",
    ],
  ),
  createTemplate(
    "pharaoh",
    "egypt",
    "sand",
    "Pharaoh",
    "ideas.pharaoh.name",
    "ideas.pharaoh.description",
    {
      head: "catalog:head:3626bpr0046",
      headwear: "catalog:headwear:90462pr0004",
      torsoAssembly: "catalog:torsoAssembly:973c01h01pr1648",
      legsAssembly: "catalog:legsAssembly:970c26pr0113",
      handAccessory: "catalog:handAccessory:93252",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0046.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-90462pr0004.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c01h01pr1648.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c26pr0113.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-93252.webp",
    ],
  ),
  createTemplate(
    "mummy-warrior",
    "egypt",
    "sand",
    "Mummy Warrior",
    "ideas.mummyWarrior.name",
    "ideas.mummyWarrior.description",
    {
      head: "catalog:head:3626bpr0755",
      headwear: "catalog:headwear:40235",
      torsoAssembly: "catalog:torsoAssembly:973c14h12pr0780",
      legsAssembly: "catalog:legsAssembly:970c14pr0197",
      handAccessory: "catalog:handAccessory:60752",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0755.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-40235.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c14h12pr0780.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c14pr0197.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-60752.webp",
    ],
  ),
  createTemplate(
    "temple-guard",
    "egypt",
    "sand",
    "Temple Guard",
    "ideas.templeGuard.name",
    "ideas.templeGuard.description",
    {
      head: "catalog:head:3626bpr0758",
      headwear: "catalog:headwear:93249pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c03h03pr1727",
      legsAssembly: "catalog:legsAssembly:970c11",
      handAccessory: "catalog:handAccessory:37341a",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0758.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-93249pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h03pr1727.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c11.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-37341a.webp",
    ],
  ),
  createTemplate(
    "witch",
    "monsters",
    "pink",
    "Witch",
    "ideas.witch.name",
    "ideas.witch.description",
    {
      head: "catalog:head:3626cpr1774",
      headwear: "catalog:headwear:20606pr0007",
      torsoAssembly: "catalog:torsoAssembly:973c03h02pr4191",
      legsAssembly: "catalog:legsAssembly:970c03pr0928",
      handAccessory: "catalog:handAccessory:4332",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626cpr1774.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-20606pr0007.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h02pr4191.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c03pr0928.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-4332.webp",
    ],
  ),
  createTemplate(
    "vampire",
    "monsters",
    "pink",
    "Vampire",
    "ideas.vampire.name",
    "ideas.vampire.description",
    {
      head: "catalog:head:3626bpr0687",
      headwear: "catalog:headwear:42444",
      torsoAssembly: "catalog:torsoAssembly:973c03h27pr1649",
      legsAssembly: "catalog:legsAssembly:36036",
      handAccessory: "catalog:handAccessory:37762",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0687.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-42444.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h27pr1649.webp",
      "/assets/thumbnails/ldraw-expanded/legs-36036.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-37762.webp",
    ],
  ),
  createTemplate(
    "werewolf",
    "monsters",
    "pink",
    "Werewolf",
    "ideas.werewolf.name",
    "ideas.werewolf.description",
    {
      head: "catalog:head:3626bpr0001",
      headwear: "catalog:headwear:11233pr0002",
      torsoAssembly: "catalog:torsoAssembly:973c19h19pr4491",
      legsAssembly: "catalog:legsAssembly:970c19pr2231",
      handAccessory: "catalog:handAccessory:98372pr0002",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0001.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-11233pr0002.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c19h19pr4491.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c19pr2231.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-98372pr0002.webp",
    ],
  ),
  createTemplate(
    "sheriff",
    "wildwest",
    "brown",
    "Sheriff",
    "ideas.sheriff.name",
    "ideas.sheriff.description",
    {
      head: "catalog:head:3626cpr3061",
      headwear: "catalog:headwear:13565pr0001",
      torsoAssembly: "catalog:torsoAssembly:973c08h03pr0161",
      legsAssembly: "catalog:legsAssembly:970c19pr0033",
      handAccessory: "catalog:handAccessory:55707a",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626cpr3061.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-13565pr0001.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c08h03pr0161.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c19pr0033.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-55707a.webp",
    ],
  ),
  createTemplate(
    "outlaw",
    "wildwest",
    "brown",
    "Outlaw",
    "ideas.outlaw.name",
    "ideas.outlaw.description",
    {
      head: "catalog:head:3626bpr0753",
      headwear: "catalog:headwear:2543",
      torsoAssembly: "catalog:torsoAssembly:973c03h03pr0054",
      legsAssembly: "catalog:legsAssembly:970c05pr0033",
      handAccessory: "catalog:handAccessory:2488",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0753.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-2543.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c03h03pr0054.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c05pr0033.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-2488.webp",
    ],
  ),
  createTemplate(
    "cowboy",
    "wildwest",
    "brown",
    "Cowboy",
    "ideas.cowboy.name",
    "ideas.cowboy.description",
    {
      head: "catalog:head:3626bpr0247",
      headwear: "catalog:headwear:3629pr0002",
      torsoAssembly: "catalog:torsoAssembly:973c22h01pr0053",
      legsAssembly: "catalog:legsAssembly:970c12pr0888",
      handAccessory: "catalog:handAccessory:99253",
    },
    [
      "/assets/thumbnails/ldraw-expanded/head-3626bpr0247.webp",
      "/assets/thumbnails/ldraw-expanded/headwear-3629pr0002.webp",
      "/assets/thumbnails/ldraw-expanded/torso-973c22h01pr0053.webp",
      "/assets/thumbnails/ldraw-expanded/legs-970c12pr0888.webp",
      "/assets/thumbnails/ldraw-expanded/handAccessory-99253.webp",
    ],
  ),
] as const;

export const figureTemplateForId = (id: string | null): FigureTemplate | undefined => (
  FIGURE_TEMPLATES.find((template) => template.id === id)
);
