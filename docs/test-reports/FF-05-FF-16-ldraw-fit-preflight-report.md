# LDraw-Anschluss- und Passformvorprüfung für FF-05/FF-16

Stand: 27. September 2026.

## Ergebnis

Die zehn eindeutig zugeordneten offiziellen LDraw-Modelle besitzen jetzt einen deterministisch erzeugten, hashgebundenen Vorprüfdatensatz. Er belegt für jedes Modell:

- die gelockte Rebrickable-Teilenummer aus den Catalog-Downloads/CSV,
- die explizite Zuordnung zur offiziellen LDraw-Datei,
- SHA-256 der offiziellen Quelldatei und des lokalen gepackten Modells,
- erfolgreich ladbare Geometrie mit Mesh-, Dreiecks-, Vertex- und LDU-Grenzmaßen,
- den aus der lokalen Referenzbaugruppe extrahierten Kandidatentransform oder ausdrücklich das Fehlen eines Zubehörtransforms,
- die weiterhin blockierte FF-16-Kompatibilitätsentscheidung.

Neun Modelle sind technisch für eine menschliche Passformprüfung vorbereitet. `3814 → 973.dat` bleibt bereits vor dieser Prüfung blockiert, weil `973.dat` nur die Torsohülle und keine vollständige Verkaufsbaugruppe mit Armen und Händen darstellt. Kein Modell erhält durch die Vorprüfung eine positive Passformaussage.

## Menschliche Prüffälle

Der generierte Datensatz enthält genau 19 Fälle:

| Familie | Fälle | Status |
|---|---:|---|
| Drei Köpfe auf der Referenz-Torsobaugruppe | 3 | menschliche Prüfung offen |
| Drei Kopfbedeckungen auf drei Köpfen | 9 | menschliche Prüfung offen |
| Drei Zubehörteile in linker und rechter Referenzhand | 6 | menschliche Prüfung offen |
| Torsohülle als vollständige Baugruppe | 1 | wegen unvollständigem Modell blockiert |

Für einen positiven späteren Nachweis sind reale Teile oder eine unabhängig verlässliche Passformreferenz, Prüfer, Datum sowie Foto- oder Messreferenz erforderlich. Die generierte Datei wird nicht von Hand editiert; menschliche Ergebnisse benötigen einen getrennten kuratierten Review-Datensatz.

## Laufzeitverhalten

- Kopf-, Kopfbedeckungs- und Torso-Kandidatentransforms werden aus dem hashgebundenen Vorprüfdatensatz an die Szene übergeben.
- Die Transformwerte stammen aus der lokalen LDraw-Referenzbaugruppe und bleiben ausdrücklich `candidate-only`.
- Zubehör besitzt keinen belegten teilespezifischen Handtransform und wird weiterhin separat auf der Bühne dargestellt.
- Die sieben Komponenten ohne eindeutige offizielle LDraw-Zuordnung bleiben vollständig deaktiviert.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run assets:build:fit-review` | Erfolgreich; 10 Einträge, 19 Prüffälle, 0 verifizierte Passformen. |
| `npm run assets:validate:fit-review` | Erfolgreich; Quellhashes, Modellhashes, Geometrie, Fallabdeckung und FF-16-Sperren geprüft. |
| Gezielte Vitest-Prüfung | Erfolgreich; 2 Testdateien und 8 Tests. |
| `npm run verify` | Erfolgreich; sämtliche Datenvalidatoren, TypeScript, ESLint, 25 Testdateien mit 80 Tests, Produktionsbuild und Cloudflare-Dry-Run bestanden. |
| Lokale Browserprüfung | Erfolgreich; Prüfstatus sichtbar, Kopfwechsel funktioniert, Zubehör bleibt separat, keine Browserwarnungen oder -fehler. |

## Offene Risiken

1. 18 konkrete Passformfälle benötigen weiterhin eine menschliche Prüfung mit realen Teilen oder unabhängig verlässlicher Referenz.
2. Die Torsohülle `3814 → 973.dat` kann keine vollständige Torso-Baugruppe belegen.
3. LDraw-Grenzmaße und sichtbare Kollisionen beweisen weder Klemmkraft noch Materialtoleranzen.
4. Zubehör bleibt ohne teilespezifischen, geprüften Handtransform separat.
5. Alle Daten bleiben `publishable: false`; es wurde kein öffentliches Deployment ausgeführt.
