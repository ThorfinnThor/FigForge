# FF-14-Verifikationsbericht: Responsive Ansichten und Tastaturfluss

Stand: 27. September 2026.

## Ergebnis

FF-14 ergänzt die FF-13-Arbeitsfläche um die im Plan festgelegten responsiven Zustände:

- Zwischen 1100 und 1439 px bleibt Katalog und Vorschau sichtbar; „Deine Figur“ öffnet sich als rechter Drawer.
- Zwischen 768 und 1099 px werden Kategorien zu einer horizontalen Chipleiste; der Figurenbereich bleibt als Drawer verfügbar.
- Unter 768 px gibt es die Tabs „Teile“, „Figur“ und „Liste“. Nur der aktive Bereich wird gerendert.
- Der mobile Filter bleibt oben angeheftet; Touchziele der neuen Navigation und Drawer-Aktionen sind mindestens 44 CSS-Pixel hoch.
- Escape schließt den Drawer. Nach dem Schließen kehrt der Fokus zum Öffnen-Button zurück; beim Öffnen erhält der Schließen-Button den Fokus.

Die Umsetzung verändert weder die Katalogquelle noch den Status der FF-03-Kandidaten. Rebrickable Catalog Downloads/CSV bleibt die einzige erlaubte Katalogquelle; MOC-Dateien, MOC-Inhalte und Rebrickable-API-Daten werden weiterhin ausgeschlossen.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| FF-14-Unit-Tests | Erfolgreich; Responsive-Tabs, Drawer-Attribute, Escape-/Fokusfluss und Breakpoint-CSS geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich. |
| `npm run build` | Erfolgreich. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run ohne Bindings. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen. |

## Offene Risiken

1. Eine visuelle Browserabnahme bei den sieben Plan-Breiten sowie mit 200-%-Zoom und kurzer Fensterhöhe steht noch aus.
2. Die vollständige 3D-Szene wird bei ausgeblendetem Mobile-Tab nicht gerendert; ein späterer Renderer-Lifecycle-Test muss zusätzlich Ressourcenfreigabe und Renderloop prüfen.
3. Der Drawer enthält weiterhin nur blockierte FF-03-Auswahlzustände und keine Kauf-, Export- oder Detailaktion.
