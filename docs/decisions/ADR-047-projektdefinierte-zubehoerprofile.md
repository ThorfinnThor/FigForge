# ADR-047: Projektdefinierte Handgriff-Profile für Schilde und Schwerter

## Status

Entwurf — 2026-10-23. Noch nicht angenommen; es ändert sich weder Code noch Katalogdaten.

## Kontext

Der Builder zeigt in der Standardansicht nur Teile, deren 3D-Modell das echte Teil samt Aufdruck zeigt („exakt“, derzeit rund 2.700 Teile). Bei Handzubehör fehlen 377 Teile mit offizieller LDraw-Geometrie, weil keine belegte Handplatzierung existiert:

- Der Abgleich mit der gepinnten LDCad Shadow Library (Revision `9b1131fb…`, entspricht dem aktuellen Upstream-Stand) hat ergeben: Nur 107 der 377 Teile besitzen überhaupt eine Shadow-Datei. Die 13 Dateien mit genau einem männlichen Radius-4-Griff sind bereits geprüft und gesperrt (ADR-014, ADR-015, ADR-028). Die übrigen Dateien haben mehrere oder keine Handgriffe. Clip- und Finger-Anschlüsse beschreiben die Befestigung an einem Stab, nicht den Griff einer Minifigurhand.
- Für die großen Familien gibt es keine Anschlussdaten: Schilde `3846`, `2586`, `75902`, `92747`, `91884`, `18836`, `59231`, `10049` und Schwerter `2674a`/`b`/`e`/`f`, `5644`, `11439pat…`, `13549`, `18034`, `25111`.
- Die Familien sind groß, weil Druckvarianten dieselbe Geometrie teilen (`3846` allein 32 Einträge). Jede Variante besitzt eine eigene offizielle LDraw-Druckdatei (zum Beispiel `2586pr0003` als `2586p30.dat`).

Nach ADR-016 und ADR-028 bleibt ein Teil ohne belegten Anschluss gesperrt; ADR-028 lässt als Ausnahme ein „separat geprüftes, teilebezogenes Platzierungsprofil“ zu.

## Entscheidung

Für ausgewählte, weit verbreitete Schild- und Schwertfamilien darf das Projekt ein eigenes Platzierungsprofil festlegen, wenn alle folgenden Bedingungen erfüllt sind:

1. **Geltungsbereich.** Nur Rolle `handAccessory`, nur Teile mit eigener offizieller LDraw-Datei, die in ihrer Familie dieselbe Grundgeometrie teilen. Köpfe, Torsos, Beine und Kopfbedeckungen sind nicht betroffen.
2. **Entwurf.** Das Profil ist ein einzelner Transform pro Familie. Er wird aus der offiziellen Teilegeometrie abgeleitet (Griffstab bzw. Haltefläche des Teils, soweit in der LDraw-Datei erkennbar) und in `data/curated/ldraw-accessory-profile-reviews.json` versioniert, mit Teilnummer, LDraw-Datei, Datei-Hash und Familienliste.
3. **Prüfung.** Vor der Freigabe laufen die digitale Kollisionsprüfung gegen die geschlossene Referenzgeometrie (ADR-014) und die Dreiansichtenprüfung aus ADR-030 (Dreiviertel-, Vorder-, Rückansicht). Eine Browser-Sichtprüfung wird als solche gekennzeichnet und nicht als menschliche Prüfung. Die Freigabe jeder Familie erfolgt durch den Projektverantwortlichen anhand der Screenshots.
4. **Familienweise Freigabe.** Freigegeben wird eine Familie erst, wenn der Transform für die Grundform und mindestens eine bedruckte Variante gerendert und bestätigt wurde. Alle Varianten erben den Transform; die generierten Daten bleiben unverändert, nur die Freigabe-Datei ist die Quelle.
5. **Kennzeichnung.** Die Geometrie ist belegt (offizielle LDraw-Datei), die Handposition ist projektdefiniert. Die Oberfläche und die Methodik-Seite weisen das aus, zum Beispiel „Handposition vom Projekt festgelegt“. Eine Aussage zu realer Passform oder Klemmkraft entsteht nicht.
6. **Fail-closed.** Ändert sich die LDraw-Datei (Hash) oder schlägt die Kollisionsprüfung fehl, wird die Freigabe ungültig und das Teil wieder gesperrt.

Nicht Teil dieser Entscheidung: die inoffizielle LDraw-Bibliothek, Aufdrucke aus Bildern, Platzierungen ohne Sichtprüfung und weitere Familien ohne eigene Freigabe.

## Erwarteter Umfang

Nur Handzubehör. Obergrenze, wenn alle Familien bestätigt würden:

| Familie | Teile (inkl. Druckvarianten) |
|---|---|
| Schild `3846` dreieckig | 32 |
| Schild `2586` oval | 19 |
| Schild `75902` rund gewölbt | 16 |
| Schild `92747` oval mit Griff | 7 |
| Schild `91884` rund mit Noppe | 5 |
| Schilde `18836`, `59231`, `10049`, `61856`, `98367`, `3876`, `37720`, `48494`, `93251` | 17 |
| Schwerter (`2674a/b/e/f`, `5644`, `11439pat…`, `13549`, `18034`, `25111`, `36017`) | 13 |
| **Summe** | **109** |

Das wären etwa +4 % exakte Teile (von rund 2.712 auf rund 2.820). Realistisch bleibt es darunter, weil jede Familie die Sichtprüfung bestehen muss; für Schwerter ohne eindeutigen Griff rechnet der Entwurf mit Ausfällen.

## Konsequenzen

- Schilde und Schwerter aus Ritter-, Wikinger- und Fantasy-Themenwelten könnten im Builder mit echtem Aufdruck angeboten werden.
- Es entsteht erstmals eine Platzierungsklasse ohne Anschluss-Beleg. Sie bleibt klein, einzeln freigegeben und sichtbar gekennzeichnet.
- Zusätzlicher Pflegeaufwand: Bei jedem LDraw-Release prüft ein Test die Datei-Hashes der freigegebenen Familien.
- Ablehnen bedeutet: Die 377 Teile bleiben gesperrt, die Zahl wächst nur mit neuen LDraw- und LDCad-Releases.

## Offene Punkte

- Entscheidung des Projektverantwortlichen, ob die Ausnahme von ADR-016/ADR-028 gelten soll.
- Wortlaut der Kennzeichnung in der Oberfläche (DE/EN).
- Ob die Validatoren (`assets:validate:accessory-placement` und Nachbarn) eine eigene Prüfung für die neue Freigabe-Datei erhalten oder die bestehende erweitert wird.
