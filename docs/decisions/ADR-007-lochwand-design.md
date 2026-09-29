# ADR-007: Gestaltungsrichtung „Lochwand“

- Status: angenommen
- Datum: 2026-09-29
- Entscheidung durch: Projektverantwortlicher, nach Vergleich von drei gerenderten Richtungen (Werkbank, Bauanleitung, Lochwand) und einem Mix

## Entscheidung

Die Builder-Oberfläche wird als Lochwand eines Spielwarenladens gestaltet. Katalogteile hängen als Blisterkarten mit Euro-Aufhängung, jede Kategorie hat eine eigene Farbe (Köpfe Gelb, Kopfbedeckung Blau, Oberkörper Rot, Beine Grün, Zubehör Violett), die Figur steht auf einem Drehteller in einer beleuchteten Vitrine und die fertige Figur ist selbst eine Blisterkarte.

Typografie: Lilita One für Wortmarke und Überschriften, Rubik für Oberfläche und Fließtext. Beide werden selbst gehostet (SIL OFL 1.1, siehe `docs/source-register.md`).

Diese Entscheidung ersetzt die visuellen Vorgaben aus Kapitel 4 des Implementierungsplans (heller Katalog, Grün-/Lime-Akzente, Manrope/Kalam) und die Farb- und Schriftwirkung von `design/reference.png`. Unverändert bleiben die vier Arbeitszonen (Kategorien, Katalog, Vorschau, Figur), die Breakpoints, Drawer- und Tab-Verhalten, Fokusführung sowie alle inhaltlichen Grenzen der Referenz.

## Konsequenzen

- Keine neuen Funktionen: Kategorien, Suche, Ergebnisraster, 3D-Vorschau mit drei Kameraansichten, fünf Figurslots, lokales Speichern und JSON-Import/-Export bleiben wie bisher.
- Status bleiben sichtbar unterschieden: „Digital verbunden“, „Geometrie ohne Druck“ und gesperrte Einträge.
- Die 3D-Szene rendert mit transparentem Hintergrund; der Vitrinenhintergrund kommt aus CSS. Der Drehteller ist kleiner als die bisherige Standfläche.
- Die FF-12-Basistokens bleiben in `src/styles/tokens.css` erhalten, weil der FF-12-Test sie festschreibt; die neue Oberfläche nutzt die zusätzliche Lochwand-Ebene. Ob der FF-12-Sollwert angepasst wird, entscheidet der Projektverantwortliche.
- Kapitel 4 des Implementierungsplans beschreibt weiterhin die alte Gestaltung, bis es gesondert nachgezogen wird.
