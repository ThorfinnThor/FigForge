# FF-08 Verifikationsbericht: Catalog-Refresh und Normalisierung

Stand: 3. Oktober 2026; ursprünglicher FF-08-Abschluss am 27. September 2026.

## Ergebnis

FF-08 implementiert einen strikt begrenzten Adapter für erlaubte Rebrickable Catalog Downloads/CSV-Dateien. ADR-020 ergänzt die fünf ursprünglichen Archive um fünf Set-, Inventar- und Minifiguren-Katalogarchive in einem separaten Bootstrap-Lock. Der Adapter akzeptiert ausschließlich `cdn.rebrickable.com` über HTTPS und die festgeschriebenen `/media/downloads/<datei>`-Pfade. Er verwirft MOC-/API-Bezüge, prüft GZip/UTF-8/CSV-Struktur, Pflichtspalten, Duplikate, Integer-/RGB-Werte, Referenzen und SHA-256-Provenienz.

Die Normalisierung erzeugt deterministisches `data/generated/catalog-normalized.json`, einen generierten Source-Lock und einen maschinenlesbaren Refresh-Bericht. Roharchive werden nicht gespeichert. Ein neuer Hash wird nicht in den Baseline-Lock geschrieben; der Action-Lauf führt ihn im generierten Lock in den Review-Pull-Request über. Dadurch bleiben die manuell kuratierten FF-03-Daten gegen ihren ursprünglichen Source-Lock reproduzierbar.

Die GitHub Action verwendet `npm run data:refresh:remote`, validiert anschließend den vollständigen Repository-Stand und erstellt oder aktualisiert nur den Review-Branch `automation/rebrickable-catalog-refresh`. Es gibt keine Cloudflare-Zugangsdaten und keinen Deployment-Schritt in GitHub Actions.

## Daten- und Sicherheitsregeln

- Verbindliche Grenze: **Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.**
- Keine Rebrickable API, keine API-URL und kein API-Key.
- Erlaubte Dateien: `colors.csv.gz`, `part_categories.csv.gz`, `parts.csv.gz`, `part_relationships.csv.gz`, `elements.csv.gz`, `sets.csv.gz`, `inventories.csv.gz`, `inventory_parts.csv.gz`, `inventory_minifigs.csv.gz`, `minifigs.csv.gz`.
- Pflichtdateien: Farben, Kategorien und Teile.
- Ein unvollständiger Datensatz, unbekannte Kategorie/Farbe, doppelte ID oder Hashabweichung im lokalen Check bricht ab.
- `npm run data:refresh` ist lokal netzwerkfrei; Netzwerk und generierte Schreibvorgänge liegen ausschließlich hinter `data:refresh:remote`.
- Cloudflare Workers Builds bleibt für Build/Deployment zuständig; GitHub Actions deployt nicht.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:refresh` | Erfolgreich; Source-Lock-Grenze geprüft, kein Netzwerk und keine Dateimutationen. |
| `npm run data:validate:generated` | Erfolgreich; mangels generierter Remote-Daten kontrolliert übersprungen. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 10 Testdateien, 33 Tests. |
| Adapter-Unit-Tests | CSV-Quoting, Hashabweichung, MOC-Abbruch, fehlende Pflichtdatei und deterministische Normalisierung bestanden. |
| `npm run verify` | Nach Abschluss des Tickets vollständig erfolgreich; Datenvalidatoren, generierter-Katalog-Check, Build und Cloudflare-Dry-Run bestanden. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen gemeldet. |

## Offene Risiken

1. Der Remote-Refresh wurde nicht gegen das aktuelle Rebrickable-CDN ausgeführt; ein echter GitHub-Action-Lauf muss Erreichbarkeit, tatsächliche Hashänderungen und Token-/PR-Berechtigungen bestätigen.
2. Die Normalisierung ist ein Katalogmetadatenadapter. LDraw-Assets, BrickLink-Mappings, Ankerfreigaben und Suchannotationen bleiben bewusst separate Prüfschritte.
3. Das Repository hat weiterhin keinen verbundenen GitHub-Remote; die Workflow-Datei ist lokal validiert, aber noch nicht im echten Repositorybetrieb beobachtet.
