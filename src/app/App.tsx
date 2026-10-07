import { CatalogWorkspace } from "../components/CatalogWorkspace.js";
import { CollectionPage } from "../components/CollectionPage.js";
import { MethodologyPage } from "../components/MethodologyPage.js";
import { I18nProvider } from "../i18n.js";

export function App() {
  const pathname = window.location.pathname.replace(/\/+$/u, "") || "/";
  return (
    <I18nProvider>
      <main>
        {pathname === "/methodology"
          ? <MethodologyPage />
          : pathname === "/collection"
            ? <CollectionPage />
            : <CatalogWorkspace />}
      </main>
    </I18nProvider>
  );
}
