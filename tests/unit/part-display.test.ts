import { describe, expect, it } from "vitest";
import { partDisplay } from "../../src/catalog/part-display.js";

describe("part card display names", () => {
  it("removes category prefix, trailing print word and bracket notes", () => {
    expect(partDisplay("Minifig Head Smile, Bright Pink Lips Print")).toEqual({
      title: "Smile, Bright Pink Lips",
      plain: false,
      notes: [],
    });
    expect(partDisplay("Minifig Head Kai, Stern Eyebrows, Scar Across Left Eye Print [Blocked Open Stud]")).toEqual({
      title: "Kai, Stern Eyebrows, Scar Across Left Eye",
      plain: false,
      notes: ["Blocked Open Stud"],
    });
    expect(partDisplay("Hair Short, Swept Up with Red Headband Pattern").title)
      .toBe("Hair Short, Swept Up with Red Headband");
  });

  it("marks plain parts and never returns an empty title", () => {
    expect(partDisplay("Homemaker Figure Head [Plain]")).toEqual({
      title: "Homemaker Figure Head",
      plain: true,
      notes: [],
    });
    expect(partDisplay("Minifig Head").title).toBe("Minifig Head");
    expect(partDisplay("Minifig Head Print").title).toBe("Minifig Head Print");
  });

  it("keeps names without a known prefix unchanged apart from capitalisation", () => {
    expect(partDisplay("Torso Jacket, Vest, White Shirt Collar, Blue Tie Print").title)
      .toBe("Torso Jacket, Vest, White Shirt Collar, Blue Tie");
    expect(partDisplay("weapon Sword").title).toBe("Weapon Sword");
  });
});
