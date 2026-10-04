# ADR-022: Rebrickable-Farben von LEGO-Elementnummern trennen

**Status:** akzeptiert
**Datum:** 2026-10-04

## Kontext

Der Teilelistenexport leitete Farbe und LEGO-Elementnummer bisher gemeinsam aus
`elements.csv.gz` ab. Dadurch wurden Teile ohne LEGO-Elementnummer auch aus der
Rebrickable-CSV ausgeschlossen, obwohl `inventory_parts.csv.gz` ihre Farbe in
offiziellen Set-Inventaren belegt. Die Anzeige „nicht enthalten“ konnte deshalb
fälschlich wie „Teil existiert nicht auf Rebrickable“ wirken.

## Entscheidung

1. Rebrickable-Teilfarben werden aus dem erlaubten Catalog Download
   `inventory_parts.csv.gz` übernommen.
2. `elements.csv.gz` bleibt die einzige Quelle für LEGO-Elementnummern.
3. Die Rebrickable-CSV benötigt eine belegte Teil-Farb-Kombination, aber keine
   LEGO-Elementnummer.
4. Pick a Brick benötigt weiterhin genau eine belegte LEGO-Elementnummer.
5. Unbekannte Farben und Zuordnungen werden weiterhin nicht geraten. MOC-Dateien
   und die Rebrickable API bleiben ausgeschlossen.

## Folgen

- Mehr Builder-Teile lassen sich korrekt nach Rebrickable exportieren.
- Ein Teil kann in der Rebrickable-Liste enthalten und gleichzeitig für Pick a
  Brick blockiert sein.
- Die Oberfläche beschreibt fehlende Farbnachweise ausdrücklich als Lücke in den
  Katalog-CSV-Daten, nicht als fehlendes Rebrickable-Teil.
