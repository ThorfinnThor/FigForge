# ADR-010: Neue offizielle LDraw-Versionen im Datenrefresh übernehmen

- Status: angenommen
- Datum: 2026-09-30
- Entscheidung durch: Projektverantwortlicher („neue LDraw-Versionen automatisch übernehmen“)
- Tickets: FF-02, FF-05; ergänzt ADR-002

## Kontext

`data/ldraw-source.lock.json` nennt als Quelle `https://library.ldraw.org/library/updates/complete.zip`. Diese Adresse liefert immer die neueste offizielle Version, der Lock hält aber einen festen SHA-256. Nach der nächsten LDraw-Veröffentlichung wäre der wöchentliche Datenrefresh deshalb am Hash-Check abgebrochen. Neue offizielle Aufdrucke und Teile kämen nie in FigForge an. Außerdem war die Version `2608` in Pfaden fest verdrahtet.

## Entscheidung

1. `npm run assets:ldraw-refresh` lädt das Archiv. Bei gleichem Hash bleibt alles unverändert. Bei anderem Hash liest das Werkzeug die Version aus der neuesten Freigabenotiz (`ldraw/models/NoteYYMMCA.txt`) und übernimmt Version und Hash in den Lock, aber nur, wenn die Version neuer ist als die gesperrte. Ein geänderter Hash ohne neuere Version bricht ab.
2. Der veröffentlichte Bibliotheksordner heißt nach der gesperrten Version (`/assets/ldraw/official-YYMM/`). Browser und Werkzeuge leiten den Pfad aus dem Lock ab. Der Generator entfernt Ordner früherer Versionen, der Validator erlaubt genau einen.
3. Der wöchentliche Workflow nutzt dieses Werkzeug, erzeugt Modelle, Abdeckung und Platzierungskandidaten neu, führt `npm run verify` aus und schlägt Änderungen wie bisher nur als Review-Pull-Request vor. Gemergt wird weiterhin von Hand.
4. Die lokale Pipeline (`npm run catalog:local`) bleibt beim gesperrten Hash.

## Konsequenzen

- Neue offizielle LDraw-Dateien erscheinen ohne Handarbeit im nächsten Daten-PR. Unbedruckt angezeigte Teile wechseln dann automatisch auf den echten Aufdruck.
- Ein Versionswechsel ersetzt den ganzen Ordner mit tausenden Dateien. Der Review-PR wird dann groß.
- Weiterhin keine inoffiziellen LDraw-Dateien, keine MOC-Dateien und kein Deployment aus GitHub Actions.
