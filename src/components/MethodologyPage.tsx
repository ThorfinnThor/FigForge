import { AppHeader } from "./AppHeader.js";
import { useI18n } from "../i18n.js";

export function MethodologyPage() {
  const { path, t } = useI18n();

  return (
    <div className="app-shell methodology-shell">
      <AppHeader active="methodology" />

      <div className="methodology-page">
        <a className="methodology-page__back" href={path("/builder")}>← {t("methodology.back")}</a>
        <section className="workspace-methodology" aria-labelledby="methodology-title">
          <p className="methodology-page__eyebrow">Create Your Minifig</p>
          <h1 id="methodology-title">{t("methodology.title")}</h1>
          <div className="workspace-methodology__body">
            <p>{t("source.note")}</p>
            <p>{t("methodology.assembly")}</p>
            <p>{t("methodology.physical")}</p>
            <p>{t("methodology.localStorage")}</p>
            <p>{t("methodology.figureExport")}</p>
            <p className="workspace-methodology__links">
              <a href="/licenses/LDraw-CAreadme.txt" target="_blank" rel="noreferrer">{t("source.ldrawLicense")}</a>
              <a href="/licenses/LDCadShadowLibrary-NOTICE.txt" target="_blank" rel="noreferrer">{t("source.connectionLicense")}</a>
              <a href="/licenses/SemanticSearch-NOTICE.txt" target="_blank" rel="noreferrer">{t("source.searchLicense")}</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
