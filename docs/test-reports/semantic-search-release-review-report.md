# Semantische Suche: kompakter Release-Relevanztest

Stand: 1. Oktober 2026.

## Ergebnis

Der öffentliche MiniLM-Betastand wurde gegen den tatsächlich ausgelieferten Index mit 2.726 exakt dargestellten Teilen blind bewertet. Das Review umfasst 30 kuratierte deutsche und englische Suchanfragen aus allen fünf Builder-Kategorien: 20 Development-Fälle werden lokal angezeigt, 10 Holdout-Fälle bleiben serverseitig verborgen.

Je Anfrage werden die ersten fünf Treffer der Basissuche und der ausgelieferten Hybridsuche vereinigt, deterministisch verblindet und zusammen mit dem vorhandenen lokalen LDraw-Bild angezeigt. Die Oberfläche verrät weder Systemherkunft noch Rang. Bewertungen verwenden ausschließlich 0 (unpassend), 1 (akzeptabel) und 2 (sehr passend).

`npm run review:semantic-release` startet die Oberfläche auf `127.0.0.1:4183`. Fortschritt wird atomar in einer ignorierten lokalen Datei gespeichert. Erst nach allen Development-Bewertungen werden der Urteils-Export und ein Messbericht mit nDCG@5 und Success@5 insgesamt sowie getrennt nach Deutsch und Englisch freigeschaltet.

Die menschliche Development-Bewertung wurde am 1. Oktober 2026 abgeschlossen. Alle 176 Kandidaten sind bewertet; alle 20 Anfragen enthalten mindestens einen relevanten Treffer. Bewertet wurde das Review-Artefakt mit SHA-256 `c2b4d8a72aa84d44e244c3102a8256572b9648f0e56b7a8a2132b28f525bafbf`.

| Segment | Basissuche nDCG@5 | Hybridsuche nDCG@5 | Basissuche Success@5 | Hybridsuche Success@5 |
|---|---:|---:|---:|---:|
| Gesamt, 20 Fälle | 0,363 | **0,857** | 65,0 % | **100 %** |
| Deutsch, 9 Fälle | 0,680 | **0,840** | 100 % | **100 %** |
| Englisch, 11 Fälle | 0,104 | **0,871** | 36,4 % | **100 %** |

Vor der finalen Messung wurde der lokale Deutsch→Englisch-Layer anhand der Development-Fälle erweitert. Außerdem wurde der Farbvergleich korrigiert: `Red` akzeptiert `Red` und `Dark Red`, aber nicht mehr `Reddish Brown`. Bestehende menschliche Urteile wurden nur für identische Fall-/Komponentenschlüssel übernommen; neue Kandidaten wurden erneut blind bewertet.

## Grenzen

- Der kompakte Test ist ein schneller Release-Audit und ersetzt noch nicht den vollständigen FF-18-Nachweis nach Kapitel 8.7 mit nDCG@10, E5-Vergleich und 160 vollständig menschlich bewerteten Fällen.
- Die Messung belegt die Freigabe des vorhandenen kompakten Profils als lokale Beta für diesen Development-Satz. Sie ist keine allgemeine Qualitätsgarantie für beliebige Formulierungen.
- Der Holdout bleibt bis nach einer nachvollziehbar dokumentierten Development-Anpassung verborgen.
- Nur Rebrickable Catalog Downloads/CSV; keine Rebrickable API und keine MOC-Dateien.
