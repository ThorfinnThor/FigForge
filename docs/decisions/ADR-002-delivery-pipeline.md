# ADR-002: GitHub-, Daten- und Cloudflare-Lieferweg

- Status: angenommen
- Datum: 2026-09-27
- Ticket: FF-02

## Entscheidung

GitHub ist die maßgebliche Quelle für Code, Konfiguration und geprüfte Datenänderungen.

Der geplante Katalog-Refresh läuft regelmäßig über GitHub Actions. Er darf ausschließlich die erlaubten Rebrickable Catalog Downloads/CSV verarbeiten, validiert Daten und erzeugt bei Änderungen einen Pull-Request. Er schreibt nicht direkt nach `main`, umgeht keinen Branchschutz und besitzt keine Cloudflare-Produktionszugangsdaten.

Cloudflare Workers Builds wird später direkt mit dem GitHub-Repository verbunden. Nach Review und Merge baut Cloudflare das Vite-Projekt und veröffentlicht ausschließlich `dist/` als Workers Static Assets. Die MVP-Konfiguration enthält keinen Worker-API-Handler und keine Cloud-Bindings.

## Sicherheitsgrenzen

- GitHub Actions: CI und Daten-PR, kein Deployment.
- Cloudflare Workers Builds: Build und Deployment, keine Datenbeschaffung.
- Produktionsbranch: menschlich freigegebener Merge erforderlich.
- Vorschau: Nicht-Produktionsbranch; keine automatische Promotion.
- Secrets: keine Cloudflare-Produktionswerte im Repository oder in GitHub Actions.

## Aktivierungsgrenzen

FF-02 legt nur das sichere Gerüst an. Der Remote-Downloadadapter wird erst in FF-08 implementiert. Die Cloudflare-Verbindung und das öffentliche Deployment gehören zu FF-31 und benötigen eine ausdrückliche Freigabe.
