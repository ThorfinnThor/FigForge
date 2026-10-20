import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { copyTextToClipboard } from "../../src/procurement/clipboard.js";
import { serializeBrickLinkWantedListXml } from "../../src/procurement/shop-export.js";

describe("copying the BrickLink XML", () => {
  it("writes the text and reports success", async () => {
    const written: string[] = [];
    const copied = await copyTextToClipboard("<INVENTORY></INVENTORY>", {
      writeText: (text) => { written.push(text); return Promise.resolve(); },
    });

    expect(copied).toBe(true);
    expect(written).toEqual(["<INVENTORY></INVENTORY>"]);
  });

  it("reports failure when the browser refuses or has no clipboard", async () => {
    expect(await copyTextToClipboard("x", { writeText: () => Promise.reject(new Error("denied")) })).toBe(false);
    expect(await copyTextToClipboard("x", undefined)).toBe(false);
  });

  it("copies the same raw XML that the download contains, tags included", () => {
    const xml = serializeBrickLinkWantedListXml({
      target: "bricklink",
      status: "complete",
      lines: [{ rebrickablePartNum: "30162", bricklinkItemId: "30162", bricklinkColorId: 6, quantity: 1 }],
      blockers: [],
    } as unknown as Parameters<typeof serializeBrickLinkWantedListXml>[0]);

    expect(xml.startsWith("<INVENTORY>")).toBe(true);
    expect(xml).toContain("<ITEMID>30162</ITEMID>");
    expect(xml).toContain("<COLOR>6</COLOR>");
  });

  it("offers the copy button for BrickLink only, using the same data as the download", async () => {
    const source = await readFile("src/components/ShopExportPanel.tsx", "utf8");

    expect(source.match(/copyLabel: t\(/gu)).toHaveLength(1);
    expect(source).toContain('copyLabel: t("shop.bricklink.copy")');
    expect(source).toContain("copyTextToClipboard(target.serialize(target.downloadResult))");
  });
});
