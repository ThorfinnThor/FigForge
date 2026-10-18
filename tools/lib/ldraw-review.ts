import { createHash } from "node:crypto";

export const ldrawSourceSha256 = (source: string): string =>
  createHash("sha256").update(source).digest("hex");

/**
 * Rebrickable edits commas in part names without changing the part (for example
 * "Torso Tunic" -> "Torso, Tunic"); audited evidence is keyed by part number, so only
 * casing, whitespace and commas are ignored. Any other wording change still fails.
 */
export const normalizeCatalogEvidenceName = (value: string): string =>
  value.normalize("NFKC").replace(/,/gu, " ").trim().replace(/\s+/gu, " ").toLowerCase();
