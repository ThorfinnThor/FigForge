import { Fragment, useEffect } from "react";
import { ANALYTICS_ENABLED } from "../consent/analytics-config.js";
import { privacySections } from "../privacy/privacy-content.js";
import { splitInline } from "../privacy/inline.js";
import { useI18n } from "../i18n.js";
import { AppHeader } from "./AppHeader.js";

export function PrivacyPage() {
  const { language, path, t } = useI18n();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("privacy.metaTitle");
    return () => { document.title = previousTitle; };
  }, [t]);

  const inline = (text: string) => splitInline(text).map((part, index) => (
    part.href === undefined ? <Fragment key={index}>{part.text}</Fragment> : part.href.startsWith("/")
      ? <a href={path(part.href)} key={index}>{part.text}</a>
      : <a href={part.href} key={index} rel="noopener noreferrer" target="_blank">{part.text}</a>
  ));

  return (
    <div className="app-shell methodology-shell">
      <AppHeader active="privacy" />

      <div className="methodology-page">
        <a className="methodology-page__back" href={path("/sets")}>← {t("privacy.back")}</a>
        <section className="workspace-methodology" aria-labelledby="privacy-title">
          <p className="methodology-page__eyebrow">FigForge</p>
          <h1 id="privacy-title">{t("privacy.title")}</h1>
          <div className="workspace-methodology__body privacy-sections">
            {privacySections(language, ANALYTICS_ENABLED).map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{inline(paragraph)}</p>)}
                {section.items ? <ul>{section.items.map((item) => <li key={item}>{inline(item)}</li>)}</ul> : null}
                {section.closing?.map((paragraph) => <p key={paragraph}>{inline(paragraph)}</p>)}
              </section>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
