/**
 * Google Analytics 4 measurement ID of the site. It is public (it appears in the page source).
 * Empty keeps analytics, the consent banner and the analytics wording of the privacy notice off.
 */
export const DEFAULT_MEASUREMENT_ID = "";

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,14}$/u;

/** The ID to use, or null when none is configured or the value is malformed. */
export const resolveMeasurementId = (override?: string): string | null => {
  const id = (override ?? DEFAULT_MEASUREMENT_ID).trim();
  return MEASUREMENT_ID_PATTERN.test(id) ? id : null;
};
