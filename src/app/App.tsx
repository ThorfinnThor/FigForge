import { CatalogWorkspace } from "../components/CatalogWorkspace.js";
import { I18nProvider } from "../i18n.js";

export function App() {
  return <I18nProvider><main><CatalogWorkspace /></main></I18nProvider>;
}
