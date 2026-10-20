# ADR-037: Englische Fassung unter eigener URL

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

Die englische Oberfläche gab es nur als Umschalter; die Sprache stand im
`localStorage`. Suchmaschinen sahen dadurch nur Deutsch, und eine englische
Seite ließ sich weder verlinken noch indexieren.

## Entscheidung

Die URL bestimmt die Sprache: `/en/...` ist Englisch, alles andere Deutsch.
Seiten werden über ihren deutschen Pfad identifiziert; `src/app/routing.ts`
wandelt Pfade in beide Richtungen um (`localizedPath`, `germanPath`,
`switchLanguageUrl`) und kennt eine Tabelle für Seiten mit übersetztem Slug.
Interne Links laufen über `useI18n().path(...)`. Der Sprachwähler schaltet die
Seite weiter ohne Neuladen um und schreibt dabei die URL um (`replaceState`),
damit ein laufender Entwurf nicht unterbrochen wird. Der gespeicherte
Spracheintrag entfällt.

Der Nachbau (`tools/prerender-seo.ts`) erzeugt jede öffentliche Seite in beiden
Sprachen mit passendem `lang`, Titel, Beschreibung, Canonical und
`og:locale`. Indexierbare Seiten verweisen per `hreflang` auf beide Fassungen
und auf Deutsch als `x-default`; die Sitemap listet beide Fassungen mit
`xhtml:link`-Alternativen. `/collection` bleibt in beiden Sprachen `noindex`.

## Folgen

- Wer bisher Englisch gespeichert hatte, sieht beim nächsten Besuch von `/`
  Deutsch und wechselt über den Wähler oder `/en/`.
- Es gibt keine automatische Weiterleitung nach Browsersprache, damit Crawler
  und Nutzer dieselbe Seite unter derselben URL sehen.
- Geteilte Links und Figurenimporte funktionieren unter beiden Präfixen;
  `/?template=…`, `/?figureId=…` und `/#figforge=…` öffnen weiter den Builder.
- Neue Seiten brauchen Texte in beiden Sprachen (ein Test prüft das) und einen
  Eintrag in `src/seo/routes.ts`.
