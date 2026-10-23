import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { hasProjectDefinedPlacement } from "../../src/catalog/project-placement-profiles.js";
import { messages } from "../../src/i18n.js";
import {
  assertValidAccessoryProfileReviews,
  profileMemberPlacementReviews,
  readAccessoryProfileReviews,
  type AccessoryProfileReviews,
} from "../../tools/lib/ldraw-accessory-profile-reviews.js";

const loadProfiles = (): Promise<AccessoryProfileReviews> => readAccessoryProfileReviews(process.cwd());

describe("project-defined accessory profiles (ADR-047)", () => {
  it("expands every family member into an approved placement review", async () => {
    const profiles = await loadProfiles();
    const reviews = profileMemberPlacementReviews(profiles);
    const memberCount = profiles.families.reduce((total, family) => total + family.members.length, 0);
    expect(reviews).toHaveLength(memberCount);
    for (const review of reviews) {
      expect(review.decision).toBe("approved");
      expect(review.ldrawFile.startsWith("parts/")).toBe(true);
    }
  });

  it("rejects a member that appears in two families", async () => {
    const profiles = await loadProfiles();
    const family = profiles.families[0]!;
    const broken: AccessoryProfileReviews = {
      ...profiles,
      families: [family, { ...family, familyId: `${family.familyId}-copy` }],
    };
    expect(() => assertValidAccessoryProfileReviews(broken)).toThrow(/duplicate/iu);
  });

  it("rejects a selected candidate outside the tested range", async () => {
    const profiles = await loadProfiles();
    const family = profiles.families[0]!;
    const broken: AccessoryProfileReviews = {
      ...profiles,
      families: [{ ...family, selectedOrientationIndex: family.orientationCandidatesTested }],
    };
    expect(() => assertValidAccessoryProfileReviews(broken)).toThrow(/invalid/iu);
  });

  it("implements every member in the generated runtime package with a snap-connector placement", async () => {
    const profiles = await loadProfiles();
    const runtime = JSON.parse(await readFile("data/generated/ldraw-runtime/hand-accessory.json", "utf8")) as {
      entries: Array<{ rebrickablePartNum: string; placementMode: string; geometryFallback: unknown }>;
    };
    const byPartNum = new Map(runtime.entries.map((entry) => [entry.rebrickablePartNum, entry]));
    for (const family of profiles.families) {
      for (const member of family.members) {
        const entry = byPartNum.get(member.rebrickablePartNum);
        expect(entry, member.rebrickablePartNum).toBeDefined();
        expect(entry?.placementMode).toBe("snap-connector");
        expect(entry?.geometryFallback).toBeNull();
      }
    }
  });

  it("marks only profile members in the interface", () => {
    expect(hasProjectDefinedPlacement("3846")).toBe(true);
    expect(hasProjectDefinedPlacement("3846PR0001")).toBe(true);
    expect(hasProjectDefinedPlacement("2530")).toBe(false);
  });

  it("explains the marker in both languages", () => {
    for (const language of ["de", "en"] as const) {
      expect(messages[language]["part.projectPlacement"]?.length ?? 0).toBeGreaterThan(20);
    }
  });
});
