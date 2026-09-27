# FF-21-Verifikationsbericht: Suchdokumente und stratifizierter Testsatz

Stand: 27. September 2026.

## Ergebnis

FF-21 liefert 17 kataloggebundene englische Suchdokumente, ein deutsches Lexikon-Delta auf dem FF-17-Normalizer und einen deterministischen Testsatz mit 160 Fällen:

- 80 Fälle für Entwicklung/Regelabstimmung.
- 80 Fälle als bis zur Profilentscheidung gesperrter Holdout.
- Je Hälfte: 30 deutsche, 20 englische, 10 Tippfehler-/Zusammensetzungs-, 10 Mehrdeutigkeits-/Negations- und 10 nicht erfüllbare Anfragen.
- Alle Fälle tragen `pending-human-relevance-review`; es gibt keine E5-Proxylabels und keine erfundenen Relevanzstufen.

Die Dokumente verwenden ausschließlich den gelockten FF-03-Katalog: Originalname, Kategorie, belegte Farbe und zugehörige Catalog-CSV-Evidence. Eigene Suchannotation ist als `catalog-derived` markiert und enthält keine Passform-, Verfügbarkeits- oder MOC-Aussage.

## Reproduzierbarkeit

`npm run data:build:ff21` erzeugt die drei JSON-Artefakte deterministisch. `npm run data:validate:ff21` prüft Schema, FF-03-Hash, Dokumentabdeckung, Testsplit, Holdout-Sperre und Source-Policy.

| Artefakt | SHA-256 |
|---|---|
| `data/curated/ff21-search-documents.json` | `0cc01906351678ef9113d6a69cfd57359fa19d9a0eed4d1c8d0c1f4e69eae9bd` |
| `data/curated/ff21-search-lexicon.json` | `3fba84987aa25fed250020597c1897522db488a7a5c1945c7647a0ba1c31c8cb` |

## Grenzen

- Menschliche Relevanzurteile werden erst in FF-18 ergänzt; bis dahin bleibt die Modell-/Indexentscheidung gesperrt.
- Es wurden keine Embeddings, Modellrevisionen, Tokenizer-Hashes oder Benchmarkwerte erzeugt.
- Nur Rebrickable Catalog Downloads/CSV; keine API und keine MOC-Dateien oder -Inhalte.
- Kein GitHub-Deployment und kein öffentliches Cloudflare-Deployment.
