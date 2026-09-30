# ADR-006: Digitale Anschlussprofile statt Einzelprüfung durch den Betreiber

- Status: angenommen
- Datum: 2026-09-27
- Tickets: FF-05, FF-16

## Kontext

Der bisherige Prototyp behandelte alle realen Katalogteile als blockiert und leitete daraus eine lokale menschliche Einzelprüfung für 18 Kombinationen ab. Der Implementierungsplan verlangt belastbare Anschlussprofile und konservatives Sperren unbekannter Fälle, aber keine manuelle Bewertung jedes Standardteils durch den Betreiber.

Etablierte digitale LEGO-Builder trennen Geometrie von Verbindungsmetadaten. Für die freie LDraw-Welt stellt die LDCad Shadow Library maschinenlesbare `SNAP_*`-Metadaten bereit. Sie ist unter CC BY-SA 4.0 veröffentlicht.

## Entscheidung

FigForge importiert ausschließlich eine gepinnte, gehashte Teilmenge der LDCad Shadow Library und normalisiert sie in `data/generated/ldraw-digital-connectivity.json`.

- Standardköpfe und Standardkopfbedeckungen verwenden die Transformationsfamilie der offiziellen LDraw-Referenzbaugruppe und passende LDCad-Anschlüsse.
- Handzubehör wird durch Paarung des teilespezifischen Radius-4-Verbinders mit dem Radius-4-Clip der Referenzhand platziert.
- Wenn die offizielle LDraw-Geometrie einen Griff nur aus Teilsegmenten modelliert, darf ein gepinnter männlicher `SNAP_CYL`-Verbinder der LDCad Shadow Library den vollständigen Griff belegen. Automatisch akzeptiert werden nur einzelne runde Radius-4-Profile mit mindestens 8 LDU Länge; Mehrfachprofile und weibliche Verbindungen bleiben gesperrt.
- Slide-Verbindungen erhalten einen deterministischen Startwert innerhalb ihres erlaubten Bereichs.
- Fehlt ein belegtes Profil, bleibt das Teil gesperrt. Das gilt derzeit für `11439`.
- Eine unvollständige LDraw-Datei wird nicht als vollständige Verkaufsbaugruppe ausgegeben. Deshalb bleibt `3814 → 973.dat` gesperrt.
- Der Status heißt `digitally-supported`, nicht „physisch garantiert“.

Die normalisierte Registry wird mit Attribution und Share-Alike-Hinweis ausgeliefert. Rebrickable bleibt ausschließlich Katalogquelle über Downloads/CSV; weder API noch MOC-Inhalte werden verwendet.

## Konsequenzen

- Der Builder benötigt keine Passformeingaben des Betreibers.
- Acht der zehn offiziell zugeordneten LDraw-Komponenten sind im lokalen MVP auswählbar.
- Acht weitere Katalog-Zubehörteile können über eindeutig gehashte LDCad-Griffprofile in denselben Kollisionslauf aufgenommen werden.
- Verbindungspunkte und Platzierung sind reproduzierbar und quellgebunden.
- Klemmkraft, Materialspannung und universelle Kollisionsfreiheit werden nicht behauptet.
- Neue Teile werden nur nach belegtem Snap-Profil freigeschaltet; Ähnlichkeit oder Teilenummern-Nähe genügt nicht.
