# FigForge

Backendloser, kuratierter Minifiguren-Konfigurator mit digital verbundenen LDraw-Modellen. Dieses Repository enthält den lokal ausführbaren Stand bis FF-17, FF-21 sowie den technisch vorbereiteten FF-18-Vergleich.

## Status

- Kein vollständiger Katalog.
- Keine produktive Datenpipeline.
- FF-03: 17 reale Katalog-Komponenten und 20 Variantenkandidaten, alle bis zur LDraw-/BrickLink-/Human-Prüfung `blocked`.
- FF-04: Three.js-Szene, LDrawLoader-Adapter, feste Kameraansichten und transaktionaler Kopfwechsel mit klar markierter synthetischer Prüfgeometrie.
- FF-05: versionierte digitale Anschluss-Registry für Kopf, Kopfbedeckung und Handzubehör aus einer gepinnten Teilmenge der LDCad Shadow Library; unbekannte Verbindungen bleiben gesperrt.
- FF-06: validierte Beschaffungsrezepte und deterministische Teilelistenlogik für Einzelteile, Baugruppen und Komponenten; reale BrickLink-Zuordnungen bleiben blockiert.
- FF-07: klickbarer POC für fünf Köpfe, fünf Kopfbedeckungen und drei synthetische Handaccessoires je Hand; alle Optionen bleiben als nicht kaufbare Prüfgeometrie markiert.
- FF-08: deterministischer CSV/GZip-Adapter mit Hash-, Schema-, Provenienz- und MOC-Sperren; GitHub Actions erstellt daraus nur einen Review-Pull-Request mit generierten Daten.
- FF-09: deterministischer Review-Report für offene Mappings, Dublettensignale und bewusst leere Kandidatenfelder; gemeinsame Kategorie-Evidence wird nicht fälschlich als Teile-Duplikat gewertet.
- FF-10: reproduzierbares, ausdrücklich nicht veröffentlichbares FF-04-Fixturepaket mit 18 gehashten SVG-Thumbnails und Byte-/Quellhash-Validator.
- FF-11: deterministisches Assetmanifest mit Artefakt-Hashes, Provenienz, Lizenzstatus, öffentlichen Quellenhinweisen und blockierter Release-Freigabe.
- FF-12: versionierte Design-Tokens sowie zugängliche Button-, Input-, Karten- und Statuskomponenten, im bestehenden POC verdrahtet.
- FF-13: Desktop-Arbeitsfläche mit Kategorieleiste, kuratiertem FF‑03‑Katalog, lokalen Stichwortfiltern, Figurenpanel und integrierter FF‑07‑Vorschau.
- FF-14: Responsive Tablet-/Mobilansichten mit Figuren-Drawer, Teile-/Figur-/Liste-Tabs und Escape-/Fokus-Rückgabe für Tastaturbedienung.
- FF-15: Robuster Scene-Lifecycle mit abortierbarem Prototypcache, getrenntem GPU-Ressourceneigentum, idempotentem Dispose und sichtbarer Wiederherstellung bei Fehler oder WebGL-Kontextverlust.
- FF-16: Hashgebundene Default-Deny-Kompatibilitätsmatrix plus 10 digitale Verbindungsentscheidungen: acht Modelle sind digital platzierbar, `11439` und die unvollständige Torsohülle bleiben gesperrt.
- Digitale LDraw-Verbindung: Köpfe, Kopfbedeckungen und zwei Handaccessoires werden reproduzierbar aus offiziellen Baugruppen- und LDCad-Snapdaten platziert. Dafür ist keine menschliche Eingabe nötig; eine physische Klemmkraftgarantie wird nicht behauptet.
- FF-17: Lokale Basissuche mit versioniertem Deutsch→Englisch-Normalizer, ID-Schutz, Zusammensetzungen, Negationen, Kategorien, Farben und Regression-Fixtures.
- FF-18: Gepinnte MiniLM-/E5-Modelle, zwei getrennte 384-dimensionale FP32-Indizes, Modell-/Index-Sperre und blindes Review-Artefakt; Metriken, ADR und Profilwahl bleiben bis zur menschlichen Relevanzfreigabe blockiert.
- Semantische Suche (Beta): Der kompakte MiniLM-Kandidat ist über einen Web-Worker in die App integriert. 2.726 exakt dargestellte Teile sind vorab eingebettet; derselbe Embedding-Text enthält Katalogname, offizielle LDraw-Beschreibung, Kategorie, Rolle, Farbe und Teilenummer. Suchtexte verlassen das Gerät nicht. Das 42,44-MB-Paket wird beim Öffnen des Builders automatisch geladen und danach im Browsercache wiederverwendet. Die endgültige Profilfreigabe bleibt bis zum menschlichen FF-18-Relevanzreview blockiert.
- FF-21: 17 kataloggebundene englische Suchdokumente, ein getrenntes deutsches Lexikon-Delta und 160 Fälle mit 80 Entwicklungs- und 80 Holdout-Fällen; Relevanzlabels bleiben ausdrücklich menschliche Arbeit.
- FF-22/FF-23 MVP: Der aktuelle Entwurf und eine lokale Sammlung werden verzögert in IndexedDB gespeichert. Versionierter JSON-Import/-Export ist auf fünf digitale Slots, 64 KiB und bekannte FigForge-Komponenten begrenzt; unbekannte Teile werden nicht still ersetzt. Die Datenbankmigration auf Version 2 erhält bestehende Entwürfe.
- Das öffentliche Deployment wird nach einem freigegebenen Merge ausschließlich durch Cloudflare Workers Builds aktualisiert.
- Keine Rebrickable API und keine MOC-Dateien.
- Cloudflare liefert ausschließlich die gebauten statischen Assets aus; GitHub Actions führt kein Produktionsdeployment aus.

## Lokale Prüfung

Voraussetzung: Node.js 24 und npm 11.

```bash
npm ci
npm run verify
```

Für die lokale menschliche FF-18-Entwicklungsbewertung:

```bash
npm run review:ff18
```

Danach `http://127.0.0.1:4179` öffnen. Die Oberfläche zeigt ausschließlich die 80 Entwicklungsfälle, speichert jede 0/1/2-Bewertung lokal und gibt den Export erst nach vollständiger Bewertung frei. Der Holdout wird weder angezeigt noch vom Bewertungsendpunkt akzeptiert.

Für den kompakten Relevanztest des tatsächlich ausgelieferten 2.726-Teile-Index:

```bash
npm run review:semantic-release
```

Danach `http://127.0.0.1:4183` öffnen. Die lokale Oberfläche zeigt 20 verblindete Development-Anfragen mit vorhandenen Teilebildern. Zehn Holdout-Anfragen und die Herkunft aus Basis- oder Hybridsuche bleiben verborgen. Nach vollständiger 0/1/2-Bewertung stehen die Rohurteile und der Bericht mit nDCG@5 und Success@5 zum Download bereit.

`npm run data:validate:ff03` prüft das Testsortiment gegen den exakten Source-Lock-Hash. `npm run data:validate:ff05` prüft die vier synthetischen Anker einschließlich Hierarchie und Veröffentlichungssperre. `npm run data:validate:ff06` prüft die ersten Beschaffungsrezepte gegen FF-03 und vergleicht die berechnete Teileliste mit dem festgeschriebenen Ergebnis. `npm run data:validate:ff16` prüft die hashgebundene Kompatibilitätsmatrix, vollständige FF-03-Abdeckung, Fixture-Warnungen und Ausschlüsse. `npm run assets:build:connectivity` erzeugt die digitale Anschluss-Registry aus gepinnten LDraw-/LDCad-Daten; `npm run assets:validate:connectivity` prüft Hashes, Lizenzheader, Transformmatrizen und Default-Deny-Sperren. `npm run data:validate:ff17` prüft Lexikon, Normalizer-Version, Regression-Fixtures, unbekannte Wörter und exakte ID-Suche. `npm run data:build:ff21` erzeugt die deterministischen FF-21-Suchartefakte; `npm run data:validate:ff21` prüft Dokumente, Lexikon-Delta, 80/80-Split und Holdout-Sperre. `npm run data:build:ff18` erzeugt aus lokal vorgeprüften, gepinnten Modelldateien zwei getrennte Indizes und das blinde Review-Artefakt; `npm run data:validate:ff18` prüft Hashketten, L2-Normen, Profiltrennung und Entscheidungssperre. `npm run search:benchmark:preflight` endet bis zu den menschlichen Relevanzurteilen absichtlich mit Exitcode 2. `npm run data:review:mappings` erzeugt den deterministischen FF-09-Report; `npm run data:validate:mappings` prüft ihn gegen die aktuellen Quelldateien und verbietet erfundene Kandidaten. `npm run assets:build` erzeugt das reproduzierbare synthetische FF-10-Fixturepaket; `npm run assets:validate` prüft Quellhashes, Bytegleichheit, Pfade und Thumbnail-Budget. `npm run licenses:build` erzeugt das FF-11-Assetmanifest und öffentliche Quellenhinweise; `npm run licenses:validate` prüft Manifest, Lizenz-Hashes, Provenienz und blockierte Freigabe. `npm run data:refresh` führt einen netzwerkfreien Grenzcheck aus. `npm run data:refresh:remote` ist ausschließlich für den geplanten GitHub-Actions-Lauf vorgesehen und schreibt generierte Katalogdaten für den Review-Pull-Request. Roharchive bleiben transient.

`npm run assets:analyze:ldraw-coverage` erzeugt den vollständigen LDraw-Restbestandsbericht. `npm run assets:validate:ldraw-coverage` gleicht ihn mit Katalog, Connectivity und der gepinnten offiziellen LDraw-Bibliothek ab.

Gedruckte Kopf- und Kopfbedeckungsvarianten ohne eigenes offizielles LDraw-Modell dürfen ausschließlich die in der gelockten Rebrickable-Datei `part_relationships.csv.gz` deklarierte, eindeutig zugeordnete Grundgeometrie verwenden. Diese Einträge sind in der Oberfläche ausdrücklich als „Geometrie ohne Druck“ gekennzeichnet; Druck und Dekor werden nicht erfunden.

## Lieferung

- `docs/implementation-plan.md`: verbindlicher Plan.
- `docs/decisions/`: Architekturentscheidungen.
- `docs/source-register.md`: Quellen- und Freigabestatus.
- `docs/test-reports/FF-03-assortment-report.md`: FF-03-Abnahme und offene Nachweise.
- `docs/test-reports/FF-04-scene-report.md`: FF-04-Prüfung und Browserergebnis.
- `docs/test-reports/FF-05-anchor-report.md`: FF-05-Abnahme, Platzierungsprüfung und Grenzen.
- `docs/test-reports/FF-06-procurement-report.md`: FF-06-Abnahme, Soll-Teileliste und Sperrverhalten.
- `docs/test-reports/FF-07-poc-report.md`: FF-07-Abnahme und lokaler Browsernachweis.
- `docs/test-reports/FF-08-refresh-report.md`: FF-08-Adapter, Normalisierung und Actions-Nachweis.
- `docs/test-reports/FF-09-mapping-review-report.md`: FF-09-Mapping-Review, Dublettenprüfung und offene Blocker.
- `docs/test-reports/FF-10-assets-report.md`: FF-10-Modellpaket, Thumbnail-Pipeline und Nichtveröffentlichungsgrenzen.
- `docs/test-reports/FF-11-manifest-report.md`: FF-11-Manifest, Lizenzstatus, Provenienz und Quellenhinweise.
- `docs/test-reports/FF-12-ui-primitives-report.md`: FF-12-Design-Tokens und UI-Primitiven mit Static-Markup-Nachweis.
- `docs/test-reports/FF-13-workspace-report.md`: FF-13-Arbeitsfläche, Katalogkarten, Figurenpanel und Responsive-Grenzen.
- `docs/test-reports/FF-14-responsive-report.md`: FF-14-Breakpoints, Drawer, mobile Tabs und Tastaturfluss.
- `docs/test-reports/FF-15-scene-lifecycle-report.md`: FF-15-Race-, Cache-, Dispose- und Fehlerpfadprüfung.
- `docs/test-reports/FF-16-compatibility-report.md`: FF-16-Matrix, Ausschlussregeln und Warnzustände.
- `docs/test-reports/FF-05-FF-16-digital-connectivity-report.md`: digitale Anschlussprofile, abgedeckte Modelle und verbleibende Default-Deny-Sperren.
- `docs/test-reports/FF-17-search-report.md`: FF-17-Basissuche, Normalizer und Regression-Fixtures.
- `docs/test-reports/FF-18-preflight-report.md`: FF-18-Indexnachweis und begründete Entscheidungssperre.
- `docs/test-reports/semantic-search-beta-report.md`: App-Integration, Paketgrößen, Integritätsprüfung und verbleibende Entscheidungssperre.
- `docs/test-reports/semantic-search-release-review-report.md`: kompakter, blinder Release-Test gegen den 2.726-Teile-Index.
- `docs/test-reports/FF-21-search-report.md`: FF-21-Suchdokumente, Lexikon-Delta und 160-Fälle-Split.
- `docs/test-reports/FF-22-FF-23-local-figure-report.md`: lokales Autosave sowie sicherer JSON-Import/-Export des aktuellen Entwurfs.
- `data/curated/ff21-search-documents.json`: kataloggebundene englische Suchdokumente mit Quellen-Evidence.
- `data/curated/ff21-search-lexicon.json`: deutsches Lexikon-Delta auf dem versionierten FF-17-Layer.
- `data/curated/ff21-search-testset.json`: 160 Fälle, getrennte Entwicklungs-/Holdout-Hälfte ohne Relevanzlabels.
- `data/search-models.lock.json`: gepinnte Modellrevisionen, Dateigrößen und SHA-256-Werte.
- `data/generated/search-indices/`: getrennte FP32-Indizes und Profilmanifeste für MiniLM und E5.
- `data/generated/semantic-search-release.json`: gehashter Vertrag des ausgelieferten MiniLM-Betapakets.
- `public/search/`: statisches MiniLM-Modell, Tokenizer, ONNX-WASM-Laufzeit und 2.726-Teile-Index.
- `data/review/ff18-relevance-review.json`: blindes, noch vollständig unbeschriftetes menschliches Review-Artefakt.
- `data/review/semantic-search-release-review.json`: kompakter, noch unbeschrifteter Basis-/Hybridvergleich für den ausgelieferten Index.
- `tools/review-ui/` und `tools/ff18-review-server.ts`: ausschließlich lokale Review-Oberfläche mit getrenntem Autosave und Holdout-Sperre.
- `data/curated/ff03-test-assortment.json`: gelockte Katalogkandidaten und Varianten.
- `data/curated/ff05-anchor-registry.json`: nicht veröffentlichbares Ankerprofil der synthetischen Prüfgeometrie.
- `data/curated/ff06-procurement-recipes.json`: erste reale, wegen fehlender BrickLink-Evidence blockierte Beschaffungsrezepte.
- `data/generated/mapping-review.json`: deterministischer FF-09-Review-Report; keine Kandidaten werden ohne Evidence geraten.
- `data/generated/model-packages.json`: FF-10-Index des synthetischen Fixturepakets und seiner Thumbnails.
- `data/generated/asset-manifest.json`: FF-11-Manifest mit Hashes, Lizenzstatus und Release-Blockern.
- `data/generated/ldraw-fit-review.json`: deterministische Vorprüfung der 10 belegten LDraw-Modelle; keine menschlichen Ergebnisse und keine positive Passformaussage.
- `data/generated/ldraw-digital-connectivity.json`: reproduzierbare digitale Platzierung für acht Modelle; zwei Modelle bleiben explizit blockiert.
- `data/vendor/ldcad-shadow/`: minimale gepinnte CC-BY-SA-4.0-Teilmenge der LDCad Shadow Library samt Revision und Lizenzheadern.
- `data/curated/ff16-compatibility-matrix.json`: Default-Deny-Matrix für reale Katalogkandidaten und synthetische Fixture-Regeln.
- `data/curated/ff17-search-lexicon.json`: versionierter Deutsch→Englisch-Begriffs-Layer.
- `data/curated/ff17-search-fixtures.json`: positive und negative Normalizer-Fixtures.
- `src/contracts/`: versionierte Laufzeitverträge.
- `src/storage/figure-draft-store.ts`: IndexedDB-Autosave des aktuellen lokalen Entwurfs.
- `src/figure/figure-document.ts`: begrenzter, validierter JSON-Codec ohne externe URLs.
- `.github/workflows/`: CI und geplanter Daten-PR.
- `wrangler.jsonc`: assets-only Cloudflare-Konfiguration ohne API-Handler.
