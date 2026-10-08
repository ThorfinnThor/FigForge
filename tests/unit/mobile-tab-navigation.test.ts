import { describe, expect, it } from "vitest";
import { mobileTabForKey } from "../../src/components/mobile-tab-navigation.js";

describe("mobile tab keyboard navigation", () => {
  it("moves in both directions and wraps at the ends", () => {
    expect(mobileTabForKey("parts", "ArrowRight")).toBe("figure");
    expect(mobileTabForKey("figure", "ArrowRight")).toBe("list");
    expect(mobileTabForKey("list", "ArrowRight")).toBe("parts");
    expect(mobileTabForKey("parts", "ArrowLeft")).toBe("list");
  });

  it("supports Home and End without consuming unrelated keys", () => {
    expect(mobileTabForKey("figure", "Home")).toBe("parts");
    expect(mobileTabForKey("parts", "End")).toBe("list");
    expect(mobileTabForKey("parts", "Enter")).toBeNull();
    expect(mobileTabForKey("parts", "Tab")).toBeNull();
  });
});
