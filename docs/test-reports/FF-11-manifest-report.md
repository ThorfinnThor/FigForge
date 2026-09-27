# FF-11-Verifikationsbericht: Assetmanifest, Lizenzstatus und Provenienz

Stand: 27. September 2026.

## Ergebnis

FF-11 erzeugt `data/generated/asset-manifest.json`, eine identische öffentliche Kopie unter `public/assets/asset-manifest.json` und die Quellen-/Lizenzhinweise unter `public/licenses/figforge-attribution.json`.

Das Manifest beschreibt 19 Artefakte: das FF-10-Modellpaket und 18 Thumbnails. Es verknüpft jedes Artefakt mit Quell- und Lizenznachweisen, den SHA-256-Hashes von Source-Lock, FF-09-Mapping-Review, FF-10-Paketindex und dem lokalen Three.js-MIT-Lizenztext.

Der Release bleibt ausdrücklich `blocked` und `publishable: false`. Rebrickable bleibt auf **Catalog Downloads/CSV, keine MOC-Dateien** begrenzt. Der Rebrickable-Nutzungs-/Attributionsbeleg ist `pending`; LDraw ist `blocked`, weil FF-10 keine echten LDraw-Dateien enthält. Der Three.js-MIT-Hinweis ist als lokaler, gehashter Nachweis `confirmed`.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run licenses:build` | Erfolgreich; 19 Artefakte, 4 Quellenhinweise und 4 Lizenznachweise erzeugt. |
| `npm run licenses:validate` | Erfolgreich; Manifest-Reproduzierbarkeit, öffentliche Kopie, Notice-Hash, Lizenz-Hash, Provenienz, Pfade und blockierte Freigabe geprüft. |
| FF-11-Unit-Tests | Erfolgreich; Lizenzstatus, Artefaktanzahl und Ablehnung geratener Mapping-Kandidaten geprüft. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 13 Testdateien, 39 Tests. |

## Offene Risiken

1. Das Manifest dokumentiert offene Nachweise; es ersetzt keine menschliche Rechts- oder Lizenzfreigabe.
2. Der Rebrickable-Nutzungs-/Attributionsbeleg muss noch im echten Projektarchiv abgelegt und geprüft werden.
3. Das Repository hat weiterhin keinen verbundenen GitHub-Remote; GitHub Actions und Cloudflare Workers Builds wurden nicht öffentlich ausgeführt.
