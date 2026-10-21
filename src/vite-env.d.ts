/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional LEGO partner-link template with a `{url}` placeholder; see ADR-012. */
  readonly VITE_LEGO_AFFILIATE_LINK_TEMPLATE?: string;
  /** Optional Google Analytics 4 measurement ID overriding the committed one; see src/consent. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
