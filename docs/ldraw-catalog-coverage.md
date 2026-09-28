# LDraw-Katalogabdeckung

Stand: 2026-09-28; Rebrickable-Source-Lock `6cfa8b0a22245c086d4a4bbac0aad64523a6a169d221fd210710f8b2f73eb885`; offizielle LDraw-Bibliothek 2026-08.

**Verbindliche Quellenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Ergebnis

- 20.202 minifigurenrelevante Katalogeinträge insgesamt.
- 853 besitzen bereits ein Modell und Vorschaubild.
- 851 sind tatsächlich im Builder auswählbar.
- 19.351 sind noch nicht builderbereit; davon fehlen bei 19.349 auch Modell/Vorschaubild.
- 2.272 Katalogeinträge haben insgesamt eine eindeutige offizielle LDraw-Zuordnung, 122 sind mehrdeutig und 17.808 haben keine offizielle Zuordnung.

| Rolle | Katalog | Builderbereit | Platzierung fehlt | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| head | 5.402 | 385 | 0 | 0 | 9 | 5 | 5.003 |
| headwear | 2.410 | 464 | 0 | 0 | 12 | 17 | 1.917 |
| torsoAssembly | 7.851 | 0 | 639 | 1 | 0 | 25 | 7.186 |
| legsAssembly | 3.231 | 0 | 160 | 0 | 0 | 42 | 3.029 |
| handAccessory | 1.308 | 2 | 600 | 1 | 0 | 33 | 672 |

Die Resttabelle weist einen Eintrag weniger unter „Keine Zuordnung“ aus als die rohe Mappingbilanz: `3814` wird wegen seiner kuratierten Modellabbildung vorrangig als gesperrt geführt, besitzt im offiziellen LDraw-Release aber keine exakte Dateinamen- oder explizite Rebrickable-Zuordnung.

## Sichere Arbeitsreihenfolge

1. Die 21 Renderfehler technisch beheben.
2. Für 1.399 eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.
3. Die 122 mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.
4. Die 17.807 Einträge ohne offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.

Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.
