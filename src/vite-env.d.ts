/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional LEGO partner-link template with a `{url}` placeholder; see ADR-012. */
  readonly VITE_LEGO_AFFILIATE_LINK_TEMPLATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
