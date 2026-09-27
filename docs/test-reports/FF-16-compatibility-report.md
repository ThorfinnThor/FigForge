# FF-16-Verifikationsbericht: Kompatibilitätsmatrix

Stand: 27. September 2026.

## Ergebnis

FF-16 führt eine versionierte und hashgebundene Default-Deny-Matrix ein:

- 17 reale FF-03-Komponenten besitzen genau eine blockierende Regel, weil ihre Anschlussprofile noch nicht verifiziert sind.
- Vier FF-05-Platzierungsfamilien dürfen ausschließlich mit synthetischer Prüfgeometrie verwendet werden und erzeugen immer eine sichtbare Warnung.
- Drei bereits ausgeschlossene Rebrickable-Teilenummern sowie fünf im Plan ausgeschlossene Familien werden hart blockiert.
- Kopfbedeckungen nutzen einen einzelnen Slot; im Fixture-Modus ersetzt eine neue Auswahl die vorige und meldet dies.
- Nicht bekannte Komponenten, Platzierungsfamilien, Ausschlussfamilien und belegte Slots ohne Richtlinie werden blockiert.

Katalogkarten, Figurenpanel und POC zeigen den Kompatibilitätsstatus an. Die Umsetzung verwendet weiterhin ausschließlich Rebrickable Catalog Downloads/CSV für Katalogmetadaten; MOC-Dateien, MOC-Inhalte und die Rebrickable API bleiben ausgeschlossen.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:validate:ff16` | Erfolgreich; 17 Komponentenregeln, 4 Fixture-Regeln, 8 Ausschlüsse und 1 Slotrichtlinie. |
| FF-16-Unit-Tests | Erfolgreich; reale Blockierung, falscher Slot, Fixture-Warnung, unbekannte Regel, Ausschlüsse und Headwear-Ersetzung geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich. |
| `npm run build` | Erfolgreich. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run ohne Bindings. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen. |

## Offene Risiken

1. Es gibt noch keine positiv freigegebene reale Kombination. LDraw-, Anschluss- und Human-Evidence fehlen weiterhin.
2. Die geforderten menschlichen Stichproben mit realen freigegebenen Assets stehen aus.
3. Die Matrix ist bewusst keine vollständige Kollisions- oder Steckbarkeitssimulation.
