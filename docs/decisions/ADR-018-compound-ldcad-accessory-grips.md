# ADR-018: Eindeutige Griffsegmente in zusammengesetzten LDCad-Profilen

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Einige offizielle Zubehörmodelle besitzen in der gepinnten LDCad Shadow Library keinen separaten Griffverbinder. Stattdessen beschreibt ein einzelnes `SNAP_CYL`-Profil den vollständigen abgestuften Schaft. Darin kann genau ein männliches Rundsegment in Minifiguren-Handgröße liegen.

## Entscheidung

Ein zusammengesetztes Profil darf als Griffnachweis dienen, wenn es genau ein männliches Rundsegment mit Radius 3,75 bis 4,25 LDU und mindestens 8 LDU Länge enthält. Existiert im selben Teil bereits ein geeigneter separater Ein-Segment-Verbinder, hat dieser Vorrang. Mehrere geeignete Segmente oder Verbinder bleiben gesperrt. Jedes so bestimmte Teil muss zusätzlich den geschlossenen Kollisionscheck der Referenzfigur bestehen.

Die Prüfung nutzt ausschließlich die festgeschriebenen Rebrickable Catalog Downloads/CSV, die offizielle LDraw-Bibliothek und die gepinnte LDCad-Revision. Rebrickable-API und MOC-Dateien werden nicht verwendet.

## Folgen

Fünf weitere Zubehörteile werden reproduzierbar platziert: Eispickel `30193`, gebogener Lichtschwertgriff `61199`, Spritze `87989`, Tennisschläger `93216` und Doppelaxt `95052`. Alle fünf zeigen exakte offizielle LDraw-Geometrie und bestehen den digitalen Kollisionscheck. Eine Garantie für reale Klemmkraft oder Materialspannung entsteht dadurch nicht.
