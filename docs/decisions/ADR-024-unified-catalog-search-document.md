# ADR-024: Gemeinsames englisches Suchdokument pro Katalogteil

**Status:** akzeptiert
**Datum:** 2026-10-05

## Kontext

Die direkte Katalogsuche verwendete bisher Rebrickable-Name, Kategorie, Rolle,
Farben und Teilenummer. Die semantische Suche kannte bei ihren 2.726 exakt
gerenderten Teilen zusätzlich die offizielle LDraw-Beschreibung. Dadurch waren
englische Merkmale aus der Modellbeschreibung nicht in beiden Suchwegen
gleichermaßen auffindbar.

## Entscheidung

Für jedes der 14.821 digital unterstützten Teile erzeugt die LDraw-Runtime ein
einziges englisches `searchText`-Dokument. Es verbindet Rebrickable-Name,
offizielle LDraw-Beschreibung, Kategorie, Bauteilrolle, belegte Farben und
Teilenummer. Direkte und semantische Suche verwenden denselben Text; es entsteht
kein separates Beschreibungsfilterfeld in der Oberfläche.

Die LDraw-Beschreibung stammt ausschließlich aus der ersten offiziellen
Beschreibungszeile der gepinnten LDraw-Datei. Rebrickable-Daten stammen weiterhin
nur aus den Catalog Downloads/CSV; Rebrickable-API- und MOC-Daten bleiben
ausgeschlossen. Teile ohne digitales LDraw-Modell nutzen als Rückfall weiterhin
ihre Rebrickable-Katalogangaben. Deutsche Anfragen werden weiterhin durch den
versionierten Normalizer auf englische Begriffe abgebildet; der vollständige
Katalogtext bleibt vorerst Englisch.

Die Runtime-Pakete wechseln wegen des neuen Pflichtfeldes auf Schema-Version 2.

## Folgen

- Wörter wie `space`, `integral` oder `uruk-hai`, die nur in einer offiziellen
  LDraw-Beschreibung stehen, können direkt filtern.
- Die fünf Runtime-Pakete wachsen ungepackt um rund 3,8 MB und gzip-komprimiert
  um rund 0,46 MB; sie werden weiterhin nur pro geöffneter Kategorie geladen.
- Die Qualität der LDraw-Beschreibung ist Suchhilfe, aber kein zusätzlicher
  Nachweis für Farbe, Kaufbarkeit oder exakte Druckgeometrie.
