import { lazy, Suspense } from "react";
import { I18nProvider, useI18n } from "../i18n.js";

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

function AppRoutes() {
  const { t } = useI18n();
  const pathname = window.location.pathname.replace(/\/+$/u, "") || "/";
  const page = pathname === "/ideas" || pathname.startsWith("/ideas/")
    ? <IdeasPage />
    : pathname === "/sets"
      ? <ProductsPage />
      : pathname === "/methodology"
        ? <MethodologyPage />
        : pathname === "/collection"
          ? <CollectionPage />
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
