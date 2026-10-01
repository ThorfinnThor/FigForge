# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `6cfa8b0a22245c086d4a4bbac0aad64523a6a169d221fd210710f8b2f73eb885`; offizielle LDraw-Bibliothek 2026-08.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.202 minifigurenrelevante Katalogeinträge insgesamt.
- 14.826 besitzen bereits ein Modell und Vorschaubild.
- 14.824 sind tatsächlich im Builder auswählbar.
- 5.378 sind noch nicht builderbereit; davon fehlen bei 5.376 auch Modell/Vorschaubild.
- 2.834 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 168 sind mehrdeutig und 17.200 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Geprüft unvereinbar | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.402 | 4.864 | 0 | 0 | 0 | 0 | 1 | 537 |
| headwear | 2.410 | 781 | 0 | 0 | 0 | 0 | 4 | 1.625 |
| torsoAssembly | 7.851 | 5.992 | 0 | 70 | 1 | 0 | 3 | 1.785 |
| legsAssembly | 3.231 | 2.868 | 0 | 25 | 0 | 0 | 1 | 337 |
| handAccessory | 1.308 | 319 | 364 | 0 | 1 | 0 | 4 | 620 |

Die Resttabelle weist 12.296 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 0 Renderfehler technisch beheben.
2. Für 364 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 13 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 4.904 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
