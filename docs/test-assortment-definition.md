# Definition des Testsortiments für FF-03

Dieses Dokument definiert Auswahl- und Nachweiskriterien für FF-03. Das konkrete, bewusst noch gesperrte Testsortiment liegt in `data/curated/ff03-test-assortment.json`.

## Zielumfang

- 5 geprüfte Köpfe.
- 5 geprüfte Haar-/Kopfbedeckungsoptionen.
- 2 Oberkörperbaugruppen.
- 2 Beinbaugruppen.
- 3 Handaccessoires mit geprüftem Griffpunkt.
- Mindestens 20 und höchstens 40 konkret unterscheidbare Varianten insgesamt.

## Auswahlkriterien

- Standard-Minifigurenfamilien mit überschaubaren Anschlusspunkten.
- Ausreichende Variation für Slottausch, Farbe, Druck und Einkaufsbaugruppen.
- Keine Bigfigs, Minidolls, flexiblen Stoffteile oder Sonderkörpersysteme.
- Keine Auswahl anhand der Nummern oder erfundenen Produktdetails der Designreferenz.
- Rebrickable-Metadaten nur aus der Catalog-CSV-Allowlist; keine MOC-Dateien oder API-Daten.

## Pflichtnachweise je Variante

- Eigene stabile Varianten-ID.
- Rebrickable-Katalog-ID und Quellen-Evidence.
- LDraw-Datei, Release, transitive Abhängigkeiten, Hashes und Lizenz-Evidence.
- Belegte Farbzuordnung je Nummernsystem.
- Geprüftes Anschlussprofil und zulässige Slots.
- Bestätigte BrickLink-Einkaufszuordnung oder sichtbarer Blocker.
- Renderstatus `exact`, `approximate` oder `missing`.
- Menschlicher Review vor `published`.

## Abnahmereport

FF-03 liefert eine Tabelle mit ausgewählt/abgelehnt, Begründung, Evidence-IDs, offenen Mappings und bewusst ausgeschlossenen Kandidaten. Unklare Varianten bleiben `draft` oder `blocked`. Die FF-03-Auswertung steht in `docs/test-reports/FF-03-assortment-report.md`.
