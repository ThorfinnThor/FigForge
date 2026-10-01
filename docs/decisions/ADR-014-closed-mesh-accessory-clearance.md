# ADR-014: Geschlossene Mesh-Prüfung für abgelehnte eindeutige Zubehörgriffe

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Die konservative Zubehörprüfung behandelt jede Probe innerhalb der achsenparallelen Begrenzungsbox eines Körperteils als Kollision. Bei zwanzig Zubehörteilen mit genau einem offiziellen Radius-4-Griff führte das zu möglichen Fehlalarmen an gerundeten oder abgeschrägten Körperflächen. Eine pauschale Freischaltung wäre ebenso falsch wie das dauerhafte Sperren belegbar kollisionsfreier Platzierungen.

## Entscheidung

Die zwanzig Restfälle werden in `data/curated/ldraw-unique-grip-clearance-reviews.json` versioniert. Nur für diese feste Gruppe ergänzt der Generator den bisherigen Begrenzungsbox-Test um einen geschlossenen Mesh-Test: Eine Probe zählt erst dann als Kollision, wenn ein deterministischer Strahltest sie innerhalb der tatsächlichen triangulierten Referenzgeometrie verortet. Griffdurchmesser, Mindestlänge, starre Transformation, Größenlimit und alle deterministischen axialen Kontaktpunkte bleiben unverändert verbindlich.

Der Lauf muss die sieben freigegebenen und dreizehn weiterhin gesperrten Ergebnisse reproduzieren. Andere Zubehörteile behalten ohne eigene Prüfung die konservative Begrenzungsbox-Regel. Es werden ausschließlich die gepinnte offizielle LDraw-Bibliothek, die gepinnte LDCad Shadow Library und Rebrickable Catalog Downloads/CSV verwendet; Rebrickable-API und MOC-Dateien bleiben ausgeschlossen.

## Folgen

Sieben zuvor durch grobe Begrenzungsboxen blockierte Teile erhalten eine reproduzierbar kollisionsfreie digitale Platzierung. Dreizehn Teile bleiben gesperrt. Die Prüfung belegt digitale Geometriefreiheit in der Referenzfigur, aber keine physische Klemmkraft, Materialspannung oder universelle reale Kompatibilität.
