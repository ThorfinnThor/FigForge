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
      expect(product.imageSrc).toMatch(/^\/assets\/product-images\/sets\/\d{5}\.png$/u);
      expect(product.imageSourceUrl).toMatch(/^https:\/\/www\.lego\.com\/cdn\/product-assets\//u);
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

  it("provides an accessible image for every curated product", () => {
    for (const product of CURATED_PRODUCTS) {
      expect(product.imageSrc).toMatch(/^\/assets\/product-images\//u);
      expect(product.imageAltKey).toMatch(/^products\..+\.imageAlt$/u);
    }
  });

  it("uses concrete official products and real images for every accessory", () => {
    const accessories = CURATED_PRODUCTS.filter((product) => product.type === "accessory");
    expect(accessories).toHaveLength(3);
    for (const product of accessories) {
      expect(product.productNumber).toMatch(/^\d{7}$/u);
      expect(product.imageSrc).toMatch(/^\/assets\/product-images\/accessories-real\/\d{7}\.jpg$/u);
      expect(product.imageSourceUrl).toMatch(/^https:\/\/www\.lego\.com\/cdn\//u);
      expect(product.officialUrl).toMatch(/^https:\/\/www\.lego\.com\/en-de\/product\//u);
      expect(product.amazonQuery).toContain(product.productNumber);
    }
  });

  it("renders product images lazily instead of number-only placeholders", async () => {
    const source = await readFile("src/components/CuratedProductGrid.tsx", "utf8");
    expect(source).toContain('loading="lazy"');
    expect(source).toContain('alt={t(product.imageAltKey)}');
    expect(source).not.toContain('product.setNumber ?? "◆"');
  });

  it("offers accessible theme and accessory filters on the products page", async () => {
    const source = await readFile("src/components/ProductsPage.tsx", "utf8");
    expect(source).toContain('type ProductCategory = "all" | FigureThemeId | "accessories"');
    expect(source).toContain('aria-pressed={activeCategory === category}');
    expect(source).toContain('t("products.filters.label")');
    expect(source).toContain('href={path("/privacy")}');
    expect(source).not.toContain('className="products-disclosure"');
  });

  it("uses the four-column product layout without forced title hyphenation", async () => {
    const source = await readFile("src/styles/base.css", "utf8");
    const titleStyles = source.slice(
      source.indexOf(".curated-product h3"),
      source.indexOf(".curated-product__body > p"),
    );
    expect(source).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(titleStyles).toContain("hyphens: none;");
    expect(titleStyles).not.toContain("hyphens: auto;");
    expect(titleStyles).not.toContain("overflow-wrap: anywhere;");
  });

  it("routes affiliate and privacy information to a dedicated page", async () => {
    const [appSource, privacySource] = await Promise.all([
      readFile("src/app/App.tsx", "utf8"),
      readFile("src/components/PrivacyPage.tsx", "utf8"),
    ]);
    expect(appSource).toContain('pathname === "/privacy"');
    expect(privacySource).toContain("PRIVACY_SECTIONS[language]");
  });
});
