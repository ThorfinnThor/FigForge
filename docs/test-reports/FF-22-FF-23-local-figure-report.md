# FF-22/FF-23 – lokaler Figurentwurf

## Ergebnis

Der lokal nutzbare MVP speichert die aktuelle Figur nach einer gültigen Änderung verzögert in IndexedDB. Die Oberfläche benennt den Speicherort ausdrücklich als „auf diesem Gerät“ und zeigt Speicherfehler sichtbar an.

Der JSON-Export enthält ausschließlich Dokumentversion, Name, Zeitpunkt sowie bekannte FigForge-Komponenten-IDs für alle fünf Slots (`head`, `headwear`, `torsoAssembly`, `legsAssembly` und `handAccessory`). Importdateien sind auf 64 KiB begrenzt, werden strikt validiert und vollständig abgewiesen, sobald ein Teil unbekannt oder nicht digital unterstützt ist. Es gibt keinen stillen Ersatz.

Zusätzlich gibt es eine lokale Sammlung für benannte Figuren. Sie liegt ausschließlich in IndexedDB, kann einzeln geladen oder gelöscht und vollständig über „Lokale Daten löschen“ entfernt werden. Das Datenbankupgrade auf Version 2 legt den neuen Sammlungsspeicher an und lässt den bestehenden Entwurfsspeicher samt Schlüssel unverändert.

FF-23 ergänzt einen versionierten Share-Link (`#figforge=v1.<payload>`). Das geprüfte FigForge-Dokument liegt ausschließlich im URL-Fragment, wird nicht an den Server gesendet und wird vor der Wiederherstellung strikt gegen das bekannte Schema, die Slot-/ID-Regeln und Größenlimits geprüft. Der Link kann kopiert oder bei fehlender Clipboard-Berechtigung aus einem schreibgeschützten Feld übernommen werden.

## Nachweise

- Unit-Tests prüfen Roundtrip, Größenlimit, unbekannte Felder, doppelte Slots und fehlende Ersatzlogik.
- Browserprüfung bestätigt IndexedDB-Status, sichtbare Import-/Export-/Sammlungsaktionen, eine gespeicherte Figur nach Neuladen sowie eine fehlerfreie Konsole.
- Der Download wurde durch die Oberfläche ausgelöst; der In-App-Testbrowser stellt für Blob-Downloads kein Downloadereignis bereit. Der sichtbare Erfolgszustand und die Codec-Tests decken den lokalen MVP ab.
- Unit-Tests prüfen Share-Link-Roundtrip, Fragment- statt Query-Verarbeitung, Versionsprüfung, Manipulation und Größenlimit.

## Grenzen

- Dokumentmigration über Schema 1 hinaus ist nicht implementiert; `v1` ist der erste Share-Link-Container.
- JSON ist eine FigForge-Projektdatei, keine Einkaufsliste und kein BrickLink-XML.
- Kein öffentliches Deployment wurde ausgeführt.
