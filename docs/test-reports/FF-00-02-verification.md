# FF-00 bis FF-02 – Verifikationsbericht (historischer Stand)

Datum: 27. September 2026  
Umfang: ausschließlich FF-00, FF-01 und FF-02.

Dieser Bericht beschreibt den Zustand vor der FF-03-Erfassung. Der aktuelle FF-03-Nachweis und die aktualisierten Source-Lock-Hashes stehen in `docs/test-reports/FF-03-assortment-report.md`.

## Ergebnis

Die lokale Projektgrundlage ist reproduzierbar installierbar und vollständig grün. Es wurde kein GitHub-Remote angelegt, kein Cloudflare-Projekt verbunden und kein öffentliches Deployment ausgeführt.

## Ausgeführte Prüfungen

| Befehl / Prüfung | Ergebnis |
|---|---|
| `npm ci` | Erfolgreich; 185 Pakete installiert, 0 gemeldete Schwachstellen. |
| `npm run data:validate` | Erfolgreich; genau eine Rebrickable-Quelle, fünf erlaubte Katalogarchive, `apiUsed: false`, `mocFilesAllowed: false`. Alle fünf Download-URLs/Hashes bleiben bis FF-08 bewusst ungeklärt. |
| `npm run typecheck` | Erfolgreich; TypeScript-Projekt ohne Fehler. |
| `npm run lint` | Erfolgreich; keine ESLint-Fehler. Regel gegen Floating Promises aktiv. |
| `npm run test` | Erfolgreich; 3 Testdateien, 11 Tests bestanden. |
| `npm run build` | Erfolgreich; Vite-Produktionsbuild erzeugt. JS 219,84 kB unkomprimiert / 68,70 kB gzip. |
| `npm run cf:check` | Erfolgreich; Wrangler 4.141.0 Dry-Run, 8 statische Dateien erkannt, keine Bindings, kein Upload. |
| `npm audit --audit-level=high` | Erfolgreich; 0 gemeldete Schwachstellen. |
| `git diff --check` | Erfolgreich; keine Whitespace-Fehler. |

## Abgedeckte Regeln

- Veröffentlichte Varianten benötigen Katalog-Evidence und eine verifizierte Einkaufszuordnung.
- Verifizierte Einkaufsrezepte benötigen mindestens eine Position.
- Unbekannte Figurenslots werden abgewiesen.
- Die Rebrickable-Quelle ist auf fünf Catalog-CSV-Archive begrenzt.
- MOC-Dateinamen und Rebrickable-API-Nutzung werden abgewiesen.
- GitHub-Workflow-YAML wird syntaktisch geparst.
- GitHub-eigene Actions sind auf vollständige Commit-SHAs gepinnt.
- GitHub Actions enthält weder Cloudflare-Zugangsdaten noch `wrangler deploy`.
- Der Cloudflare-Dry-Run bestätigt ein assets-only Projekt ohne Bindings.

## Bekannte Einschränkungen und offene Risiken

- `data:refresh` ist absichtlich nur ein Check-only-Gerüst. Remote-Downloads, CSV-Parsing und PR-Datenänderungen gehören zu FF-08.
- Download-URLs, Abrufzeitpunkte und SHA-256-Werte der Rebrickable-Archive sind noch `null` und blockieren eine echte Datenübernahme.
- Der vom Projektverantwortlichen genannte Nachweis zur kommerziellen Nutzung der Catalog Downloads/CSV muss noch als überprüfbares Artefakt abgelegt werden.
- Ein GitHub-Remote, echte Verantwortliche, CODEOWNERS und Branchschutz sind nicht konfiguriert; die erforderlichen Einstellungen sind dokumentiert.
- Cloudflare Workers Builds ist nicht verbunden; Worker-Name, Produktionsbranch und Kontingente müssen in FF-31 mit dem realen Konto geprüft werden.
- Der CSP ist ein konservatives Grundgerüst und muss mit der späteren WASM-/Worker-/Modellintegration erneut im Browser geprüft werden.
- Die lokale npm-Installation benötigte wegen der macOS-/Node-Zertifikatseinbindung ein temporäres System-CA-Bundle. Dieses Bundle wurde nicht ins Repository geschrieben; GitHub-hosted Runner müssen den normalen `npm ci`-Pfad separat bestätigen.
