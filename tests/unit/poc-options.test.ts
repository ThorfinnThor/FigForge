import { describe, expect, it } from "vitest";
import {
  HEAD_OPTIONS,
  HEADWEAR_OPTIONS,
  LEFT_HAND_OPTIONS,
  RIGHT_HAND_OPTIONS,
} from "../../src/components/figure-poc-options.js";

describe("FF-07 POC options", () => {
  it("exposes the planned candidate counts without duplicate IDs", () => {
    const options = [...HEAD_OPTIONS, ...HEADWEAR_OPTIONS, ...LEFT_HAND_OPTIONS, ...RIGHT_HAND_OPTIONS];
    const ids = options.map(({ id }) => id);

    expect(HEAD_OPTIONS).toHaveLength(5);
    expect(HEADWEAR_OPTIONS).toHaveLength(5);
    expect(LEFT_HAND_OPTIONS).toHaveLength(3);
    expect(RIGHT_HAND_OPTIONS).toHaveLength(3);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps both hand groups on their dedicated anchor slots", () => {
    expect(new Set(LEFT_HAND_OPTIONS.map(({ slot }) => slot))).toEqual(new Set(["leftHandAccessory"]));
    expect(new Set(RIGHT_HAND_OPTIONS.map(({ slot }) => slot))).toEqual(new Set(["rightHandAccessory"]));
  });
});
