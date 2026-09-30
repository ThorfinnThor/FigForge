# ADR-011: Builder-Metadaten paketweise nachladen

**Status:** angenommen
**Datum:** 2026-09-30

## Kontext

Nach der katalogbasierten Freigabe von 13.737 Teilen enthält
`data/generated/ldraw-expanded-catalog.json` rund 20 MB. Ein statischer Import dieser
Datei legt sämtliche Builder-, Modell- und Vorschaumetadaten in den initialen
JavaScript-Build, obwohl die Oberfläche die Rebrickable-Suchdaten bereits nach den
fünf Rollen lädt. Weitere Katalogfreigaben würden den Startcode und die
Cloudflare-Assetgröße unnötig weiter vergrößern.

## Entscheidung

Der bestehende Generator erzeugt zusätzlich fünf minimierte Laufzeitpakete unter
`data/generated/ldraw-runtime/`. Jedes Paket enthält ausschließlich die für Auswahl,
Vorschaubild und digitale Platzierung erforderlichen Felder einer Rolle. Die App lädt
Such- und Laufzeitpaket gemeinsam, sobald die Rolle geöffnet wird. „Alle Teile“ lädt
bewusst alle fünf Pakete.

Die vollständige Datei `ldraw-expanded-catalog.json` bleibt das prüfbare
Generierungs- und Audit-Artefakt. Der Validator vergleicht jedes Laufzeitpaket
feldgenau mit diesem Artefakt und prüft einen gemeinsamen SHA-256-Bezug. Die
Freigaberegeln, Modellzuordnungen und Anzahl builder-fertiger Teile ändern sich nicht.

## Folgen

- Der initiale Browser-Build enthält nicht mehr den vollständigen erweiterten Katalog.
- Beim ersten Öffnen einer Rolle entsteht ein zusätzlicher, zwischenspeicherbarer
  Netzwerkabruf; währenddessen zeigt die Oberfläche einen Ladezustand.
- Bereits geladene Rollen bleiben für die Sitzung im Speicher.
- Nur Rebrickable Catalog Downloads/CSV und die gelockte offizielle LDraw-Bibliothek
  bleiben zulässige Quellen; MOC-Dateien und die Rebrickable API bleiben ausgeschlossen.
