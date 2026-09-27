# ADR-001: MVP-Grenzen und Datenwahrheit

- Status: angenommen
- Datum: 2026-09-27
- Ticket: FF-00

## Entscheidung

FigForge V1 bleibt ein backendloser, kuratierter Minifiguren-Konfigurator. Die Laufzeitanwendung verarbeitet statische, vorab geprüfte Daten und speichert Nutzerentwürfe lokal. Sie enthält keine Accounts, Community-Funktionen, Live-Preise, Händlerbestände, Cloud-Datenbank oder serverseitige Suche.

Die verbindliche Rebrickable-Grenze lautet: **Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.** MOC-Anleitungen und sonstige nutzergenerierte MOC-Inhalte sind ebenfalls ausgeschlossen. Die Rebrickable API wird in V1 nicht verwendet.

Eine Katalogvariante, digitale Unterstützung und aktuelle Kaufbarkeit sind getrennte Zustände. Der öffentliche Katalog darf nur Varianten enthalten, deren Quelle, Farbe, Geometrie, Anschlussprofil und Einkaufszuordnung geprüft wurden.

## Konsequenzen

- Ein kleiner, belegter Katalog hat Vorrang vor Vollständigkeit.
- Datenverträge blockieren unvollständige veröffentlichte Varianten.
- Ungeklärte Mappings erscheinen nur in internen Review-Artefakten.
- Die Designreferenz ist kein Katalog- oder Rechtsnachweis.
- FF-03 definiert ein kleines Testsortiment, bevor 3D- und UI-Arbeit beginnen.
