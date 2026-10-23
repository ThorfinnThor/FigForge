# ADR-047: Projektdefinierte Handgriff-Profile für Schilde und Schwerter

## Status

Akzeptiert — 2026-10-23 (Projektverantwortlicher). Umsetzung familienweise, beginnend mit Schild `3846`.

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

Nur Handzubehör. Bedingung 2 (Transform aus erkennbarer Griffgeometrie) begrenzt den Umfang stark: Eine Familie ist nur umsetzbar, wenn die offizielle LDraw-Datei einen Griffzylinder enthält, an dem der Transform verankert werden kann. Die Prüfung aller Schild- und Schwertfamilien (2026-10-23) ergab:

| Familie | Teile (inkl. Druckvarianten) | Griffgeometrie in LDraw | Stand |
|---|---|---|---|
| Schild `3846` dreieckig | 32 | ja (zwei Zylinder) | umgesetzt |
| Schild `59231` rund flach | 3 | ja (zwei Zylinder) | umgesetzt |
| Schild `3876` rund mit Noppe | 1 | ja (zwei Zylinder) | umgesetzt |
| Schilde `2586`, `75902`, `92747`, `91884`, `18836`, `10049`, `61856`, `98367`, `37720a`, `48494`, `93251` | rund 70 | nein | ausgeschlossen |
| Schwerter (`2674a/b/e/f`, `5644`, `11439pat…`, `13549`, `18034`, `25111`, `36017`) | 13 | nein | ausgeschlossen |

Familien ohne Griffgeometrie bleiben gesperrt: Der Builder erzeugt für sie keine Griffkandidaten, und ein Transform wäre geraten (zum Beispiel `2586`, dessen LDraw-Datei nur die Schildform aus flachen Scheiben enthält). Sie werden erst freigeschaltet, wenn LDraw oder LDCad eine Griffgeometrie oder einen Anschluss dafür liefert. Der frühere Entwurf nannte rund 109 Teile; belastbar sind 36.

## Konsequenzen

- Schilde und Schwerter aus Ritter-, Wikinger- und Fantasy-Themenwelten könnten im Builder mit echtem Aufdruck angeboten werden.
- Es entsteht erstmals eine Platzierungsklasse ohne Anschluss-Beleg. Sie bleibt klein, einzeln freigegeben und sichtbar gekennzeichnet.
- Zusätzlicher Pflegeaufwand: Bei jedem LDraw-Release prüft ein Test die Datei-Hashes der freigegebenen Familien.
- Ablehnen bedeutet: Die 377 Teile bleiben gesperrt, die Zahl wächst nur mit neuen LDraw- und LDCad-Releases.

## Folge für die Prüfung

`validate-ldraw-expanded-catalog` verlangt sonst bei jedem Handzubehör genau einen kollisionsfreien Griff (`safeGripCandidatesFound === 1`). Für Mitglieder einer Profilfamilie genügt `>= 1`, weil das Profil gerade einen von mehreren sicheren Griffen festlegt. Für alle anderen Teile bleibt die strikte Prüfung unverändert; die Auswahl selbst prüft `assets:validate:accessory-profiles`.

## Umsetzungsstand

- Familien `59231` (3 Teile) und `3876` (1 Teil): Griff 1 (Zylinder entlang der Schildtiefe), Ausrichtungen 6 bzw. 2. Der Griff 0 legt die Schilde flach ab; die Ausrichtungen 5 und 7 drehen den Aufdruck von `59231pr0002` (Adler) sichtbar schief.
- Familie `3846` (32 Teile): Griffkandidat 1, Ausrichtung 2 (Schild aufrecht vor dem Körper, Spitze nach unten, Aufdruck nach vorn). Kollisionsfrei gegen die geschlossene Referenzgeometrie für alle 32 Mitglieder; Dreiansichten-Browserprüfung für das unbedruckte Schild und mehrere Druckvarianten.
- Freigabedatei: `data/curated/ldraw-accessory-profile-reviews.json`; Prüfung: `npm run assets:validate:accessory-profiles`.
- Kennzeichnung: Hinweis auf der Teilekarte in beiden Sprachen.

## Offene Punkte

- Familien ohne Griffgeometrie (siehe Tabelle) bleiben gesperrt, bis neue Quelldaten vorliegen.
- Die Hashes decken die Teiledatei ab, nicht ihre Unterteile (`s/…`); ein Release, das nur ein Unterteil ändert, wird nicht erkannt, würde aber die Kollisionsprüfung beim Build neu bewerten.
