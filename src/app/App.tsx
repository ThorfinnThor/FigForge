import { lazy, Suspense } from "react";
import { I18nProvider, useI18n } from "../i18n.js";
import { germanPath } from "./routing.js";

const LandingPage = lazy(() => import("../components/LandingPage.js")
  .then((module) => ({ default: module.LandingPage })));
const CatalogWorkspace = lazy(() => import("../components/CatalogWorkspace.js")
  .then((module) => ({ default: module.CatalogWorkspace })));
const CollectionPage = lazy(() => import("../components/CollectionPage.js")
  .then((module) => ({ default: module.CollectionPage })));
const IdeasPage = lazy(() => import("../components/IdeasPage.js")
  .then((module) => ({ default: module.IdeasPage })));
const MethodologyPage = lazy(() => import("../components/MethodologyPage.js")
  .then((module) => ({ default: module.MethodologyPage })));
const ProductsPage = lazy(() => import("../components/ProductsPage.js")
  .then((module) => ({ default: module.ProductsPage })));
const PrivacyPage = lazy(() => import("../components/PrivacyPage.js")
  .then((module) => ({ default: module.PrivacyPage })));

/** Links from before the landing page pointed the builder at "/"; keep them working. */
const hasLegacyBuilderIntent = (): boolean => {
  const { hash, search } = window.location;
  const params = new URLSearchParams(search);
  return params.has("template") || params.has("figureId") || hash.startsWith("#figforge=");
};

function AppRoutes() {
  const { t } = useI18n();
  // Re-read on every render: switching the language rewrites the URL in place.
  const pathname = germanPath(window.location.pathname);
  const page = pathname === "/ideas" || pathname.startsWith("/ideas/")
    ? <IdeasPage />
    : pathname === "/sets"
      ? <ProductsPage />
      : pathname === "/privacy"
        ? <PrivacyPage />
      : pathname === "/methodology"
        ? <MethodologyPage />
        : pathname === "/collection"
          ? <CollectionPage />
          : pathname === "/" && !hasLegacyBuilderIntent()
            ? <LandingPage />
            : <CatalogWorkspace />;

  return (
    <Suspense fallback={<p className="app-route-loading" role="status">{t("app.loading")}</p>}>
      {page}
    </Suspense>
  );
}

export function App() {
  return (
    <I18nProvider>
      <main>
        <AppRoutes />
      </main>
    </I18nProvider>
  );
}
