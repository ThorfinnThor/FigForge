# ADR-045: Partnerlink-Klicks zählen, Platz-Kennungen, Produkte in Ratgebern

**Status:** akzeptiert (Entscheidung des Eigentümers, 2026-10-22)  
**Datum:** 2026-10-22

## Kontext

Die Partnerlinks (Amazon, später LEGO über Rakuten) sollen auswertbar sein, damit
sichtbar wird, welche Seiten und Produkte geklickt werden. Es gibt keinen Server.

## Entscheidung

- **Klickereignis:** Ein Klick auf einen Partnerlink sendet das Google-Analytics-
  Ereignis `affiliate_click` mit `partner` (`amazon`, `lego`), `placement`,
  `item` (Produkt-ID oder Suchbegriff) und `affiliate` (mit oder ohne Provision).
  Gesendet wird nur, solange die Einwilligung zu Google Analytics gilt
  (`sendAnalyticsEvent` prüft „geladen und nicht abgeschaltet“). Ohne Einwilligung
  oder Mess-ID passiert nichts. Der Datenschutztext nennt das im Abschnitt
  „Google Analytics“.
- **Plätze:** `sets`, `ideas`, `ideas-<welt>`, `guide-<ratgeber>`, `builder`.
- **Platz-Kennungen in den Links:** Rakuten-Links bekommen `&u1=<platz>` (freie
  Sub-ID, die Rakuten in Berichten ausweist). Für Amazon gibt es je Platz eine
  optionale eigene Tracking-ID (`AMAZON_AFFILIATE_CONFIG.placementTrackingIds`);
  ohne sie gilt `figforge-21`. Zusätzliche IDs legt der Eigentümer im
  Partnerkonto an und trägt sie ein.
- **Ratgeber mit Produkten:** `src/guides/guide-products.ts` ordnet einzelnen
  Ratgebern kuratierte Produkte zu (Geschenk: Vitrine und Aufbewahrung; Aufbau:
  drei Sets; Beruf und Hobby: Feuerwehr- und Weltraum-Sets). Der Bereich ist als
  „Anzeige“ gekennzeichnet. Die Praxis-Ratgeber (Bestellen, BrickLink, Pick a
  Brick, Farben, Teilenummern) bleiben ohne Werbung. Das vorab erzeugte HTML der
  Ratgeber enthält die Produkte nicht.

## Folgen

- Die Auswertung sieht nur Besucher, die Google Analytics erlaubt haben.
- Neue Plätze brauchen keinen Code, nur einen Namen im Aufruf von
  `CuratedProductGrid` und gegebenenfalls eine Tracking-ID.
