import { useEffect, useRef } from "react";
import { ANALYTICS_ENABLED } from "../consent/analytics-config.js";
import { useConsent } from "../consent/use-consent.js";
import { useI18n } from "../i18n.js";
import { Button } from "./ui/Button.js";

/**
 * Asks once whether Google Analytics may measure. "Allow" and "Decline" look alike on purpose;
 * nothing is loaded before "Allow". The same banner reopens from "Cookie settings" to change the decision.
 */
export function ConsentBanner() {
  const { path, t } = useI18n();
  const { snapshot, store } = useConsent();
  const ref = useRef<HTMLElement>(null);
  const visible = ANALYTICS_ENABLED && store !== null && (snapshot.choice === null || snapshot.settingsOpen);

  useEffect(() => {
    // Only a banner the visitor opened on purpose takes focus; the first-visit banner never steals it.
    if (visible && snapshot.settingsOpen) ref.current?.focus();
  }, [visible, snapshot.settingsOpen]);

  if (!visible || !store) return null;

  return (
    <aside
      aria-labelledby="consent-title"
      className="consent-banner"
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      <h2 id="consent-title">{t("consent.title")}</h2>
      <p>{t("consent.body")}</p>
      {snapshot.choice ? (
        <p className="consent-banner__current">
          {t(snapshot.choice === "granted" ? "consent.current.granted" : "consent.current.denied")}
        </p>
      ) : null}
      <div className="consent-banner__actions">
        <Button onClick={() => store.grant()} variant="secondary">{t("consent.accept")}</Button>
        <Button onClick={() => store.deny()} variant="secondary">{t("consent.decline")}</Button>
        {snapshot.settingsOpen ? (
          <Button onClick={() => store.closeSettings()} variant="ghost">{t("consent.close")}</Button>
        ) : null}
      </div>
      <a className="consent-banner__link" href={path("/privacy")}>{t("consent.privacyLink")}</a>
    </aside>
  );
}
