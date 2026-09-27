# FF-09-Verifikationsbericht: Mapping-Review und Dublettenprüfung

Stand: 27. September 2026.

## Ergebnis

FF-09 erzeugt `data/generated/mapping-review.json` deterministisch aus dem gelockten FF-03-Testsortiment, den FF-06-Beschaffungsrezepten und dem exakten Source-Lock. Der Report enthält 133 offene Mapping-Einträge: 17 Anschlussprüfungen, 37 Beschaffungszuordnungen, 37 fehlende oder nicht exakte Renderzustände, 17 Human-Reviews, 20 blockierte Variantenfreigaben und 5 offene Rezeptprüfungen.

Es werden keine BrickLink-, LDraw- oder sonstigen Kandidaten-IDs geraten: `candidateIds` sind bei allen offenen Einträgen leer. Die fünf mehrfach referenzierten Kategorie-Evidence-IDs (`evidence:category:59`, `:60`, `:61`, `:65`, `:73`) werden als absichtlich gemeinsame Evidence dokumentiert und nicht als Teile-Duplikate gemeldet.

Die aktuelle Datenbasis ergibt keine Dublettengruppe. Der Prüfer erkennt dennoch deterministisch doppelte Rebrickable-Part-Nummern, identische Varianten-Signaturen und mehrfach vorhandene FF-06-Rezept-IDs, sobald solche Einträge in einer Review-Änderung auftreten.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:review:mappings` | Erfolgreich; Report mit 133 offenen Einträgen und 0 Dublettengruppen erzeugt. |
| `npm run data:validate:mappings` | Erfolgreich; Schema, Quell-Hashes, Rebrickable-only-Policy, deterministische Reproduktion und leere Kandidatenfelder geprüft. |
| FF-09-Unit-Tests | Duplikat-Erkennung für Part-Nummer, Variantensignatur und Rezept sowie Shared-Evidence-Ausschluss bestanden. |
| `npm run verify` | Erfolgreich nach Integration; bestehende Daten-, Typ-, Lint-, Test-, Build- und Cloudflare-Dry-Run-Prüfungen bleiben grün. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen gemeldet. |

## Offene Risiken

1. Der Report beweist keine externe Zuordnung. BrickLink-, LDraw- und Lizenznachweise bleiben separate manuelle Freigaben.
2. Die Dublettenprüfung arbeitet auf den im Plan definierten Schlüsseln; semantisch ähnliche, aber unterschiedlich nummerierte Teile brauchen später eine ausdrücklich freigegebene Such-/Review-Logik.
3. Das Repository hat weiterhin keinen verbundenen GitHub-Remote; die Review-PR-Automation wurde nur lokal validiert.
