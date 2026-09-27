# Erforderliche GitHub-Einstellungen

Diese Einstellungen können ohne ein bekanntes GitHub-Repository und echte Verantwortliche nicht lokal aktiviert werden.

## Produktionsbranch `main`

- Pull Request vor Merge erforderlich.
- Mindestens eine menschliche Freigabe.
- Neue Commits verwerfen alte Freigaben.
- Alle Gespräche müssen gelöst sein.
- Statuscheck `verify` erforderlich.
- Branch muss vor Merge aktuell sein.
- Force-Pushes und Löschung untersagen.
- Administratoren und Automationen dürfen Regeln nicht umgehen.

## Actions

- Standardberechtigung des `GITHUB_TOKEN`: read-only.
- Nur `refresh-catalog.yml` erhält jobbezogen `contents: write` und `pull-requests: write`; der Job schreibt ausschließlich generierte Katalogdaten und erstellt/aktualisiert einen Review-Pull-Request.
- Actions von GitHub sind auf konkrete Releases begrenzt; Drittanbieter-Actions werden im Grundgerüst nicht verwendet.
- Keine Cloudflare-Zugangsdaten als GitHub-Secrets anlegen.

## Cloudflare

- Cloudflare Git-Integration nur für dieses Repository autorisieren.
- `main` als Produktionsbranch; andere Branches ausschließlich Preview.
- Buildbefehl `npm ci && npm run verify` und Deploybefehl `npx wrangler deploy` erst in FF-31 nach Freigabe konfigurieren.
- Worker-Name im Dashboard muss `figforge` aus `wrangler.jsonc` entsprechen.
