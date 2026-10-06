import { createHash } from "node:crypto";

export const ldrawSourceSha256 = (source: string): string =>
  createHash("sha256").update(source).digest("hex");

export const normalizeCatalogEvidenceName = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
