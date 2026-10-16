import type { FigureThemeId } from "../ideas/figure-templates.js";

export type CuratedProduct = {
  id: string;
  type: "set" | "accessory";
  themeId?: FigureThemeId;
  setNumber?: string;
  titleKey: string;
  descriptionKey: string;
  amazonQuery: string;
  amazonAsin?: string;
  officialUrl?: string;
  accent: "gold" | "red" | "blue" | "green" | "purple";
};

export const CURATED_PRODUCTS: readonly CuratedProduct[] = [
  {
    id: "iconic-pirate-ship",
    type: "set",
    themeId: "pirates",
    setNumber: "31387",
    titleKey: "products.pirateShip.title",
    descriptionKey: "products.pirateShip.description",
    amazonQuery: "LEGO 31387 Iconic Pirate Ship",
    officialUrl: "https://www.lego.com/en-de/product/iconic-pirate-ship-31387",
    accent: "gold",
  },
  {
    id: "medieval-horse-knight-castle",
    type: "set",
    themeId: "castle",
    setNumber: "31168",
    titleKey: "products.castle.title",
    descriptionKey: "products.castle.description",
    amazonQuery: "LEGO 31168 Medieval Horse Knight Castle",
    officialUrl: "https://www.lego.com/en-de/product/medieval-horse-knight-castle-31168",
    accent: "red",
  },
  {
    id: "space-shuttle",
    type: "set",
    themeId: "space",
    setNumber: "31134",
    titleKey: "products.spaceShuttle.title",
    descriptionKey: "products.spaceShuttle.description",
    amazonQuery: "LEGO 31134 Space Shuttle",
    amazonAsin: "B0BBRYHTPS",
    officialUrl: "https://www.lego.com/en-de/product/space-shuttle-31134",
    accent: "blue",
  },
  {
    id: "modular-space-station",
    type: "set",
    themeId: "space",
    setNumber: "60433",
    titleKey: "products.spaceStation.title",
    descriptionKey: "products.spaceStation.description",
    amazonQuery: "LEGO 60433 Modular Space Station",
    officialUrl: "https://www.lego.com/en-de/product/modular-space-station-60433",
    accent: "blue",
  },
  {
    id: "fire-station-with-fire-truck",
    type: "set",
    themeId: "fire-rescue",
    setNumber: "60414",
    titleKey: "products.fireStation.title",
    descriptionKey: "products.fireStation.description",
    amazonQuery: "LEGO 60414 Fire Station Fire Truck",
    officialUrl: "https://www.lego.com/en-de/product/fire-station-with-fire-truck-60414",
    accent: "green",
  },
  {
    id: "minifigure-display-case",
    type: "accessory",
    titleKey: "products.displayCase.title",
    descriptionKey: "products.displayCase.description",
    amazonQuery: "LEGO minifigure display case",
    accent: "purple",
  },
  {
    id: "minifigure-display-base",
    type: "accessory",
    titleKey: "products.displayBase.title",
    descriptionKey: "products.displayBase.description",
    amazonQuery: "LEGO minifigure display base plate",
    accent: "purple",
  },
  {
    id: "minifigure-storage",
    type: "accessory",
    titleKey: "products.storage.title",
    descriptionKey: "products.storage.description",
    amazonQuery: "LEGO minifigure storage box",
    accent: "purple",
  },
];

export const productsForTheme = (themeId: FigureThemeId | null): readonly CuratedProduct[] => (
  CURATED_PRODUCTS.filter((product) => product.type === "set" && (!themeId || product.themeId === themeId))
);
