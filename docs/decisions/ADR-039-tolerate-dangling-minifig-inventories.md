# ADR-039: Verwaiste Minifiguren-Inventarzeilen im Set-Index tolerieren

**Status:** akzeptiert  
**Datum:** 2026-10-21

## Kontext

Der Set-Index (ADR-020) brach ab, sobald eine Zeile in
`inventory_minifigs.csv.gz` auf eine Inventar-ID verwies, die in
`inventories.csv.gz` fehlt. Der Refresh vom 2026-10-21 scheiterte so an
„references unknown inventory 364458“, obwohl alle übrigen Daten gültig waren.
Eine solche Zeile lässt sich keinem Set zuordnen; es gibt nichts zu raten.
Zeilen in `inventory_parts.csv.gz` mit unbekanntem Inventar wurden schon bisher
ohne Fehler übergangen.

## Entscheidung

Verwaiste Zeilen werden übersprungen und gezählt. Der Refresh-Bericht
(`catalog-refresh-report.json`) enthält `skippedInventoryMinifigRows` mit der
Anzahl und bis zu fünf Beispiel-IDs, die Konsolenausgabe ebenso. Die
Fehlerschwelle bleibt erhalten: Sind mehr als 0,5 % der Zeilen verwaist
(`MAX_UNKNOWN_INVENTORY_MINIFIG_SHARE`), bricht der Refresh weiter ab, denn dann
ist die Datei kaputt und nicht nur uneinheitlich. Bekannte Figuren-Referenzen
bleiben streng: Eine unbekannte Figur (`fig_num`) bricht weiterhin ab.

## Folgen

- Ein einzelner Fehler in den Rebrickable-Rohdaten blockiert den wöchentlichen
  Refresh nicht mehr; er wird sichtbar, sobald der Review-PR den Bericht zeigt.
- Zugeordnet wird nur, was belegt ist: Übersprungene Zeilen tragen keine
  Zuordnung zum Set-Index bei.
- Wächst die Zahl übersprungener Zeilen über Wochen, ist das ein Hinweis an
  Rebrickable und kein Grund, die Schwelle anzuheben.
