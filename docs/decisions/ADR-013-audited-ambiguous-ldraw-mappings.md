# ADR-013: Geprüfte Auflösung mehrdeutiger offizieller LDraw-Zuordnungen

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Mehrere offizielle LDraw-Dateien können denselben Rebrickable-Katalogschlüssel nennen. Ein Teil dieser Fälle ist anhand des gesperrten Rebrickable-Katalognamens oder eindeutiger offizieller LDraw-Metadaten auflösbar. Andere Schlüssel fassen tatsächlich verschiedene Farben, Formen oder Posen zusammen und dürfen nicht automatisch auf ein Modell reduziert werden.

## Entscheidung

Eindeutige Fälle werden in `data/curated/ldraw-ambiguous-mapping-resolutions.json` mit Katalogname, ausgewählter offizieller Datei, offizieller Beschreibung und Begründung versioniert. Der Generator akzeptiert nur dort aufgeführte Auswahlen, die weiterhin ein offizieller Kandidat des Schlüssels sind. Nicht unterscheidbare Varianten werden in derselben Datei ausdrücklich gesperrt.

Bedruckte Standardbeine dürfen aus offiziellen Einzelkomponenten zusammengesetzt werden, wenn genau ein rechtes und ein linkes Druckbein, höchstens eine bedruckte Hüfte, die im Katalognamen bestätigte Beinfarbe und genau eine über `elements.csv` belegte Hüftfarbe vorhanden sind. Fehlende Farbnachweise oder mehrere Komponenten bleiben gesperrt.

Es werden ausschließlich Rebrickable Catalog Downloads/CSV und die gepinnte offizielle LDraw-Bibliothek verwendet. Rebrickable-API, MOC-Dateien, unscharfe Namenssuche und unbelegte Standardposen sind ausgeschlossen.

## Folgen

Jede Auswahl ist reproduzierbar prüfbar. Ein aufgelöster Zubehörschlüssel wird nicht automatisch baubar: Ohne eindeutigen digitalen Griff- und Kollisionsnachweis bleibt er in der Platzierungswarteschlange. Wirklich zusammengefasste Varianten bleiben sichtbar gesperrt, statt eine beliebige Darstellung zu erhalten.
