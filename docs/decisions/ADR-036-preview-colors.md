# ADR-036: Einkaufsfarbe in der 3D-Vorschau

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

Die Farbauswahl für die Einkaufsliste änderte die 3D-Vorschau nicht; die
Oberfläche wies darauf hin. Jede Katalogmodelldatei deklariert ihre Hauptfarbe
als eigene LDraw-Farbe (Code 10000); feste Farben im Teil (Aufdrucke, Arme,
Hände) stehen in der offiziellen Teiledatei selbst.

## Entscheidung

`tools/lib/preview-colors.ts` ordnet jede Rebrickable-Farbe, die im
Shop-Export vorkommt, genau dann einer Farbe der gelockten offiziellen
LDraw-Farbtabelle (`LDConfig.ldr`) zu, wenn der normalisierte Name
übereinstimmt (Groß-/Kleinschreibung, `_`/`-`, „Grey“/„Gray“) und genau ein
Treffer existiert. Das Ergebnis liegt in `data/generated/preview-colors.json`
mit Code, Hex und Alpha. Nicht zugeordnet bleiben Farben ohne Namenstreffer
(z. B. „Dark Purple“, „Pearl Titanium“), mehrdeutige Namen und Farben mit
LDraw-Materialeffekt (Glitter, Speckle, Opal); der Grund steht in der Datei.
Der Validator (`data:validate:preview-colors`, Teil von `verify`) baut die Datei
neu und vergleicht sie. Es werden keine Farben geraten und keine zusätzlichen
Quellen herangezogen.

Zur Laufzeit ersetzt `applyPreviewColor` (`src/scene/preview-color.ts`) nur das
Material mit Farbcode 10000 durch eine eigene Kopie in der gewählten Farbe
(transparente Farben mit Alpha). Teile mit festen Farben behalten sie; die
Materialien des Loaders bleiben unverändert, und „keine Farbe“ stellt das
Original wieder her. Ein Farbwechsel bei gleichem Teil lädt kein Modell neu.

## Folgen

- Bei mehrfarbigen Teilen ändert sich nur die Hauptfarbe.
- Bei nicht zugeordneten Farben zeigt die Vorschau weiter die Modellfarbe; der
  Hinweis in der Oberfläche sagt das.
- Die Sammlungsansicht zeigt gespeicherte Figuren weiter in Modellfarben; die
  Vorlage-Modelle werden dort geteilt und müssten pro Figur kopiert werden.
- Die Farbtabelle gleicht Namen ab, nicht Messwerte. Weicht eine
  Rebrickable-Farbe vom gleichnamigen LDraw-Ton ab, zeigt die Vorschau den
  LDraw-Ton.
