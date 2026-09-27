# FF-22/FF-23 – lokaler Figurentwurf

## Ergebnis

Der lokal nutzbare MVP speichert die aktuelle Figur nach einer gültigen Änderung verzögert in IndexedDB. Die Oberfläche benennt den Speicherort ausdrücklich als „auf diesem Gerät“ und zeigt Speicherfehler sichtbar an.

Der JSON-Export enthält ausschließlich Dokumentversion, Name, Zeitpunkt sowie bekannte FigForge-Komponenten-IDs für `head`, `headwear` und `handAccessory`. Importdateien sind auf 64 KiB begrenzt, werden strikt validiert und vollständig abgewiesen, sobald ein Teil unbekannt oder nicht digital unterstützt ist. Es gibt keinen stillen Ersatz.

## Nachweise

- Unit-Tests prüfen Roundtrip, Größenlimit, unbekannte Felder, doppelte Slots und fehlende Ersatzlogik.
- Browserprüfung bestätigt IndexedDB-Status, sichtbare Import-/Exportaktionen und eine fehlerfreie Konsole.
- Der Download wurde durch die Oberfläche ausgelöst; der In-App-Testbrowser stellt für Blob-Downloads kein Downloadereignis bereit. Der sichtbare Erfolgszustand und die Codec-Tests decken den lokalen MVP ab.

## Grenzen

- Es gibt genau einen aktuellen Entwurf, noch keine benannte Sammlung mehrerer Figuren.
- Share-Link und Datenmigration über Schema 1 hinaus sind nicht implementiert.
- JSON ist eine FigForge-Projektdatei, keine Einkaufsliste und kein BrickLink-XML.
- Kein öffentliches Deployment wurde ausgeführt.
