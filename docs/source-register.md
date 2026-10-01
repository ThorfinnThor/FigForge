# Quellen- und Lizenzregister

Stand: 30. September 2026. Dieses Register ist ein technischer Arbeitsstand, keine abschließende Rechtsfreigabe.

## Verbindliche Rebrickable-Grenze

**Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.** Keine MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte importieren, verarbeiten oder ausliefern. Die Rebrickable API wird in V1 nicht verwendet.

| ID | Quelle | Geplanter Zweck | Status | Pflichtnachweis vor Verwendung |
|---|---|---|---|---|
| SRC-RB-CATALOG | Rebrickable Downloads, `https://rebrickable.com/downloads/` | Katalogmetadaten aus explizit erlaubten CSV-Archiven | Kommerzielle Nutzung vom Projektverantwortlichen bestätigt; Belegablage und konkrete Artefaktprüfung offen | Bedingungen/Attribution, Download-URL, Abrufzeit, SHA-256, CSV-Schema und Dateiname |
| SRC-RB-API | Rebrickable API | keiner | V1: verboten/nicht verwendet | Neues Vorhaben und separate Prüfung/Freigabe |
| SRC-RB-MOC | Rebrickable MOC-Dateien, Anleitungen und nutzergenerierte MOC-Inhalte | keiner | verboten | Nicht zulässig in V1 |
| SRC-LDRAW | LDraw Parts Library | ausgewählte Geometrien und transitive Unterdateien | grundsätzlich nutzbar unter Bedingungen; konkrete Dateiauswahl offen | Release, Dateipfade, Header, Abhängigkeiten, Hashes, Attribution und Darstellungskontext |
| SRC-THREE | Three.js/LDrawLoader | Rendering-Grundlage | `three@0.186.1` im Lockfile; MIT-Lizenztext unter `public/licenses/three-MIT.txt` | Browser-/Darstellungstests je Asset; LDraw-Geometrie separat belegen |
| SRC-LDCAD-SHADOW | LDCad Shadow Library | Digitale Verbindungsmetadaten für Standard-Minifiguren und eindeutig belegte Zubehörgriffe | Revision `9b1131fb1991f8c0bfc072325e4e12f6271aba35`; 72 ausgewählte Quelldateien gehasht; CC BY-SA 4.0; lokaler Hinweis unter `public/licenses/LDCadShadowLibrary-NOTICE.txt` | Nur eindeutig einzelne männliche Radius-4-Griffsegmente mit mindestens 8 LDU und bestandenem Kollisionscheck freischalten; Share-Alike und Attribution erhalten; keine physische Klemmkraftgarantie |
| SRC-BRICKLINK | BrickLink Wanted List XML | manuelles Exportziel | technischer Importweg geplant; konkrete ID-Mappings offen | Referenzfixtures und praktischer Importtest ohne Kauf |
| SRC-FONTS | Lilita One und Rubik (ADR-007; ersetzt Manrope und Kalam) | selbst gehostete UI-Schriften, Latin-Subset | `@fontsource/lilita-one@5.3.0` und `@fontsource/rubik@5.3.0` im Lockfile; SIL OFL 1.1; Copyright und Lizenztext unter `public/licenses/fonts-OFL.txt`; keine Laufzeitabhängigkeit von einem Font-CDN | Bei Versionswechsel Lizenzdatei aus den Paketen neu übernehmen |
| SRC-DESIGN | `design/reference.png` | visuelle Stilreferenz; Farben und Schriften seit ADR-007 durch „Lochwand“ ersetzt | nur Anordnung der Arbeitszonen | Keine Nummern, Aufdrucke, Preise oder Produkteigenschaften übernehmen |
| SRC-MINILM | `sentence-transformers/all-MiniLM-L6-v2`, Export `Xenova/all-MiniLM-L6-v2` | FF-18-Kandidat `compact-minilm` | Revision `751bff37182d3f1213fa05d7196b954e230abad9`, INT8-ONNX und Tokenizer gehasht; Apache-2.0 | Export-/Runtime-Lizenzhinweise vor Auslieferung vollständig ablegen |
| SRC-E5 | `intfloat/multilingual-e5-small`, Export `Xenova/multilingual-e5-small` | FF-18-Qualitätsbaseline `quality-e5` | Revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, INT8-ONNX und Tokenizer gehasht; Upstream MIT | Export-Lizenzstatus bleibt vor Auslieferung separat zu klären |

## Automatisierte Allowlist

`data/sources.lock.json` erlaubt derzeit ausschließlich:

- `colors.csv.gz`
- `part_categories.csv.gz`
- `parts.csv.gz`
- `part_relationships.csv.gz`
- `elements.csv.gz`

Für FF-03 wurden die fünf Allowlist-Archive am 27. September 2026 vom Rebrickable-CDN abgerufen und mit URL, Abrufzeit und SHA-256 im Source-Lock festgehalten. FF-08 verwendet diese Allowlist für den geplanten Refresh; aktuelle Hashes und normalisierte Daten landen in `data/generated/` und werden ausschließlich per Review-Pull-Request vorgeschlagen. Inventar-, Set-, Minifig- und MOC-Dateien sind nicht Teil dieser Allowlist.

| Datei | Download-URL | SHA-256 |
|---|---|---|
| `colors.csv.gz` | `https://cdn.rebrickable.com/media/downloads/colors.csv.gz` | `4c4eb0fe70180cbbd80855320258164b6b0409ad162bc8e3b0afb8f92475d97d` |
| `part_categories.csv.gz` | `https://cdn.rebrickable.com/media/downloads/part_categories.csv.gz` | `4cf11af9fb405cf61226bb9f4f0a0c5dd2b793fbb54e32ab5102d758c64726a0` |
| `parts.csv.gz` | `https://cdn.rebrickable.com/media/downloads/parts.csv.gz` | `7fb9e560e5fde2af836b9eeb7ccada150f19e344ba7814c602cc2e119905cddc` |
| `part_relationships.csv.gz` | `https://cdn.rebrickable.com/media/downloads/part_relationships.csv.gz` | `85cf1f4817f87a6b2341cd4ee300908bad3060212d7a9fba5125d890c76bdae7` |
| `elements.csv.gz` | `https://cdn.rebrickable.com/media/downloads/elements.csv.gz` | `8790eedab240a3e1323462cb27ace3ba6c17fb94348d0fafee7851310bba626d` |
