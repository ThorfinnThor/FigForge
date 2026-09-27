# FF-03 Abnahmereport: Testsortiment

Stand: 27. September 2026.

## Ergebnis

FF-03 erfasst 17 reale Kandidaten aus den gelockten Rebrickable Catalog CSVs und bildet daraus 20 konkret unterscheidbare Variantenkandidaten. Die Zielverteilung ist erfüllt: 5 Köpfe, 5 Haar-/Kopfbedeckungsoptionen, 2 Oberkörperbaugruppen, 2 Beinbaugruppen und 3 Handaccessoires mit vorgesehenem Griffslot.

Alle Einträge bleiben absichtlich `blocked`. Das verhindert, dass eine bloße Rebrickable-Katalogzeile als veröffentlichbares 3D- oder Einkaufsangebot missverstanden wird.

## Quellen- und Datenregeln

- Verwendet wurden ausschließlich `colors.csv.gz`, `part_categories.csv.gz`, `parts.csv.gz`, `part_relationships.csv.gz` und `elements.csv.gz`.
- Die Archive sind in `data/sources.lock.json` mit URL, UTC-Abrufzeit und SHA-256 gebunden.
- Es wurden keine Rebrickable-MOC-Dateien, Inventar-/Set-Dateien oder Rebrickable-API-Daten geladen.
- Die Source-Lock-Datei selbst ist über `sourceLockSha256` im Testsortiment referenziert.

## Ausgewählt / ausgeschlossen

Die vollständigen Evidence-IDs, Farbzeilen und Blocker stehen in `data/curated/ff03-test-assortment.json`. Bewusst ausgeschlossen wurden unter anderem ein droidischer Spezialkopf (`100456pr0001`), ein geformter Ewok-Kopf (`102718pr0001`) und ein Battle-Droid-Torso (`30375`), weil sie nicht zur definierten Standard-Minifigurenfamilie gehören.

## Offene Nachweise

1. LDraw-Datei, Release, transitive Abhängigkeiten, Hashes, Lizenzheader und Attribution fehlen.
2. BrickLink-Artikel-/Farb-IDs sind nicht aus Rebrickable-IDs abgeleitet und bleiben bis zur manuellen Prüfung `null`.
3. Anschlussprofile, Griffpunkte und Renderstatus sind noch nicht menschlich geprüft.
4. Deshalb sind alle Komponenten und Varianten `blocked`; kein Eintrag darf als `published` ausgeliefert werden.

## Tatsächlich ausgeführte Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run data:validate` | Erfolgreich; fünf gelockte Archive, `apiUsed: false`, `mocFilesAllowed: false`, keine offenen Lock-Einträge. |
| `npm run data:validate:ff03` | Erfolgreich; 17 Komponenten, 20 Varianten, alle bewusst `blocked`. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 4 Testdateien, 13 Tests. |
| `npm run build` | Erfolgreich; Vite-Build erzeugt. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run, kein Upload, keine Bindings. |
| `npm run verify` | Erfolgreich; alle oben genannten Prüfungen in einem Lauf grün. |
| `git diff --check` | Erfolgreich; keine Whitespace-Fehler. |
