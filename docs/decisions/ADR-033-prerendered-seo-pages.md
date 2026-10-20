# ADR-033: Vorab erzeugte Seiten-Köpfe für Suchmaschinen

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

FigForge ist eine reine Client-App. Im ausgelieferten HTML stand nur
`<div id="root"></div>`, jede URL trug denselben Titel „FigForge“ und die
Platzhalter-Beschreibung „technisches Projektgerüst“. `robots.txt` und
`sitemap.xml` gab es nicht: beide URLs lieferten wegen des SPA-Fallbacks die
Startseite mit Status 200. Ein vollständiges Server-Side-Rendering passt nicht,
weil Builder und Sammlung von IndexedDB und WebGL abhängen.

## Entscheidung

Nach `vite build` erzeugt `tools/prerender-seo.ts` aus dem gebauten
`index.html` für jede öffentliche Route (`src/seo/routes.ts`) eine eigene
`index.html` mit Titel, Beschreibung, Canonical-Link, Open-Graph-Angaben und
einem schlichten `h1` samt Einleitungssatz in `#root`. Die Texte stammen aus
den vorhandenen deutschen i18n-Meldungen. React ersetzt den Inhalt von `#root`,
sobald die App startet; das Vorab-HTML dient Suchmaschinen und Lesern ohne
JavaScript. Dasselbe Skript schreibt `robots.txt` und `sitemap.xml`.

Die lokale Sammlung (`/collection`) ist `noindex` und steht nicht in der
Sitemap. Es werden keine Seiten pro Einzelteil erzeugt.

## Folgen

- Der Build wird um einen Schritt länger (Sekundenbruchteile, nur Textdateien).
- Neue öffentliche Seiten müssen in `src/seo/routes.ts` eingetragen werden;
  ein Test prüft, dass dafür deutsche und englische Texte existieren.
- Die englische Fassung hat weiter keine eigene URL und kein hreflang. Das
  bleibt einer späteren Entscheidung (`/en/`) vorbehalten.
- Unbekannte Pfade fallen weiter auf die Startseite zurück (SPA-Fallback) und
  tragen deren Canonical.
