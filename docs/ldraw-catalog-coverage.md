# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `6cfa8b0a22245c086d4a4bbac0aad64523a6a169d221fd210710f8b2f73eb885`; offizielle LDraw-Bibliothek 2026-08.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.202 minifigurenrelevante Katalogeinträge insgesamt.
- 4.540 besitzen bereits ein Modell und Vorschaubild.
- 4.538 sind tatsächlich im Builder auswählbar.
- 15.664 sind noch nicht builderbereit; davon fehlen bei 15.662 auch Modell/Vorschaubild.
- 2.272 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 122 sind mehrdeutig und 17.808 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.402 | 3.861 | 0 | 0 | 975 | 5 | 561 |
| headwear | 2.410 | 675 | 0 | 0 | 36 | 17 | 1.682 |
| torsoAssembly | 7.851 | 0 | 639 | 1 | 0 | 25 | 7.186 |
| legsAssembly | 3.231 | 0 | 160 | 0 | 0 | 42 | 3.029 |
| handAccessory | 1.308 | 2 | 600 | 1 | 0 | 33 | 672 |

Die Resttabelle weist 4.678 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 1.011 Renderfehler technisch beheben.
2. Für 1.399 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 122 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 13.130 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
