# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `c2a3675e0b1c87efccfe88a194d6f6f4f02a7f7ef64b78ec27983a12796c8af8`; offizielle LDraw-Bibliothek 2026-09.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.282 minifigurenrelevante Katalogeinträge insgesamt.
- 14.875 besitzen bereits ein Modell und Vorschaubild.
- 14.873 sind tatsächlich im Builder auswählbar.
- 5.409 sind noch nicht builderbereit; davon fehlen bei 5.407 auch Modell/Vorschaubild.
- 2.841 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 168 sind mehrdeutig und 17.273 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Geprüft unvereinbar | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.422 | 4.880 | 0 | 0 | 0 | 0 | 1 | 541 |
| headwear | 2.416 | 784 | 0 | 0 | 0 | 0 | 4 | 1.628 |
| torsoAssembly | 7.880 | 6.014 | 1 | 70 | 1 | 0 | 3 | 1.791 |
| legsAssembly | 3.253 | 2.889 | 1 | 25 | 0 | 0 | 1 | 337 |
| handAccessory | 1.311 | 306 | 377 | 0 | 1 | 0 | 4 | 623 |

Die Resttabelle weist 12.353 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 0 Renderfehler technisch beheben.
2. Für 379 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 13 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 4.920 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
