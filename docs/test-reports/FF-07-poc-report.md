# FF-07 Verifikationsbericht: Klickbarer POC

Stand: 27. September 2026.

## Ergebnis

FF-07 erweitert die lokale Prüfoberfläche zu einem kleinen klickbaren POC für Kopf, Kopfbedeckung und beide Handaccessoire-Slots. Es stehen fünf Kopfkandidaten, fünf Kopfbedeckungskandidaten sowie drei synthetische Optionen je Hand zur Verfügung. Jede Auswahl verwendet weiterhin die FF-05-Anker-Registry und den transaktionalen Teiltausch.

Die Optionen tragen weiterhin reale FF-03-Kandidaten-IDs als Auswahlreferenz, laden aber ausschließlich synthetische Geometrie. Die Oberfläche kennzeichnet den gesamten Bereich mit „Synthetische Prüfgeometrie · nicht kaufbar“ und nennt diesen Zustand auch in den Statusmeldungen. Es werden keine ungeprüften LDraw-Assets oder Einkaufsdaten als freigegeben ausgegeben.

## Bedien- und Slotregeln

- Kopfwechsel bleiben auf den `head`-Slot begrenzt.
- Kopfbedeckungen bleiben am `headwear`-Slot und damit relativ zum Kopf verankert.
- Linke und rechte Handaccessoires haben getrennte Auswahlgruppen und Anchors.
- Während eines Wechsels zeigt der jeweilige Button „Lädt …“; nach Erfolg wird nur der betroffene Slot als aktiv markiert.
- Der globale Status benennt den eingesetzten Kandidaten und bleibt ehrlich als synthetisch/nicht kaufbar gekennzeichnet.
- Die feste Kameraauswahl und Orbit-Steuerung bleiben verfügbar.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 9 Testdateien, 29 Tests. |
| `npm run verify` | Erfolgreich; alle Datenvalidatoren, TypeScript, ESLint, Tests, Produktionsbuild und Cloudflare-Dry-Run bestanden. |
| Browser: Initialzustand | Alle vier Auswahlgruppen, fünf aktive Kopf-/Kamerazustände und synthetische Szene sichtbar. |
| Browser: Kopfwechsel | `3626cpr0008` ausgewählt; Auswahlstatus aktualisiert. |
| Browser: Kopfbedeckung | `25405` ausgewählt; Auswahlstatus aktualisiert und Slot bleibt am Kopf. |
| Browser: Handaccessoires | `11439` links und `3841` rechts ausgewählt; beide Gruppen bleiben unabhängig aktiv. |
| Browser: Fehlerprüfung | Keine Warnungen oder Fehler in der Browserkonsole; kein Vite-Overlay. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen gemeldet. |

## Offene Risiken

1. Der POC nutzt weiterhin nur synthetische Prüfgeometrie. Die sichtbare Auswahl ist kein Nachweis realer LDraw-Form, Dekoration oder Passform.
2. Die fünf Kopf- und fünf Kopfbedeckungsoptionen sind Bedienfixtures; reale Asset- und Lizenzfreigaben stehen aus.
3. Einkaufszeilen bleiben wegen FF-06 weiterhin blockiert.
4. Die Browserprüfung erfolgte lokal im In-App-Browser; eine Geräte- und Browsermatrix gehört zu einem späteren Prüfschritt.
