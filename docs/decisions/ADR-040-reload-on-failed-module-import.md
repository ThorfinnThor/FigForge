# ADR-040: Einmal neu laden, wenn ein Modul-Import fehlschlägt

**Status:** akzeptiert  
**Datum:** 2026-10-21

## Kontext

Kurz nach einem Deployment lieferte der Edge für eine neue Asset-Adresse
zunächst die Startseite (2.124 Bytes, Status 200) statt der JavaScript-Datei;
Minuten später dieselbe Adresse korrekt. Der Browser behielt die falsche
Antwort. Der Builder blieb leer („Failed to load module script … text/html“),
bis der Zwischenspeicher überschrieben wurde. Das wurde am 2026-10-21 direkt
nach dem Merge von #155 beobachtet.

## Entscheidung

`src/app/chunk-reload.ts` hört auf `vite:preloadError`, `error` und
`unhandledrejection`. Passt die Meldung auf einen fehlgeschlagenen Modul-Import
(Chrome, Firefox, Safari), werden die genannten und die im HTML verlinkten
Skripte und Stylesheets mit `cache: "reload"` neu geholt, damit eine falsche
zwischengespeicherte Antwort ersetzt wird, und die Seite lädt einmal neu.

Den Wiederholungsschutz trägt `history.state` (Schlüssel
`figforgeChunkReloadAt`): Er übersteht einen Reload, braucht aber weder
`localStorage` noch `sessionStorage`, wie es die Datenschutzerklärung zusagt.
Ein weiterer Fehler innerhalb von 60 Sekunden löst keinen Reload mehr aus und
bleibt sichtbar, damit es keine Schleife gibt. Andere Zustände in
`history.state` bleiben erhalten; Adresse, Abfrageparameter und Fragment
bleiben beim Reload bestehen (geteilte Figuren, Vorlagen).

## Folgen

- Besucher, die genau im Deployment-Fenster laden, sehen kurz Neuladen statt
  einer leeren Seite.
- Nicht abgedeckt: Schlägt das Einstiegsskript selbst fehl, läuft noch kein
  JavaScript, das reagieren könnte.
- Ein Browser-Test stellt den Fehler nach (erster Abruf des Builder-Chunks
  liefert HTML) und prüft, dass die Seite sich erholt und nur einmal neu lädt.
