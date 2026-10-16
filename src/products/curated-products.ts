import type { FigureThemeId } from "../ideas/figure-templates.js";

export type CuratedProduct = {
  id: string;
  type: "set" | "accessory";
  ageGroup: string | null;
  verifiedAt: string;
  themeId?: FigureThemeId;
  setNumber?: string;
  titleKey: string;
  descriptionKey: string;
  imageSrc: string;
  imageAltKey: string;
  imageSourceUrl?: string;
  amazonQuery: string;
  amazonAsin?: string;
  officialUrl?: string;
  accent: "gold" | "red" | "blue" | "green" | "purple";
};

export const CURATED_PRODUCTS: readonly CuratedProduct[] = [
  {
    id: "iconic-pirate-ship",
    type: "set",
    ageGroup: "9+",
    verifiedAt: "2026-10-16",
    themeId: "pirates",
    setNumber: "31387",
    titleKey: "products.pirateShip.title",
    descriptionKey: "products.pirateShip.description",
    imageSrc: "/assets/product-images/sets/31387.png",
    imageAltKey: "products.pirateShip.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/31387_Prod.png",
    amazonQuery: "LEGO 31387 Iconic Pirate Ship",
    officialUrl: "https://www.lego.com/en-de/product/iconic-pirate-ship-31387",
    accent: "gold",
  },
  {
    id: "medieval-horse-knight-castle",
    type: "set",
    ageGroup: "9+",
    verifiedAt: "2026-10-16",
    themeId: "castle",
    setNumber: "31168",
    titleKey: "products.castle.title",
    descriptionKey: "products.castle.description",
    imageSrc: "/assets/product-images/sets/31168.png",
    imageAltKey: "products.castle.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/31168_Prod.png",
    amazonQuery: "LEGO 31168 Medieval Horse Knight Castle",
    officialUrl: "https://www.lego.com/en-de/product/medieval-horse-knight-castle-31168",
    accent: "red",
  },
  {
    id: "space-shuttle",
    type: "set",
    ageGroup: "6+",
    verifiedAt: "2026-10-16",
    themeId: "space",
    setNumber: "31134",
    titleKey: "products.spaceShuttle.title",
    descriptionKey: "products.spaceShuttle.description",
    imageSrc: "/assets/product-images/sets/31134.png",
    imageAltKey: "products.spaceShuttle.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/31134_Prod.png",
    amazonQuery: "LEGO 31134 Space Shuttle",
    amazonAsin: "B0BBRYHTPS",
    officialUrl: "https://www.lego.com/en-de/product/space-shuttle-31134",
    accent: "blue",
  },
  {
    id: "modular-space-station",
    type: "set",
    ageGroup: "7+",
    verifiedAt: "2026-10-16",
    themeId: "space",
    setNumber: "60433",
    titleKey: "products.spaceStation.title",
    descriptionKey: "products.spaceStation.description",
    imageSrc: "/assets/product-images/sets/60433.png",
    imageAltKey: "products.spaceStation.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/60433_Prod.png",
    amazonQuery: "LEGO 60433 Modular Space Station",
    officialUrl: "https://www.lego.com/en-de/product/modular-space-station-60433",
    accent: "blue",
  },
  {
    id: "space-base-rocket-launchpad",
    type: "set",
    ageGroup: "8+",
    verifiedAt: "2026-10-16",
    themeId: "space",
    setNumber: "60434",
    titleKey: "products.spaceBase.title",
    descriptionKey: "products.spaceBase.description",
    imageSrc: "/assets/product-images/sets/60434.png",
    imageAltKey: "products.spaceBase.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/60434_Prod.png",
    amazonQuery: "LEGO 60434 Space Base Rocket Launchpad",
    officialUrl: "https://www.lego.com/en-de/product/space-base-and-rocket-launchpad-60434",
    accent: "blue",
  },
  {
    id: "fire-station-with-fire-truck",
    type: "set",
    ageGroup: "6+",
    verifiedAt: "2026-10-16",
    themeId: "fire-rescue",
    setNumber: "60414",
    titleKey: "products.fireStation.title",
    descriptionKey: "products.fireStation.description",
    imageSrc: "/assets/product-images/sets/60414.png",
    imageAltKey: "products.fireStation.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/60414_Prod.png",
    amazonQuery: "LEGO 60414 Fire Station Fire Truck",
    officialUrl: "https://www.lego.com/en-de/product/fire-station-with-fire-truck-60414",
    accent: "green",
  },
  {
    id: "fire-rescue-boat",
    type: "set",
    ageGroup: "5+",
    verifiedAt: "2026-10-16",
    themeId: "fire-rescue",
    setNumber: "60373",
    titleKey: "products.fireBoat.title",
    descriptionKey: "products.fireBoat.description",
    imageSrc: "/assets/product-images/sets/60373.png",
    imageAltKey: "products.fireBoat.imageAlt",
    imageSourceUrl: "https://www.lego.com/cdn/product-assets/product.img.pri/60373_Prod.png",
    amazonQuery: "LEGO 60373 Fire Rescue Boat",
    officialUrl: "https://www.lego.com/en-de/product/fire-rescue-boat-60373",
    accent: "green",
  },
  {
    id: "minifigure-display-case",
    type: "accessory",
    ageGroup: null,
    verifiedAt: "2026-10-16",
    titleKey: "products.displayCase.title",
    descriptionKey: "products.displayCase.description",
    imageSrc: "/assets/product-images/accessories/display-case.svg",
    imageAltKey: "products.displayCase.imageAlt",
    amazonQuery: "LEGO minifigure display case",
    accent: "purple",
  },
  {
    id: "minifigure-display-base",
    type: "accessory",
    ageGroup: null,
    verifiedAt: "2026-10-16",
    titleKey: "products.displayBase.title",
    descriptionKey: "products.displayBase.description",
    imageSrc: "/assets/product-images/accessories/display-base.svg",
    imageAltKey: "products.displayBase.imageAlt",
    amazonQuery: "LEGO minifigure display base plate",
    accent: "purple",
  },
  {
    id: "minifigure-storage",
    type: "accessory",
    ageGroup: null,
    verifiedAt: "2026-10-16",
    titleKey: "products.storage.title",
    descriptionKey: "products.storage.description",
    imageSrc: "/assets/product-images/accessories/storage-box.svg",
    imageAltKey: "products.storage.imageAlt",
    amazonQuery: "LEGO minifigure storage box",
    accent: "purple",
  },
];

export const productsForTheme = (themeId: FigureThemeId | null): readonly CuratedProduct[] => (
  CURATED_PRODUCTS.filter((product) => product.type === "set" && (!themeId || product.themeId === themeId))
);
