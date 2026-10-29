# ADR-048: Die Sammlungsansicht zeigt die gewählten Einkaufsfarben

**Status:** akzeptiert
**Datum:** 2026-10-29

## Kontext

ADR-036 führte die Einkaufsfarbe in der 3D-Vorschau des Builders ein und hielt als
Folge fest, die Sammlungsansicht zeige gespeicherte Figuren weiter in Modellfarben,
weil die Vorlagen der Teile dort geteilt werden. Ein Nutzertest (2026-10-29) zeigte,
was das für Nutzer heißt: Dieselbe gespeicherte Figur hat im Builder einen gelben
Kopf und auf der Sammlungsbühne einen grauen, während das gespeicherte Vorschaubild
(aus dem Builder) gelb bleibt. Das wirkt wie ein Speicherfehler.

## Entscheidung

Die Sammlung liest die gespeicherte Farbe jedes Teils (`rebrickableColorId` im
Figurendokument) und löst sie mit derselben Zuordnung auf wie der Builder
(`previewColorForRebrickableColor`). `CollectionSceneController` ruft
`applyPreviewColor` auf dem **eigenen Klon** der Teilevorlage auf. Die Funktion ersetzt
nur Materialien mit Farbcode 10000 durch eigene Kopien; die geteilte Vorlage und andere
Figuren mit demselben Teil bleiben unverändert. Wird die Bühne neu aufgebaut, gibt
`disposePreviewColorMaterials` genau diese Kopien frei, Geometrie und geteilte
Materialien bleiben.

Teile ohne gespeicherte oder ohne zuordenbare Farbe zeigen wie im Builder die
Modellfarbe.

## Folgen

- Builder, Sammlungsbühne und Vorschaubild zeigen dieselben Teilefarben.
- Das Wiederherstellen alter Vorschaubilder (`LegacyFigurePreviewMigrator`) nutzt
  dieselbe Auswahl und erzeugt damit ebenfalls Bilder in Einkaufsfarben.
- Der Aufbau einer Bühne erzeugt pro Teil mit Farbe ein paar Materialkopien mehr; die
  Vorlagen und Modelle werden weiterhin nur einmal geladen.
- Ersetzt die Folge „Sammlungsansicht in Modellfarben“ aus ADR-036.
