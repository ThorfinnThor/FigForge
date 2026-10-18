import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("site icons", () => {
  it("publishes Google, browser, Apple, and web app icon metadata", async () => {
    const html = await readFile("index.html", "utf8");
    const manifest = JSON.parse(await readFile("public/site.webmanifest", "utf8")) as {
      icons: Array<{ sizes: string; src: string; type: string }>;
    };

    expect(html).toContain('rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    expect(html).toContain('rel="manifest" href="/site.webmanifest"');
    expect(manifest.icons).toEqual([
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ]);

    for (const [path, size] of [
      ["public/favicon-32x32.png", 32],
      ["public/favicon-48x48.png", 48],
      ["public/apple-touch-icon.png", 180],
      ["public/icons/icon-192.png", 192],
      ["public/icons/icon-512.png", 512],
    ] as const) {
      const metadata = await sharp(path).metadata();
      expect({ width: metadata.width, height: metadata.height, format: metadata.format }).toEqual({
        width: size,
        height: size,
        format: "png",
      });
    }
  });
});
