# ADR-004: Kompatibilität nach Default-Deny

- Status: angenommen
- Datum: 2026-09-27
- Ticket: FF-16

## Entscheidung

FigForge behandelt unbekannte oder ungeprüfte Komponenten, Familien, Slots und Kombinationen standardmäßig als `blocked`. Eine positive reale Passformaussage darf erst nach belegter Geometrie-, Anschluss- und menschlicher Prüfung entstehen.

Die aktuelle FF-16-Matrix trennt zwei Zustände:

- Alle 17 realen FF-03-Katalogkandidaten bleiben wegen ausstehender Anschlussprüfung blockiert.
- Die vier FF-05-Platzierungsfamilien dürfen ausschließlich für die synthetische Prüfgeometrie verwendet werden und erzeugen immer einen sichtbaren `fixture-only`-Warnzustand.

Bigfig-, Minidoll- und Spezialkörpersysteme, flexible Teile ohne statisches Testmodell sowie ungeprüfte Nackenaufsätze werden hart ausgeschlossen. Kopfbedeckungen belegen einen einzelnen Slot; eine neue Fixture-Auswahl ersetzt die vorige und meldet diesen Vorgang sichtbar.

## Konsequenzen

- Fehlt eine Regel, wird nicht aus Form, Kategorie oder ähnlicher Teilenummer auf Kompatibilität geschlossen.
- Der klickbare POC bleibt bedienbar, behauptet aber keine reale Passform.
- Katalogkarten dürfen keine Einsetzfunktion anbieten, solange ihre Matrixentscheidung blockiert ist.
- Die Matrix ist per Hash an FF-03 und FF-05 gebunden und muss bei Änderungen neu geprüft werden.
- Die Regeln sind keine physikalische Kollisionssimulation und keine universelle Steckbarkeitsgarantie.
