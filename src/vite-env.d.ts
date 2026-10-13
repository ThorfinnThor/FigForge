/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional LEGO partner-link template with a `{url}` placeholder; see ADR-012. */
  readonly VITE_LEGO_AFFILIATE_LINK_TEMPLATE?: string;
  /** Amazon OneLink-compatible tracking ID appended to curated Amazon text links. */
  readonly VITE_AMAZON_ASSOCIATE_TAG?: string;
  /** Optional Amazon search endpoint, restricted to amazon.de/.com and the /s path. */
  readonly VITE_AMAZON_ASSOCIATE_SEARCH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
