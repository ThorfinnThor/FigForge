# FF-18: Modell-/Indexvergleich – technischer Stand

Stand: 27. September 2026.

## Ergebnis

FF-18 ist technisch bis zum menschlichen Entscheidungstor umgesetzt, aber noch nicht entscheidungsfähig. Beide Kandidaten wurden mit gepinnten INT8-ONNX-Dateien und `@huggingface/transformers@4.3.0` lokal ausgeführt. Für die 17 FF-21-Dokumente liegen getrennte, L2-normalisierte Float32-Indizes mit jeweils 384 Dimensionen vor.

`compact-minilm` verwendet keinen E5-Präfix und den Normalizer `de-en-domain-v1`; `quality-e5` verwendet `query: ` beziehungsweise `passage: `. Ein absichtlich falsches Modell-/Indexpaar wird vom Laufzeitvertrag abgewiesen.

| Profil | Revision | ONNX-SHA-256 | Index-SHA-256 | Indexgröße |
|---|---|---|---|---:|
| `compact-minilm` | `751bff37182d3f1213fa05d7196b954e230abad9` | `afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1` | `7f19cebb279f29cf5a293f30a8588f46232a158fc236b9e6164f398b7b63ad15` | 26.112 Byte |
| `quality-e5` | `761b726dd34fb83930e26aab4e9ac3899aa1fa78` | `4d24e2bc01a447951524466ef533e52944bf48509e6552810bcee1a2711cb02c` | `97ba9e0ce09e42cce3bd5cf22094f3064bf77c6a4e890ee49aa0e3cf65261b55` | 26.112 Byte |

Das blinde Review-Artefakt enthält 160 Fälle und 1.482 eindeutige Kandidatenzeilen. Sämtliche Relevanzfelder sind `null`. Daher wurden keine nDCG@10- oder Success@5-Werte berechnet und kein Suchprofil ausgewählt. Eine Modellwahl ohne menschliche Urteile würde Abschnitt 8.7 verletzen.

`npm run review:ff18` startet auf `127.0.0.1:4179` eine lokale, responsive Bewertungsoberfläche. Sie liefert ausschließlich 80 Entwicklungsfälle mit 739 Kandidaten aus, speichert atomar in einer separaten ignorierten Fortschrittsdatei und blockiert Holdout-Kandidaten serverseitig. Der Export ist bis zur vollständigen Entwicklungsbewertung gesperrt.

## Reproduzierbare Sperre

`npm run search:benchmark:preflight` prüft drei explizite Artefakte und beendet sich bis zu deren Vorliegen mit Exitcode 2:

| Artefakt | Zuständigkeit | Blockiert |
|---|---|---|
| `data/curated/ff21-search-documents.json` | FF-21 | Aufbau beider Indizes; vorhanden |
| `data/curated/ff21-search-testset.json` | FF-21 | stratifizierter Entwicklungs-/Holdout-Vergleich; vorhanden |
| `data/curated/ff18-relevance-judgments.json` | FF-18, menschliche Bewertung | belastbare Profilentscheidung |

Die technischen FF-18-Artefakte sind Teil von `npm run verify`. Nur die Relevanz- und Entscheidungssperre bleibt bewusst aktiv, bis eine vollständig menschlich bewertete `data/curated/ff18-relevance-judgments.json` vorliegt.

## Unveränderte Grenzen

- Nur Rebrickable Catalog Downloads/CSV; keine API und keine MOC-Dateien oder -Inhalte.
- Modellrevisionen und Dateien wurden gegen die offiziellen gepinnten Quellen geladen und lokal gehasht; die großen ONNX-Dateien werden nicht als öffentliche App-Artefakte ausgeliefert.
- Keine GitHub Action wurde um einen Deployment-Schritt erweitert.
- Kein Cloudflare-Projekt wurde verbunden und kein öffentliches Deployment ausgeführt.
