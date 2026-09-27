# FF-05 Verifikationsbericht: Anker-Registry

Stand: 27. September 2026.

## Ergebnis

FF-05 stellt eine versionierte Anker-Registry für `head`, `headwear`, `leftHandAccessory` und `rightHandAccessory` bereit. Die Laufzeithierarchie hängt die Kopfbedeckung an den Kopf und die übrigen Slotwurzeln an die Torso-Baugruppe. Der vorhandene transaktionale Teiltausch prüft Slot und Platzierungsfamilie vor dem Laden.

Alle Koordinaten wurden ausschließlich für die synthetische FF-04-Prüfgeometrie bestimmt. Das Profil trägt deshalb `source: synthetic-ff04-fixture`, `publishable: false` und für jeden Anker `reviewStatus: fixture-only`. Es belegt weder reale LDraw-Passform noch reale Griffkompatibilität.

## Technische Grenzen

- Die Registry verlangt genau vier eindeutige FF-05-Slots.
- `headwear` muss relativ zum Kopf verankert sein; Kopf und Handzubehör hängen an der Torso-Baugruppe.
- Ein Teil mit falschem Slot oder unbekannter Platzierungsfamilie wird vor dem Laden abgewiesen.
- Kopfwechsel ersetzen nur den Kopf; die Kopfbedeckungswurzel und beide Handanker bleiben bestehen.
- Es wurden keine Rebrickable-API- oder MOC-Daten verwendet. Katalogdaten stammen weiterhin ausschließlich aus Rebrickable Catalog Downloads/CSV.
- Es wurde kein öffentliches Deployment ausgeführt.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:validate:ff05` | Erfolgreich; Profil `fixture-standard-minifigure-v1`, 4 Anker, `publishable: false`, ausschließlich `fixture-only`. |
| `npm run verify` | Erfolgreich; Source-Lock, FF-03-Sortiment, FF-05-Registry, TypeScript, ESLint, Tests, Produktionsbuild und Cloudflare-Dry-Run bestanden. |
| `npm run test` als Teil von `verify` | Erfolgreich; 7 Testdateien, 20 Tests. |
| `npm run build` als Teil von `verify` | Erfolgreich; Szenenchunk 562,88 kB minifiziert beziehungsweise 140,44 kB gzip. |
| `npm run cf:check` als Teil von `verify` | Erfolgreich; Wrangler las 11 Dateien und beendete den Lauf mit `--dry-run`, ohne Upload oder Deployment. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen gemeldet. |
| Browser: Dreiviertelansicht | Kopf, synthetische Kopfbedeckung und Handzubehör sichtbar; Kopfbedeckung nicht abgeschnitten. |
| Browser: Frontansicht | Beide Handanker mit synthetischem Zubehör sichtbar. |
| Browser: Kopfwechsel | `3626cpr0001` eingesetzt; Gesicht aktualisiert, Kopfbedeckung blieb korrekt am Kopf verankert. |
| Browser: Fehlerprüfung | Kein Vite-Overlay und keine Warnungen oder Fehler in der Browserkonsole. |

## Offene Risiken

1. Sämtliche Anker sind `fixture-only`; reale Koordinaten dürfen erst nach dateibezogener LDraw-Evidence, Messung und menschlicher Passformprüfung freigegeben werden.
2. Die Handanker demonstrieren nur die Hierarchie. Sie bestätigen weder Klemmkraft noch reale Griffkompatibilität.
3. Der dynamische Three.js-Szenenchunk überschreitet mit rund 563 kB minifiziert weiterhin die Vite-Warngrenze von 500 kB.
4. Die Browserprüfung erfolgte lokal im In-App-Browser; eine Geräte- und Browsermatrix war nicht Bestandteil von FF-05.
