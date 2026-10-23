# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `97b110c562acb33a2fdbf636bf50869d8d5d842981cbad94c8ab7edc75fb9bcf`; offizielle LDraw-Bibliothek 2026-09.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.283 minifigurenrelevante Katalogeinträge insgesamt.
- 14.931 besitzen bereits ein Modell und Vorschaubild.
- 14.929 sind tatsächlich im Builder auswählbar.
- 5.354 sind noch nicht builderbereit; davon fehlen bei 5.352 auch Modell/Vorschaubild.
- 2.840 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 168 sind mehrdeutig und 17.275 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Geprüft unvereinbar | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.422 | 4.880 | 0 | 0 | 0 | 0 | 1 | 541 |
| headwear | 2.416 | 784 | 0 | 0 | 0 | 0 | 4 | 1.628 |
| torsoAssembly | 7.880 | 6.030 | 1 | 70 | 1 | 0 | 3 | 1.775 |
| legsAssembly | 3.254 | 2.889 | 1 | 25 | 0 | 0 | 1 | 338 |
| handAccessory | 1.311 | 346 | 337 | 0 | 1 | 0 | 4 | 623 |

Die Resttabelle weist 12.370 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 0 Renderfehler technisch beheben.
2. Für 339 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 13 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 4.905 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
