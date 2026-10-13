import { describe, expect, it } from "vitest";
import { amazonSearchLink } from "../../src/procurement/amazon-links.js";

describe("Amazon recommendation links", () => {
  it("adds a valid Associates tag to an allowlisted Amazon search link", () => {
    const link = amazonSearchLink("minifigure display", "figforge-21", "https://www.amazon.de/s");
    expect(link.affiliate).toBe(true);
    expect(link.href).toBe("https://www.amazon.de/s?k=minifigure+display&tag=figforge-21");
  });

  it("falls back safely and never forwards an invalid tag or host", () => {
    const link = amazonSearchLink("storage", "bad tag!", "https://example.com/collect");
    expect(link).toEqual({ href: "https://www.amazon.de/s?k=storage", affiliate: false });
  });
});
