# ADR-020: Separater kompakter Set-Index

**Status:** angenommen
**Datum:** 2026-10-03

## Kontext

Der Builder soll nach Rebrickable-Setnummer und Setname filtern können. Die Zuordnung
liegt nicht in `parts.csv.gz`, sondern entsteht aus Set-, Inventar- und
Minifiguren-Katalogdateien. Ein Einbetten sämtlicher Setnamen in jedes Teil würde die
fünf rollenbezogenen Katalogpakete vergrößern und die semantische Teilesuche mit
Setmetadaten vermischen. Häufige Teile kommen außerdem in sehr vielen Sets vor.

## Entscheidung

Die Rebrickable-CSV-Allowlist wird um `sets.csv.gz`, `inventories.csv.gz`,
`inventory_parts.csv.gz`, `inventory_minifigs.csv.gz` und `minifigs.csv.gz`
erweitert. Die fünf Dateien erhalten mit `data/set-sources.lock.json` einen
separaten Bootstrap-Lock mit URL, SHA-256 und Abrufzeit. Der Refresh führt ihn erst
für den generierten Katalog-Lock mit dem historischen Kern-Lock zusammen. Dadurch
werden FF-03- und Suchartefakte, die keine Setdaten verwenden, nicht sachfremd
invalidiert. Die Rebrickable API und MOC-Dateien bleiben ausgeschlossen.

Der Refresh erzeugt `data/generated/catalog-set-index.json` als separates Artefakt.
Der Index enthält eine sortierte Tabelle der 20.202 relevanten Builder-Teilenummern.
Jeder Seteintrag speichert nur Setnummer, Setname, Jahr und numerische Verweise auf
diese Tabelle. Berücksichtigt werden sowohl direkte Teile eines Setinventars als auch
Teile der darin aufgeführten Minifiguren. Doppelte Zuordnungen und mehrere
Inventarversionen werden deterministisch zusammengeführt.

Der Set-Index wird nicht in Suchdokumente oder rollenbezogene Katalogpakete kopiert.
Die spätere Oberfläche lädt ihn nur bei Verwendung des Setfilters.

## Folgen

- Der initiale App-Download und die Semantik der Freitextsuche bleiben unverändert.
- Der wöchentliche Daten-Refresh verarbeitet zusätzlich das große
  `inventory_parts.csv.gz`; die Verarbeitung erfolgt zeilenweise, damit nicht alle
  Inventarzeilen gleichzeitig als Objekte im Speicher liegen.
- Setzuordnungen sind Katalogaussagen, keine Verfügbarkeits- oder Kaufgarantie.
- Änderungen am Index werden wie alle generierten Katalogdaten ausschließlich über
  einen Review-Pull-Request vorgeschlagen.
