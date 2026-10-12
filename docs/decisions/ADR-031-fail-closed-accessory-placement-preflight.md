# ADR-031: Fail-closed Vorprüfung für Zubehör-Platzierungen

## Status

Akzeptiert — 2026-10-12

## Kontext

Die versionierte Sichtprüfung aus ADR-030 ist zuverlässig, aber eine vollständige manuelle Dreiansichtenprüfung aller Zubehörteile skaliert nicht. Die generierte Warteschlange enthält neben tatsächlich schwierigen Formen auch viele kollisionsfreie Teile mit genau einem erkannten Griff und ohne Ausdehnungsrisiko. Eine rein automatische Freigabe wäre trotzdem nicht vertretbar, weil Geometrie- und Kollisionsdaten die sichtbare Bedeutung eines Mundstücks, einer Klinge oder eines zweiten Handgriffs nicht vollständig erfassen.

## Entscheidung

`tools/review_accessory_placements.py` führt vor dem Rendern eine deterministische, ausschließlich lokale Vorprüfung durch. Das Skript benötigt keine zusätzlichen Python-Pakete und verarbeitet die versionierte Orientierungswarteschlange sowie die kuratierten Entscheidungen.

Die Vorprüfung trennt Einträge in drei Klassen:

- `screened-low-risk`: kollisionsfrei, genau ein Griff und keine offene Ausdehnungs- oder Bedeutungswarnung;
- `manual-three-view-review`: lange, mehrdeutige oder semantisch orientierungsabhängige Geometrie;
- `block-recommended`: erkannte Kollision oder eine Form, deren erkannter Zylinder nicht als gewöhnlicher Handgriff ausreicht.

Das Ergebnis ist absichtlich nicht veröffentlichungsfähig und ändert weder kuratierte Entscheidungen noch Katalogdaten. Auf jedem Lauf dienen die vorhandenen Freigaben und Sperren als Regressionslabels: Eine bekannte Sperre darf nie als niedriges Risiko und eine bekannte Freigabe nie als Sperre klassifiziert werden. Der Bericht liefert außerdem repräsentative Teilnummern pro identischer Geometrie-Familie. Der Browser-Job rendert nur diese Restmenge.

## Konsequenzen

- Die aktuelle Warteschlange wird vollständig in Sekunden geprüft; nur die Restmenge benötigt Screenshots.
- Varianten mit identischer Platzierung und Validierung werden gemeinsam behandelt.
- Ein grüner Vorprüfungsstatus ist keine Sichtfreigabe. Nur `data/curated/ldraw-accessory-placement-reviews.json` kann die Release-Eignung verändern.
- Neue unbekannte Risikoflags und widersprüchliche Familien bleiben fail-closed beziehungsweise brechen den Lauf ab.
- Die semantischen Regeln müssen bei neuen Objektklassen erweitert werden; sie ersetzen kein allgemeines visuelles Verständnis.
