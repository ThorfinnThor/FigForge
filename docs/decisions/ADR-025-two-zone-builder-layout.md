# ADR-025: Builder als Zwei-Bereich-Arbeitsfläche

**Status:** akzeptiert
**Datum:** 2026-10-05

## Kontext

Die Desktopansicht verteilte Kategorien, Katalog, 3D-Vorschau und Teileliste auf
vier gleichwertig wirkende Spalten. Große Einleitungskarten, mehrere separate
Filterkarten und starke Schatten konkurrierten zusätzlich um Aufmerksamkeit.
Auf großen Bildschirmen war die Teileliste schmal; bei kleineren Breiten wurde
die Vorschau schnell gequetscht.

## Entscheidung

Der Builder erhält zwei primäre Bereiche: links den Katalog und rechts die
sticky 3D-Vorschau. Kategorien werden als kompakte Tabs im Katalog geführt.
Sekundäre Filter liegen in einem einklappbaren Bereich. Die vollständige
Teileliste, Einkaufsexporte und lokale Sammlung öffnen auf Desktop und Tablet in
einem unabhängig scrollbaren Drawer. Mobile behält die drei bestehenden Tabs
für Teile, Figur und Liste.

Die visuelle Hierarchie wird reduziert: kleinere Einleitung, flachere
Filterflächen, Statushinweise ohne zusätzliche Kartenschatten und Farbe nur für
aktive Navigation beziehungsweise Bauteilrollen.

## Responsive Vertrag

- Ab 1.440 px: Katalog und Vorschau im Verhältnis 1,15 zu 0,85; maximal 1.880 px
  Gesamtbreite.
- 1.100 bis 1.439 px: zwei Bereiche im Verhältnis 1,08 zu 0,92; Teileliste im
  440-px-Drawer.
- 768 bis 1.099 px: zwei kompaktere Bereiche; die Einleitungszeile wird gekürzt,
  der Drawer bleibt unabhängig scrollbar.
- Unter 768 px: drei zugängliche Tabs für Teile, Vorschau und Liste; Kategorien
  bilden ein Raster innerhalb des Teile-Tabs.

## Rückfall

Der unveränderte Produktionsstand vor diesem Umbau ist als Git-Tag
`figforge-before-layout-redesign-2026-10-05` gesichert.

## Folgen

- Suche und Teileauswahl erhalten den größten zusammenhängenden Arbeitsbereich.
- Vorschau und Figurverwaltung konkurrieren nicht mehr als zwei schmale Spalten.
- Für Detailaktionen ist auf Desktop ein zusätzlicher Klick zum Öffnen der
  Figurenliste nötig; Belegungsstand und Öffnen-Schaltfläche bleiben im Header
  sichtbar.
