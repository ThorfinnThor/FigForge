import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { installChunkReload } from "./app/chunk-reload";
import { ANALYTICS_ENABLED, ANALYTICS_ID } from "./consent/analytics-config";
import { browserAnalyticsEnvironment, connectConsent } from "./consent/consent-runtime";
import { consentStore } from "./consent/use-consent";
import "@fontsource/lilita-one/latin-400.css";
import "@fontsource/rubik/latin-400.css";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-600.css";
import "@fontsource/rubik/latin-700.css";
import "./styles/tokens.css";
import "./styles/base.css";

installChunkReload();

const consent = consentStore();
if (ANALYTICS_ENABLED && ANALYTICS_ID && consent) {
  connectConsent(ANALYTICS_ID, consent, browserAnalyticsEnvironment());
}

const rootElement = document.querySelector<HTMLDivElement>("#root");

if (!rootElement) {
  throw new Error("Root element #root is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
