# FF-12-Verifikationsbericht: Design-Tokens und UI-Primitiven

Stand: 27. September 2026.

## Ergebnis

FF-12 führt die im Plan festgelegten Oberflächen-Tokens in `src/styles/tokens.css` ein: Arbeitsflächenfarben, Flächen, Text- und Fokusfarben, Grün/Lime-Funktionsfarben, Warn-/Fehlerfarben, Radien, Abstände und Panel-Schatten.

Die wiederverwendbaren Primitiven liegen unter `src/components/ui/`:

- `Button`: Primär-, Sekundär-, Ghost- und Danger-Varianten, drei Größen, Loading-/Disabled-Zustand und sichtbarer Tastaturfokus.
- `TextInput`: sichtbares Label, Hinweis, Fehlerstatus, `aria-describedby` und `aria-invalid`.
- `Card`: neutrale Karte und ausgewählter Zustand ohne reine Farbcodierung.
- `StatusMessage`: Info-, Success-, Warning- und Danger-Töne mit Live-Region.

Der bestehende FF‑07‑POC verwendet die neuen Buttons, die Card für die Vorschau und die Statuskomponente. Es wurden keine externen Font-CDNs, neuen Datenquellen oder Deployment-Schritte eingeführt.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| UI-Static-Markup-Tests | Erfolgreich; 14 Testdateien, 41 Tests insgesamt. Loading, Fokusattribute, Label-/Fehlerverknüpfung, Card-Auswahl und Status-Ton geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich. |
| `npm run build` | Erfolgreich; neue UI-CSS-Datei erzeugt. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run ohne Bindings. |

## Offene Risiken

1. Die vollständige responsive Arbeitsfläche, PartCards, Suche und visuelle Browserabnahme gehören zu späteren UI-Tickets.
2. Manrope und Kalam sind weiterhin nicht lokal eingebunden; bis dahin greifen System-Fallbacks.
3. Kein öffentliches Deployment und kein verbundener GitHub-Remote wurden hergestellt.
