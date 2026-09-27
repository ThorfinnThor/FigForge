# FF-10-Verifikationsbericht: Modellpakete und Thumbnails

Stand: 27. September 2026.

## Ergebnis

FF-10 liefert eine reproduzierbare Referenzpipeline für das synthetische FF-04-Fixture. `public/assets/model-packages/ff04-fixture-standard-v1.json` beschreibt 18 deterministisch sortierte Fixture-Teile einschließlich FF-05-Ankern und Kameraprofilen. Für jedes Teil wird ein 256×256-SVG-Thumbnail aus derselben Paketbeschreibung erzeugt. Der Index liegt unter `data/generated/model-packages.json` und enthält SHA-256, Bytezahl, Pfade und Quellhashes von FF-03, Source-Lock und FF-05.

Das Paket ist ausdrücklich `synthetic-fixture` und `publishable: false`. Es behauptet weder echte LDraw-Geometrie noch Lizenz-, Release- oder Einkaufsfreigaben. Es werden keine MOC-Dateien, MOC-Inhalte, API-URLs oder Rebrickable-API-Daten verarbeitet. Die Kataloggrenze bleibt: **Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run assets:build` | Erfolgreich; 1 Modellpaket und 18 SVG-Thumbnails erzeugt. |
| `npm run assets:validate` | Erfolgreich; Quellhashes, Paketbytes, Thumbnailbytes, Pfade, MOC/API-Sperren und Nichtveröffentlichbarkeit geprüft. |
| FF-10-Unit-Tests | Erfolgreich; 18 Teile, 18 Thumbnails, Bytebudget und Byte-identische Wiederholung geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 12 Testdateien, 37 Tests. |

## Offene Risiken

1. Die erzeugten Dateien sind nur synthetische Prüfgeometrie. Reale LDraw-Pakete benötigen weiterhin Release-, Lizenz-, Abhängigkeits- und Hashnachweise.
2. SVG ist die reproduzierbare Referenzform ohne neue Raster-/Native-Abhängigkeit; WebP-Kompression und Browser-Rendering bleiben spätere Optimierung.
3. Das Repository hat weiterhin keinen verbundenen GitHub-Remote; GitHub Actions und Cloudflare Workers Builds wurden nicht öffentlich ausgeführt.
