import { resolveMeasurementId } from "./measurement-id.js";

/** `VITE_GA_MEASUREMENT_ID` overrides the committed ID at build time (used by the browser tests). */
export const ANALYTICS_ID = resolveMeasurementId(import.meta.env.VITE_GA_MEASUREMENT_ID);
export const ANALYTICS_ENABLED = ANALYTICS_ID !== null;
