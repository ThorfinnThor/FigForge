export type MobileTab = "parts" | "figure" | "list";

export const MOBILE_TAB_ORDER: readonly MobileTab[] = ["parts", "figure", "list"];

export const mobileTabForKey = (current: MobileTab, key: string): MobileTab | null => {
  const currentIndex = MOBILE_TAB_ORDER.indexOf(current);
  if (key === "Home") return MOBILE_TAB_ORDER[0] ?? null;
  if (key === "End") return MOBILE_TAB_ORDER.at(-1) ?? null;
  if (key === "ArrowRight") return MOBILE_TAB_ORDER[(currentIndex + 1) % MOBILE_TAB_ORDER.length] ?? null;
  if (key === "ArrowLeft") return MOBILE_TAB_ORDER[(currentIndex - 1 + MOBILE_TAB_ORDER.length) % MOBILE_TAB_ORDER.length] ?? null;
  return null;
};
