# Lokale Katalogpipeline

Die rechenintensive Katalogverarbeitung kann vollständig lokal und ohne KI- oder Codex-Aufrufe ausgeführt werden.

```bash
npm run catalog:local
```

Der Befehl:

- lädt ausschließlich die explizit erlaubten Rebrickable Catalog Downloads/CSV;
- verwendet keine Rebrickable API und keine MOC-Dateien;
- prüft und entpackt ausschließlich das in `data/ldraw-source.lock.json` festgehaltene offizielle LDraw-Archiv;
- baut Katalogpakete, lokale Modelle, Vorschaubilder und den Abdeckungsbericht neu;
- analysiert alle eindeutig zugeordneten, aber noch nicht platzierten Teile in einem Lauf und berechnet nur konservative Platzierungskandidaten;
- schreibt nicht eindeutig lösbare Teile in eine Quellen-Warteschlange, die bei jedem Daten- oder LDraw-Update erneut geprüft wird;
- führt anschließend die Repository-Prüfungen aus;
- erstellt standardmäßig einen lokalen Abgleich für LEGO Minifigures Series 29 (`71052`);
- schreibt Log und Auditbericht nach `work/local-catalog-pipeline/<Zeitstempel>/`.

Der Runner führt keine Git-Commits, Pushes, Pull Requests, GitHub Actions, Cloudflare-Aktionen oder Deployments aus. `data/incoming/` und `work/` sind absichtlich von Git ausgeschlossen.
Für HTTPS-Downloads verwendet er das macOS-Systemprogramm `curl`, damit die Zertifikate aus der Systemumgebung genutzt werden.

## Optionen

```bash
npm run catalog:local -- --dry-run
npm run catalog:local -- --offline
npm run catalog:local -- --audit-set-prefix 71052 --audit-set-prefix 71053
npm run catalog:local -- --skip-verify
```

`--offline` verwendet vorhandene Downloads. `--skip-verify` verkürzt den Lauf, liefert aber keine vollständige Freigabeprüfung und sollte nicht für einen späteren Commit verwendet werden.

Der Runner kann nur belegte Zuordnungen automatisieren. Fehlt im festgehaltenen offiziellen LDraw-Release eine eindeutige Geometrie oder sichere Verbindungsinformation, bleibt das Teil korrekt als nicht builder-bereit markiert.
Der Kandidatenbericht steht in `data/generated/ldraw-placement-candidates.json`. Eine erkannte Radius-4-Geometrie ist nur ein Prüfhinweis und schaltet kein Teil automatisch im Builder frei. Für Einträge ohne offizielle Zuordnung erzeugt zusätzliche lokale Rechenzeit keine fehlenden Quelldaten; diese bleiben bis zu einem belastbaren Quellenupdate in der Warteschlange.

Eindeutig zugeordnete Handzubehörteile werden zusätzlich in bis zu acht geometrisch gleichwertigen Griffausrichtungen geprüft. Builderbereit werden nur Varianten mit mindestens 8 LDU Grifflänge, starrer Transformation, gültigen Modellgrenzen, erfolgreichem Rendering und kollisionsfreier Lage außerhalb der zulässigen Hand-/Arm-Anschlusszone. Das ist eine digitale Platzierungsprüfung und keine Garantie für reale Klemmkraft oder Materialspannung.
