# ADR-016: Dokumentierte Zubehörgriffe ohne LDraw-Zylinderprimitive

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Bei 270 noch gesperrten Zubehörteilen enthält die offizielle LDraw-Geometrie kein erkanntes Rundzylinder-Primitiv in Handgriffgröße. Das beweist nicht, dass das reale Teil keinen Griff besitzt: LDraw kann diese Form direkt durch Dreiecke oder Unterteile beschreiben. Die gepinnte LDCad Shadow Library dokumentiert bei 23 dieser Katalogteile genau einen männlichen Rundverbinder in Handgriffgröße.

## Entscheidung

Die 270 Fälle werden gegen die bereits gepinnte LDCad-Revision geprüft. Die 23 eindeutig dokumentierten Fälle werden in `data/curated/ldraw-no-radius-grip-clearance-reviews.json` versioniert und mit der geschlossenen Referenzgeometrie aus ADR-014 getestet. Alle 23 bestehen die digitale Kollisionsprüfung. Die übrigen 247 besitzen in der gepinnten Anschlussquelle keinen eindeutig einzelnen Handgriff und bleiben ohne Raten gesperrt.

Es gelten weiterhin ausschließlich Rebrickable Catalog Downloads/CSV, die gepinnte offizielle LDraw-Bibliothek und die gepinnte LDCad Shadow Library. Rebrickable-API und MOC-Dateien sind ausgeschlossen.

## Folgen

Der Builder erhält 23 weitere reproduzierbar platzierte Zubehörteile. Digitale Kollisionsfreiheit ist keine Garantie für reale Klemmkraft, Materialspannung oder die Vollständigkeit von nicht modellierten Anti-Verbindungen.
