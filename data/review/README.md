# FF-18 Human Review

`ff18-relevance-review.json` ist die unveränderte, blind zusammengestellte Quelle mit Entwicklungs- und Holdout-Fällen. Nicht direkt bearbeiten.

Die lokale Oberfläche wird mit `npm run review:ff18` gestartet und bindet ausschließlich an `127.0.0.1:4179`. Sie zeigt nur die 80 Entwicklungsfälle. Der Autosave landet in `ff18-development-progress.json`, das absichtlich ignoriert wird. Erst nach vollständiger Bewertung aller Entwicklungskandidaten wird der JSON-Export freigeschaltet.

Der Holdout bleibt verborgen und darf weder über die Oberfläche noch über den Bewertungsendpunkt bearbeitet werden.

Die frühere lokale LDraw-Einzelprüfung ist durch die versionierte digitale Anschluss-Registry ersetzt und gehört nicht mehr zum aktiven Arbeitsablauf. Historische Vorprüfungsartefakte dürfen keine Laufzeitfreigabe erzeugen.
