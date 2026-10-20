# ADR-035: Kernpakete für den schnellen Start

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

Der Builder lud beim Start für die Startfigur alle fünf Rollenpakete in allen
drei Datenfamilien (Katalog, LDraw-Laufzeit, Shop-Export): rund 20 MB entpackt,
1,8 MB Transfer. Benötigt wurden dafür fünf Teile und die erste Seite der
Teileliste. Gleichzeitig ist die Liste seit ADR-034 nach Beliebtheit sortiert,
sodass ihr Anfang genau die Teile enthält, die man zuerst sieht.

## Entscheidung

`tools/lib/core-packages.ts` leitet je Rolle ein Kernpaket
(`data/generated/core-packages/<rolle>.json`) aus den drei vollständigen
Paketen ab. Es enthält alle Teile der Starterfiguren (Vorlagen und
Startfigur) und die 300 beliebtesten übrigen baubaren Teile der Rolle, jeweils
mit Katalog-, Laufzeit- und Export-Eintrag. Die vollständigen Pakete bleiben
unverändert und sind die maßgebliche Quelle; der Validator
(`data:validate:core-packages`, Teil von `verify`) baut die Kernpakete neu und
vergleicht sie.

Zur Laufzeit gilt:

- Die Liste zeigt zuerst die Kernpakete. Weil sie genau den Anfang der vollen
  Reihenfolge enthalten, hängt der spätere Volllauf nur an. Ein Test mit den
  echten Daten prüft das.
- Das Wiederherstellen einer Figur (Startfigur, Entwurf, Link) und die
  Farboptionen der gewählten Teile brauchen nur die Kernpakete. Nur wenn ein
  Teil dort fehlt, werden die vollen Rollenpakete geholt.
- Die vollständigen Pakete laden, sobald Suchen, Ansichtswechsel, Set-Filter
  oder das Ende der Kernliste sie brauchen, spätestens 4 Sekunden nach dem
  Laden. Bis dahin zeigt die Trefferzeile „Katalogpaket wird geladen …“ statt
  einer Teilzahl, die nur für den Ausschnitt stimmen würde.

## Folgen

- Der Start überträgt und parst statt rund 20 MB nur etwa 2 MB.
- Die Kernpakete duplizieren etwa 10 % der Daten im Repository.
- Der Generator läuft am Ende von `assets:ldraw-expanded`, also nach dem Bau
  der drei vollständigen Familien; ein Refresh erzeugt sie automatisch neu.
- Wer die Standardliste vor dem Volllauf durchsucht, sieht kurzzeitig nur
  Treffer aus dem Ausschnitt.
