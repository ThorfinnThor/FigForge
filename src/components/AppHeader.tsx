import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useI18n, type Language } from "../i18n.js";

export type AppRoute = "builder" | "ideas" | "sets" | "collection" | "methodology" | "privacy";

type AppHeaderProps = {
  active: AppRoute;
  /** Receives clicks on every internal link; the builder uses it to commit the draft first. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Page-specific controls rendered after the language picker (builder: undo and figure drawer). */
  children?: ReactNode;
};

const PRIMARY_ROUTES = [
  { id: "builder", href: "/", labelKey: "nav.builder" },
  { id: "ideas", href: "/ideas", labelKey: "nav.ideas" },
  { id: "sets", href: "/sets", labelKey: "nav.products" },
  { id: "collection", href: "/collection", labelKey: "nav.collection" },
] as const;

const SECONDARY_ROUTES = [
  { id: "methodology", href: "/methodology", labelKey: "nav.notes" },
  { id: "privacy", href: "/privacy", labelKey: "nav.privacy" },
] as const;

export function AppHeader({ active, onNavigate, children }: AppHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const secondaryIsActive = SECONDARY_ROUTES.some(({ id }) => id === active);

  useEffect(() => {
    const more = moreRef.current;
    if (!more) return;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      if (more.open && event.target instanceof Node && !more.contains(event.target)) more.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !more.open) return;
      more.open = false;
      more.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const link = ({ id, href, labelKey }: { id: AppRoute; href: string; labelKey: string }, className: string) => (
    <a
      aria-current={active === id ? "page" : undefined}
      className={`${className}${active === id ? ` ${className}--active` : ""}`}
      href={href}
      key={id}
      onClick={onNavigate}
    >
      {t(labelKey)}
    </a>
  );

  return (
    <header className="app-header">
      <a className="wordmark" href="/" onClick={onNavigate}>Fig<span>Forge</span></a>
      <nav className="app-nav" aria-label={t("nav.label")}>
        {PRIMARY_ROUTES.map((route) => link(route, "app-nav__link"))}
        <details className="app-more" ref={moreRef}>
          <summary className={`app-nav__link${secondaryIsActive ? " app-nav__link--active" : ""}`}>
            {t("nav.more")}
          </summary>
          <div className="app-more__menu">
            {SECONDARY_ROUTES.map((route) => link(route, "app-more__link"))}
          </div>
        </details>
      </nav>
      <label className="language-picker">
        <span>{t("language.label")}</span>
        <select
          aria-label={t("language.label")}
          value={language}
          onChange={(event) => setLanguage(event.currentTarget.value as Language)}
        >
          <option value="de">{t("language.de")}</option>
          <option value="en">{t("language.en")}</option>
        </select>
      </label>
      {children}
    </header>
  );
}
