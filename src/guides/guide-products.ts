import type { GuideId } from "./guide-content.js";

/**
 * Curated products shown under a guide, by product id. Only guides where a product fits the topic
 * have one; practical guides such as the shop how-tos stay free of ads.
 */
export const GUIDE_PRODUCTS: Readonly<Partial<Record<GuideId, readonly string[]>>> = {
  gift: ["minifigure-display-case", "minifigure-display-base", "minifigure-storage"],
  anatomy: ["iconic-pirate-ship", "medieval-horse-knight-castle", "space-shuttle"],
  profession: ["fire-station-with-fire-truck", "fire-rescue-boat", "modular-space-station"],
};
