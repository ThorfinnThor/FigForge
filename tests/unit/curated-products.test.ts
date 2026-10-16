import { describe, expect, it } from "vitest";
import { CURATED_PRODUCTS, productsForTheme } from "../../src/products/curated-products.js";

describe("curated products", () => {
  it("keeps every set tied to a theme, set number, and official LEGO page", () => {
    const sets = CURATED_PRODUCTS.filter((product) => product.type === "set");
    expect(sets.length).toBeGreaterThanOrEqual(4);
    for (const product of sets) {
      expect(product.themeId).toBeTruthy();
      expect(product.setNumber).toMatch(/^\d{5}$/u);
      expect(product.officialUrl).toMatch(/^https:\/\/www\.lego\.com\/en-de\/product\//u);
    }
  });

  it("uses the supplied Amazon ASIN for the space shuttle", () => {
    expect(CURATED_PRODUCTS.find(({ id }) => id === "space-shuttle")?.amazonAsin).toBe("B0BBRYHTPS");
  });

  it("filters recommendations by world", () => {
    expect(productsForTheme("pirates")).toHaveLength(1);
    expect(productsForTheme("space")).toHaveLength(2);
    expect(productsForTheme(null)).toHaveLength(5);
  });
});
