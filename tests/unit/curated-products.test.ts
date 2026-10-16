import { describe, expect, it } from "vitest";
import { CURATED_PRODUCTS, productsForTheme } from "../../src/products/curated-products.js";
import { readFile } from "node:fs/promises";

describe("curated products", () => {
  it("keeps every set tied to a theme, set number, and official LEGO page", () => {
    const sets = CURATED_PRODUCTS.filter((product) => product.type === "set");
    expect(sets.length).toBeGreaterThanOrEqual(4);
    for (const product of sets) {
      expect(product.themeId).toBeTruthy();
      expect(product.setNumber).toMatch(/^\d{5}$/u);
      expect(product.ageGroup).toMatch(/^\d+\+$/u);
      expect(product.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(product.officialUrl).toMatch(/^https:\/\/www\.lego\.com\/en-de\/product\//u);
    }
  });

  it("uses the supplied Amazon ASIN for the space shuttle", () => {
    expect(CURATED_PRODUCTS.find(({ id }) => id === "space-shuttle")?.amazonAsin).toBe("B0BBRYHTPS");
  });

  it("filters recommendations by world", () => {
    expect(productsForTheme("pirates")).toHaveLength(1);
    expect(productsForTheme("space")).toHaveLength(3);
    expect(productsForTheme("fire-rescue")).toHaveLength(2);
    expect(productsForTheme(null)).toHaveLength(7);
  });

  it("includes the verified space-base and fire-boat recommendations", () => {
    expect(CURATED_PRODUCTS.find(({ setNumber }) => setNumber === "60434")?.ageGroup).toBe("8+");
    expect(CURATED_PRODUCTS.find(({ setNumber }) => setNumber === "60373")?.ageGroup).toBe("5+");
  });

  it("offers accessible theme and accessory filters on the products page", async () => {
    const source = await readFile("src/components/ProductsPage.tsx", "utf8");
    expect(source).toContain('type ProductCategory = "all" | FigureThemeId | "accessories"');
    expect(source).toContain('aria-pressed={activeCategory === category}');
    expect(source).toContain('t("products.filters.label")');
  });
});
