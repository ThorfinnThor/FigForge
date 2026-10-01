# Semantische Suche: kompakter Release-Relevanztest

Stand: 1. Oktober 2026.

## Ergebnis

Der öffentliche MiniLM-Betastand kann jetzt gegen den tatsächlich ausgelieferten Index mit 2.726 exakt dargestellten Teilen blind bewertet werden. Das Review umfasst 30 kuratierte deutsche und englische Suchanfragen aus allen fünf Builder-Kategorien: 20 Development-Fälle werden lokal angezeigt, 10 Holdout-Fälle bleiben serverseitig verborgen.

Je Anfrage werden die ersten fünf Treffer der Basissuche und der ausgelieferten Hybridsuche vereinigt, deterministisch verblindet und zusammen mit dem vorhandenen lokalen LDraw-Bild angezeigt. Die Oberfläche verrät weder Systemherkunft noch Rang. Bewertungen verwenden ausschließlich 0 (unpassend), 1 (akzeptabel) und 2 (sehr passend).

`npm run review:semantic-release` startet die Oberfläche auf `127.0.0.1:4183`. Fortschritt wird atomar in einer ignorierten lokalen Datei gespeichert. Erst nach allen Development-Bewertungen werden der Urteils-Export und ein Messbericht mit nDCG@5 und Success@5 insgesamt sowie getrennt nach Deutsch und Englisch freigeschaltet.

## Grenzen

- Der kompakte Test ist ein schneller Release-Audit und ersetzt noch nicht den vollständigen FF-18-Nachweis nach Kapitel 8.7 mit nDCG@10, E5-Vergleich und 160 vollständig menschlich bewerteten Fällen.
- Es sind noch keine menschlichen Labels vorhanden; deshalb wird weder eine Qualitätsfreigabe noch eine Ranking-Änderung behauptet.
- Der Holdout bleibt bis nach einer nachvollziehbar dokumentierten Development-Anpassung verborgen.
- Nur Rebrickable Catalog Downloads/CSV; keine Rebrickable API und keine MOC-Dateien.

