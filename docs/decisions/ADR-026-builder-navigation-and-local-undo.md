# ADR-026: Eigene Methodikseite und lokales Ein-Schritt-Rückgängig

**Status:** akzeptiert  
**Datum:** 2026-10-06

## Kontext

Die Methodik lag als aufklappbarer Block unter dem Builder und war deshalb nur
über einen langen Seitensprung erreichbar. Änderungen an der Figur ließen sich
außerdem nur durch eine weitere manuelle Auswahl korrigieren. Der Setfilter
zeigte beim Öffnen lediglich acht Einträge, obwohl der kompakte Rebrickable-Index
mehr als elftausend Sets enthält.

## Entscheidung

`/methodology` wird als eigene statische SPA-Ansicht ausgeliefert. Der Builder
behält einen lokalen Snapshot der unmittelbar vorherigen Figurenbelegung und
Farbwahl. Ein Rückgängig-Schritt stellt genau diesen Snapshot wieder her; eine
dauerhafte Historie oder Cloud-Synchronisation wird nicht angelegt.

Der Setpicker zeigt eine scrollbar begrenzte Liste mit bis zu 120 Treffern.
Reguläre CMF-Serien werden als virtuelle Gruppen aus den bereits im
Rebrickable-CSV-Index belegten Einzelsets und deren Teilen gebildet. Die
Seriennummern entsprechen den `*-0`-Serienzeilen aus `sets.csv`; es werden keine
MOC-Dateien und keine API-Daten verwendet.

## Folgen

- Methodik und Quellen haben eine stabile, direkt aufrufbare URL.
- Auswahl, Entfernen, Farbwechsel, Import und Laden einer Figur sind einmal
  rückgängig zu machen.
- Eine CMF-Serie filtert auf die Vereinigungsmenge ihrer belegten Einzelsets.
- Neue reguläre CMF-Serien müssen beim Katalogupdate in der Serienzuordnung
  ergänzt werden, solange der kompakte Index die `*-0`-Zeilen nicht selbst
  ausliefert.
