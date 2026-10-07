# ADR-027: Lokale Collection mit gemeinsamer Playground-Bühne

**Status:** akzeptiert
**Datum:** 2026-10-06

## Kontext

FigForge speichert Figuren bereits als versionierte Dokumente in einer lokalen
IndexedDB-Sammlung. Nutzer sollen diese Figuren künftig auf einer eigenen Seite
sehen und mehrere vollständige Figuren nebeneinander aufstellen können. Das MVP
hat weiterhin keine Accounts, Cloud-Datenbank oder eigene Worker-API.

## Entscheidung

Die eigenständige Route `/collection` zeigt die lokale Sammlung. Der sichtbare
Navigationsname lautet „Collection“; die gemeinsame 3D-Fläche innerhalb der
Seite heißt „Playground“.

Gespeicherte Figurendokumente bleiben unverändert im bestehenden
`figure-collection`-Store. Die Playground-Anordnung wird getrennt als
`figforge-playground-layout` gespeichert und enthält ausschließlich eine
geordnete Liste stabiler Sammlungs-IDs. Es werden weder Figurendokumente noch
Katalog- oder LDraw-Daten dupliziert.

Das MVP stellt höchstens sechs unterschiedliche gespeicherte Figuren
gleichzeitig dar. Die Reihenfolge der IDs bestimmt die Reihenfolge von links
nach rechts. Freie Koordinaten, Kamerapositionen und individuelle Posen werden
nicht gespeichert. Die 3D-Positionen werden reproduzierbar aus Reihenfolge und
Figurenanzahl abgeleitet.

Wird eine gespeicherte Figur gelöscht oder kann ein altes Dokument nicht mehr
gelesen werden, entfernt die Collection-Seite dessen ID beim Laden aus der
Playground-Anordnung. Die übrige Reihenfolge bleibt erhalten. Leere Bühnen sind
gültig.

Existiert noch keine Playground-Anordnung, werden bis zu sechs zuletzt
gespeicherte Figuren als initiale Bühne übernommen. Danach bleibt die explizit
gespeicherte Reihenfolge maßgeblich. Die Collection-Oberfläche kann die Bühne
danach gezielt leeren oder bis zum Limit ergänzen.

Die 3D-Implementierung verwendet eine gemeinsame Szene und teilt
LDraw-Ressourcen zwischen Figuren. Mehrere voneinander unabhängige vollständige
Viewport-Instanzen sind wegen Speicher- und Ladeaufwand nicht der Zielzustand.
Auf schmalen Viewports wird der Abstand zwischen Figuren reduziert, ohne die
gespeicherte Reihenfolge zu verändern. Die Hauptnavigation bleibt auch mobil
sichtbar, damit Builder, Collection und Methodik erreichbar bleiben.

## Akzeptanzkriterien für das Datenmodell

- Vorhandene Version-2-Sammlungen werden beim IndexedDB-Upgrade nicht verändert.
- Eine Playground-Anordnung akzeptiert null bis sechs eindeutige Sammlungs-IDs.
- Reihenfolge wird stabil gespeichert und wiederhergestellt.
- Verweise auf nicht mehr vorhandene Figuren werden ohne Datenverlust bei den
  übrigen Figuren entfernt.
- „Lokale Daten löschen“ entfernt Entwurf, Sammlung und Playground-Anordnung.
- Die Route und alle späteren Oberflächentexte werden auf Deutsch und Englisch
  angeboten.

## Nicht Bestandteil dieses Schritts

Cloud-Synchronisation, individuelle Posen und öffentliche Bereitstellung sind
nicht Teil dieses MVP-Schritts. Es werden weiterhin ausschließlich
Rebrickable-Catalog-Downloads/CSV und die offizielle LDraw-Bibliothek verwendet;
keine MOC-Dateien und keine Rebrickable API.

## Folgen

Die Collection bleibt geräte- und browserspezifisch. Eine spätere
Cloud-Synchronisation würde Accounts, Datenschutzentscheidungen und ein neues
Speichermodell erfordern und ist nicht Teil des MVP.
