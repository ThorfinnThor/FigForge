# ADR-023: Semantische Suche automatisch vorbereiten

**Status:** akzeptiert
**Datum:** 2026-10-04

## Kontext

Die semantische Suche war als optionaler Download mit Bestätigungsbutton,
Abbruch und dauerhaft sichtbarem Bereitschaftstext umgesetzt. Dadurch wirkte sie
wie ein separater Modus, obwohl sie die reguläre Suche verbessern soll. Die
Release-Dateien umfassen derzeit 42,4 MB und werden nach dem ersten Laden im
Browsercache wiederverwendet.

## Entscheidung

1. Die semantische Suche wird beim Öffnen des Builders automatisch initialisiert.
2. Während des ersten Downloads zeigt die Oberfläche den echten Fortschritt.
3. Nach erfolgreichem Laden verschwindet der technische Status; die Suche ist
   ohne weitere Nutzeraktion der Standard.
4. Bei einem Ladefehler bleibt die Stichwortsuche verfügbar und die Oberfläche
   zeigt eine verständliche Fehlermeldung.
5. Modell und Suche laufen weiterhin vollständig auf dem Gerät.

## Folgen

- Es gibt keinen Bestätigungs- oder Aktivierungsschritt mehr.
- Auf einem Gerät ohne Cache werden einmalig rund 42,4 MB automatisch geladen.
- Die normale Katalogbedienung bleibt während des Downloads möglich.
