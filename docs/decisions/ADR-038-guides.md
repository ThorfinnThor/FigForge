# ADR-038: Ratgeber als statische Inhaltsseiten

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

Der SEO-Plan sieht wenige Ratgeberseiten vor, jede mit einer eigenen
Suchabsicht: Teile bestellen, Teilenummern verstehen, eine Figur verschenken.
Sie sollen Suchmaschinen als Text vorliegen, nicht erst nach dem Start der App.

## Entscheidung

Die Texte liegen strukturiert in `src/guides/guide-content.ts` (Abschnitte mit
Überschrift, Absätzen, Liste), Titel, Beschreibung und Einleitung in den
i18n-Meldungen (`guide.<id>.*`). Dieselbe Struktur rendert die Seite im Browser
(`GuidePage`) und den vollständigen Artikel im vorab erzeugten HTML
(`renderBody` in `src/seo/render.ts`). Es gibt eine Übersicht unter
`/ratgeber` (`/en/guides`) und je Ratgeber einen Slug pro Sprache
(`GUIDE_SLUGS` in `src/app/routing.ts`); `hreflang` verbindet die Paare.

Inhaltsregeln: Aussagen zu Katalog und Export stützen sich auf die Daten und
Texte des Projekts (z. B. Katalognamen der Teile, Export-Hinweise der
Oberfläche). Preise, Lieferzeiten und Verfügbarkeiten werden nicht genannt;
dafür verweisen die Texte auf den Shop. Keine Seiten pro Einzelteil.

## Folgen

- Neue Ratgeber brauchen einen Eintrag in `GUIDE_SLUGS`, Texte in beiden
  Sprachen und denselben Aufbau (ein Test prüft Vollständigkeit).
- Die Ratgeber stehen im Menü „Mehr“, auf der Landingpage und in der Sitemap.
- Die Texte sind Entwürfe des Projekts und vor einem breiten Start durch den
  Eigentümer zu lesen.
