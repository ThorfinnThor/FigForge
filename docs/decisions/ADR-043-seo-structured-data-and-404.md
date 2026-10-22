# ADR-043: Strukturierte Daten, Vorschaubild, echtes 404 und llms.txt

**Status:** akzeptiert  
**Datum:** 2026-10-22

## Kontext

Die Seite lieferte im vorab erzeugten HTML keine strukturierten Daten und kein
Vorschaubild für das Teilen. Unbekannte Adressen (auch `/llms.txt`) antworteten
mit Status 200 und der App-Startseite (`not_found_handling:
"single-page-application"`), was Google als „Soft 404“ werten kann.

## Entscheidung

- **JSON-LD** (`src/seo/json-ld.ts`) im `<head>` jeder indexierbaren Seite, als
  ein `@graph`: `WebSite` überall, `Organization` auf der Startseite und bei
  Ratgebern, `WebApplication` (kostenlos) auf `/builder`, `Article` mit
  Veröffentlichungs- und Änderungsdatum bei Ratgebern (`GUIDE_DATES` in
  `src/guides/guide-content.ts`; `modified` bei Textänderungen anpassen),
  `BreadcrumbList` auf allen Unterseiten. Kein `FAQPage`/`HowTo`, solange die
  Seiten keine passenden sichtbaren Abschnitte haben. `<` wird escaped; die
  Sicherheitsrichtlinie (`script-src 'self'`) betrifft Datenblöcke nicht.
- **Teilen:** `og:image` (1200 × 630, je Sprache `public/og-image.png` und
  `public/og-image-en.png`), `og:image:alt` und Twitter-Karten
  (`summary_large_image`) auf jeder Seite. Die Bilder sind aus den
  Figurenvorschauen der App und den App-Schriften gerendert (Headless-Chrome-
  Bildschirmfoto einer HTML-Vorlage) und als Dateien eingecheckt.
- **404:** `wrangler.jsonc` nutzt `"not_found_handling": "404-page"`. Der
  Prerender schreibt `dist/404.html` (Deutsch) und `dist/en/404.html`
  (Englisch, Cloudflare nimmt die nächstgelegene Datei). Die 404-Seite enthält
  das Modul-Skript der App nicht, weil die App jeden unbekannten Pfad als
  Builder öffnen würde. Alle öffentlichen Routen sind vorab erzeugt, deshalb
  braucht keine gültige Adresse den bisherigen Rückfall.
- **`llms.txt`** wird beim Prerender aus den Routen erzeugt (Beschreibung,
  Hinweis zur Unabhängigkeit von LEGO, Seiten und Ratgeber, deutsch und englisch).
- **Builder:** Der Builder bekommt im statischen HTML die drei Schritte, Links
  zu Ideen, Ratgebern und Methodik.

## Folgen

- Neue Seiten, die als eigene Adresse erreichbar sein sollen, müssen in
  `src/seo/routes.ts` stehen, sonst liefert Cloudflare 404.
- Der Nutzen von `llms.txt` ist umstritten; die Datei ist billig und schadet nicht.
- Die Social-Bilder ändern sich nicht von selbst, wenn sich Texte oder Figuren
  ändern. Neu rendern, wenn der Slogan wechselt.
