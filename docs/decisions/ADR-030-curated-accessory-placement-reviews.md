# ADR-030: Versionierte Sichtfreigaben für Zubehör-Platzierungen

## Status

Akzeptiert — 2026-10-12

## Kontext

Der automatische Zubehör-Check wählte bislang die erste kollisionsfreie Orientierung eines erkannten Griffzylinders. Das verhindert viele Überschneidungen mit der Referenzfigur, bewertet aber weder die sichtbare Klingenrichtung noch die Lage eines asymmetrischen Zubehörteils. Beim Cutlass `2530` war Kandidat 0 technisch kollisionsfrei, zeigte die Klinge in der Dreiviertelansicht jedoch hinter der Figur.

## Entscheidung

Visuell bestätigte Zubehör-Platzierungen werden in `data/curated/ldraw-accessory-placement-reviews.json` versioniert. Eine Freigabe bindet Teilnummer, LDraw-Datei, Griffprimitive, Grifflänge, Kandidatenzahlen und den ausgewählten Griff- sowie Orientierungskandidaten. Der Kataloggenerator verwendet diese Freigabe anstelle der ersten automatischen Auswahl und bricht ab, sobald die gespeicherte Evidenz veraltet oder der freigegebene Kandidat nicht mehr kollisionsfrei ist.

Die generierte Mehransichten-Warteschlange übernimmt den Freigabestatus, das Prüfdatum, den Prüfer und die Evidenzreferenz. Die Browser-Sichtprüfung wird dabei ausdrücklich als solche und nicht als menschliche Prüfung gekennzeichnet. Nicht geprüfte Zubehörteile bleiben `pending-human-visual-review`.

## Konsequenzen

- Der Cutlass `2530` verwendet nach der Dreiviertel-, Vorder- und Rückansichtprüfung Orientierungskandidat 6.
- Ein erneuter Asset-Build kann die bestätigte Orientierung nicht stillschweigend auf Kandidat 0 zurücksetzen.
- Weitere Fehlgriffe können mit demselben Datenformat korrigiert werden, ohne teilbezogene Sonderfälle im Rendering-Code anzulegen.
- Die Freigabe bestätigt nur die digitale Darstellung; eine physische Passformgarantie entsteht dadurch nicht.
