# ADR-028: Semantische Prüfung digitaler Zubehörgriffe

- Status: angenommen
- Datum: 2026-10-11

## Kontext

Die bisherige Zubehörfreigabe belegt, dass genau ein Rundzylinder in Handgriffgröße erkannt wurde und mindestens eine starre Platzierung die Referenzfigur nicht durchdringt. Das beweist jedoch nicht, dass der erkannte Zylinder der beabsichtigte Handgriff ist. Beim Musketenteil `2561` wurde der 56 LDU lange Lauf als Griff verwendet. Die Platzierung war rechnerisch kollisionsfrei, visuell aber falsch.

## Entscheidung

Visuell bestätigte Fehlgriffe werden in `data/curated/ldraw-accessory-grip-intent-reviews.json` versioniert. Eine dort blockierte Geometrie darf nicht als digital verbunden veröffentlicht werden, selbst wenn die technische Kollisionsprüfung erfolgreich ist. Die Ablehnung wird zusammen mit der reproduzierten Primitive und Grifflänge im generierten Bericht geführt.

Eine spätere Freigabe benötigt entweder einen eindeutig dokumentierten Anschluss aus der gepinnten LDCad Shadow Library oder ein separat geprüftes, teilebezogenes Platzierungsprofil. Ein Transform wird nicht allein aus Teilebezeichnung oder Vorschaubild geraten.

## Folgen

`2561` bleibt im zugrunde liegenden Rebrickable-Katalog erhalten, wird im Builder und damit in dessen erzeugten Einkaufsdaten aber nicht mehr als digital montierbar angeboten. Weitere visuell bestätigte Fehlgriffe können ohne manuelle Änderung generierter Dateien in dieselbe kuratierte Prüfschicht aufgenommen werden. Kollisionsfreiheit und semantisch korrekter Griff werden künftig als getrennte Nachweise behandelt.
