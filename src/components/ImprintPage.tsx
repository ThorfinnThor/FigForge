import { useEffect } from "react";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";

const CONTACT_EMAIL = "info@createyourminifig.com";

function Address({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <address>
      {name}<br />
      {t("imprint.address.street")}<br />
      {t("imprint.address.city")}<br />
      {t("imprint.address.country")}
    </address>
  );
}

export function ImprintPage() {
  const { path, t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("imprint.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  return (
    <div className="app-shell methodology-shell">
      <AppHeader active="imprint" />

      <div className="methodology-page">
        <a className="methodology-page__back" href={path("/")}>← FigForge</a>
        <section className="workspace-methodology" aria-labelledby="imprint-title">
          <p className="methodology-page__eyebrow">{t("imprint.eyebrow")}</p>
          <h1 id="imprint-title">{t("imprint.title")}</h1>
          <div className="workspace-methodology__body privacy-sections">
            <p>{t("imprint.lede")}</p>
            <section>
              <h2>{t("imprint.provider.title")}</h2>
              <p>
                <strong>{t("imprint.provider.name")}</strong><br />
                {t("imprint.provider.legalForm")}<br />
                {t("imprint.provider.owner")}
              </p>
              <Address name="Schayan Yousefian" />
            </section>
            <section>
              <h2>{t("imprint.contact.title")}</h2>
              <p>{t("imprint.contact.email")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
            </section>
            <section>
              <h2>{t("imprint.editorial.title")}</h2>
              <p>{t("imprint.editorial.body")}</p>
              <Address name={t("imprint.editorial.name")} />
            </section>
            <section>
              <h2>{t("imprint.trademark.title")}</h2>
              <p>{t("imprint.trademark.independent")}</p>
              <p>{t("imprint.trademark.lego")}</p>
              <p>{t("imprint.trademark.others")}</p>
              <p>{t("imprint.trademark.sources")}</p>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
