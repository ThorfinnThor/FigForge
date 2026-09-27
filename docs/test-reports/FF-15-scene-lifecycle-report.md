# FF-15-Verifikationsbericht: Scene-Lifecycle

Stand: 27. September 2026.

## Ergebnis

FF-15 macht den Lebenszyklus der Three.js-Szene explizit und transaktional:

- Ein sitzungsgebundener Cache teilt den Asset-Load, gibt jedem Aufrufer aber eigene Geometrie-, Material- und Texturinstanzen.
- Ein abgebrochener Aufrufer beendet nicht den parallel verwendeten Cache-Load.
- Fehlgeschlagene Loads werden verworfen und können erneut geladen werden.
- Neuere Slotanfragen gewinnen weiterhin gegen ältere Antworten; Ergebnisse nach `dispose()` werden freigegeben und nicht mehr eingesetzt.
- Controller-, Coordinator- und Cache-Dispose sind idempotent. Eventlistener, ResizeObserver, OrbitControls, Slotinstanzen, Cacheprototypen, Szenenressourcen, Renderer und WebGL-Kontext werden abgebaut.
- Initialisierungsfehler und WebGL-Kontextverlust erscheinen als sichtbarer Fehlerzustand mit „3D-Szene wiederherstellen“.

Die Szene nutzt weiterhin nur synthetische Prüfgeometrie. Es wurden keine neuen Rebrickable-, MOC- oder LDraw-Daten eingebunden.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Cache-Unit-Tests | Erfolgreich; Einzel-Load, getrennte Ressourcen, unabhängiger Caller-Abbruch, Retry nach Fehler und spätes Dispose geprüft. |
| Coordinator-Unit-Tests | Erfolgreich; Antwortreihenfolge, Transaktion bei Fehler und spätes Ergebnis nach idempotentem Dispose geprüft. |
| Scene-Grenztests | Erfolgreich; expliziter Wiederherstellungspfad und Context-Release statisch geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich. |
| `npm run build` | Erfolgreich. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run ohne Bindings. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen. |

## Offene Risiken

1. Die im Plan geforderten menschlichen Browsernachweise für realen WebGL-Kontextverlust, häufiges Mount/Unmount und GPU-Speicherverhalten stehen aus.
2. Der sichere Deep-Clone-Ansatz vervielfacht GPU-Ressourcen pro sichtbarer Instanz. Erst reale, freigegebene LDraw-Assets erlauben belastbare Speicherbudgets.
3. Reale LDraw-Dateien, ihre Abhängigkeiten und Lizenznachweise bleiben blockiert; der Cache belegt nur den Lifecycle der synthetischen FF-04-Fixtures.
