# ADR-028: Semantische Prüfung digitaler Zubehörgriffe

- Status: angenommen
- Datum: 2026-10-11
- Aktualisiert: 2026-10-12

## Kontext

Die bisherige Zubehörfreigabe belegt, dass ein Rundzylinder in Handgriffgröße erkannt wurde und genau eine Griff-/Orientierungskombination die Referenzfigur nicht durchdringt. Das beweist jedoch nicht, dass der ausgewählte Zylinder der beabsichtigte Handgriff ist. Beim Musketenteil `2561` wurde der 56 LDU lange Lauf als Griff verwendet. Eine Sichtprüfung der priorisierten Orientierungswarteschlange bestätigte dieselbe Fehlerklasse außerdem bei `2516`, `98368`, `98368pr0002`, `30092`, `30148` und `37704`: Die Platzierungen waren rechnerisch kollisionsfrei, visuell aber falsch. Bei `30092` und `30148` stammt der reproduzierbare Anschlussnachweis aus der gepinnten LDCad Shadow Library; bei den übrigen Teilen aus der offiziellen LDraw-Geometrie.

## Entscheidung

Visuell bestätigte Fehlgriffe werden in `data/curated/ldraw-accessory-grip-intent-reviews.json` versioniert. Das gilt sowohl für Teile mit genau einem geometrischen Griffkandidaten als auch für Teile, bei denen die Kollisionsprüfung genau einen von mehreren Kandidaten auswählt. Eine dort blockierte Geometrie darf nicht als digital verbunden veröffentlicht werden, selbst wenn die technische Kollisionsprüfung erfolgreich ist. Die Ablehnung wird zusammen mit der reproduzierten Primitive und Grifflänge im generierten Bericht geführt. Die Validatoren leiten diesen Nachweis erneut aus der offiziellen LDraw-Bibliothek oder der gepinnten LDCad Shadow Library ab, auch wenn das Teil wegen der kuratierten Sperre nicht mehr in der Platzierungskandidaten-Warteschlange erscheint.

Eine spätere Freigabe benötigt entweder einen eindeutig dokumentierten Anschluss aus der gepinnten LDCad Shadow Library oder ein separat geprüftes, teilebezogenes Platzierungsprofil. Ein Transform wird nicht allein aus Teilebezeichnung oder Vorschaubild geraten.

## Folgen

`2561`, `2516`, `98368`, `98368pr0002`, `30092`, `30148` und `37704` bleiben im zugrunde liegenden Rebrickable-Katalog erhalten, werden im Builder und damit in dessen erzeugten Einkaufsdaten aber nicht mehr als digital montierbar angeboten. Weitere visuell bestätigte Fehlgriffe können ohne manuelle Änderung generierter Dateien in dieselbe kuratierte Prüfschicht aufgenommen werden. Kollisionsfreiheit und semantisch korrekter Griff werden künftig als getrennte Nachweise behandelt.
