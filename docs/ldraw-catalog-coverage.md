# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `6cfa8b0a22245c086d4a4bbac0aad64523a6a169d221fd210710f8b2f73eb885`; offizielle LDraw-Bibliothek 2026-08.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.202 minifigurenrelevante Katalogeinträge insgesamt.
- 6.630 besitzen bereits ein Modell und Vorschaubild.
- 6.628 sind tatsächlich im Builder auswählbar.
- 13.574 sind noch nicht builderbereit; davon fehlen bei 13.572 auch Modell/Vorschaubild.
- 2.272 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 122 sind mehrdeutig und 17.808 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.402 | 4.836 | 0 | 0 | 0 | 5 | 561 |
| headwear | 2.410 | 711 | 0 | 0 | 0 | 17 | 1.682 |
| torsoAssembly | 7.851 | 629 | 157 | 1 | 0 | 3 | 7.061 |
| legsAssembly | 3.231 | 232 | 43 | 0 | 0 | 25 | 2.931 |
| handAccessory | 1.308 | 220 | 382 | 1 | 0 | 33 | 672 |

Die Resttabelle weist 4.901 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 0 Renderfehler technisch beheben.
2. Für 582 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 83 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 12.907 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
