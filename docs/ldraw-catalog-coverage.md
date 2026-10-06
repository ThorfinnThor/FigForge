# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `aa1c89f8a13d384c5ee63d05c72e5fc04e9135b3c0056347359001dff2cf9482`; offizielle LDraw-Bibliothek 2026-09.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.271 minifigurenrelevante Katalogeinträge insgesamt.
- 14.892 besitzen bereits ein Modell und Vorschaubild.
- 14.890 sind tatsächlich im Builder auswählbar.
- 5.381 sind noch nicht builderbereit; davon fehlen bei 5.379 auch Modell/Vorschaubild.
- 2.841 Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, 168 sind mehrdeutig und 17.262 haben keine direkte offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Geprüft unvereinbar | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.423 | 4.881 | 0 | 0 | 0 | 0 | 1 | 541 |
| headwear | 2.415 | 784 | 0 | 0 | 0 | 0 | 4 | 1.627 |
| torsoAssembly | 7.871 | 6.013 | 1 | 70 | 1 | 0 | 3 | 1.783 |
| legsAssembly | 3.252 | 2.888 | 1 | 25 | 0 | 0 | 1 | 337 |
| handAccessory | 1.310 | 324 | 359 | 0 | 1 | 0 | 4 | 622 |

Die Resttabelle weist 12.352 Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall `3814` – wegen einer kuratierten Modellabbildung gesperrt.

## Sichere Arbeitsreihenfolge

1. Die 0 Renderfehler technisch beheben.
2. Für 361 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 13 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 4.910 Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
