# FF-04 Verifikationsbericht: Three.js-Szene

Stand: 27. September 2026.

## Ergebnis

FF-04 stellt eine Three.js-Szene mit eigener `FigureSceneController`-Schicht, festen Kameraansichten, Orbit-Drehung/Zoom, einem same-origin LDrawLoader-Adapter und transaktionalem Kopfwechsel bereit. Ein neuer Teil wird erst nach erfolgreichem Laden eingesetzt; bei Fehler bleibt der vorherige Teil erhalten, und ältere asynchrone Antworten können eine neuere Auswahl nicht überschreiben.

Die sichtbare Figur ist ausdrücklich als **synthetische Prüfgeometrie, nicht kaufbar** gekennzeichnet. Es wurde kein ungeprüftes LDraw- oder Rebrickable-Modell als exakte Darstellung ausgegeben. FF-05-Anker-Registry, Einkaufslogik und spätere Produktoberflächen sind nicht implementiert.

## Technische Grenzen

- Der LDraw-Adapter akzeptiert nur same-origin `.dat`, `.ldr` und `.mpd`-Dateien.
- Die reale LDraw-Bibliothek bleibt unverbunden, solange Release-, Datei-, Abhängigkeits-, Hash- und Lizenz-Evidence fehlt.
- Kopfwechsel sind pro Slot transaktional und abbrechbar; die Kamera wird dabei nicht neu positioniert.
- Materialien, Texturen und Geometrien werden bei Ablösung oder Controller-Abbau freigegeben.
- WebGL-Kontextverlust erzeugt einen sichtbaren Status und deaktiviert die Steuerung bis zur Wiederherstellung.
- Es gibt keine automatische Kamerarotation; `prefers-reduced-motion` wird für UI-Übergänge respektiert.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 6 Testdateien, 17 Tests. |
| `npm run build` | Erfolgreich; Three.js-Szene als dynamischer Chunk gebaut. |
| Browser: Startzustand | Szene und synthetische Figur sichtbar; Canvas `1314 × 1088` interne Pixel. |
| Browser: Kopfwechsel | `3626cpr0001` eingesetzt; sichtbares Gesicht und aktiver Auswahlstatus bestätigt. |
| Browser: Kamera | Rückansicht gewählt; aktiver Kamerastatus bestätigt. |
| Browser: Fehlerprüfung | Inhalt vorhanden, kein Vite-Overlay, keine Warnungen oder Fehler in der Browserkonsole. |

## Offene Risiken

1. Die reale Figurengeometrie bleibt durch fehlende LDraw-Evidence blockiert.
2. Die FF-04-Prüfgeometrie beweist Loader-/Szenenverhalten, aber keine Passform oder exakte Teileform.
3. Der dynamische Three.js-Szenenchunk ist rund 559 kB minifiziert beziehungsweise 139 kB gzip; er wird erst nach dem initialen React-Bundle geladen, bleibt aber später unter realer Assetlast erneut zu messen.
4. Der visuelle Test erfolgte lokal im In-App-Browser; eine Geräte-/Browsermatrix ist nicht Bestandteil von FF-04.
