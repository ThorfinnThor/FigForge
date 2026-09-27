# Lokales Human-Fit-Review-Werkzeug für FF-05/FF-16

Stand: 27. September 2026.

## Ergebnis

Das lokale Review-Werkzeug zeigt ausschließlich die 18 in der LDraw-Vorprüfung als menschlich prüfbar markierten Fälle. Der wegen unvollständiger Torso-Baugruppe blockierte 19. Fall wird sichtbar erklärt, kann aber nicht bewertet werden.

Jede gespeicherte Entscheidung benötigt:

- Prüferkennung,
- `fits`, `does-not-fit` oder `inconclusive`,
- `physical-parts` oder `independent-fit-reference`,
- eine konkrete Foto-, Mess- oder Referenzangabe,
- optionale Notizen.

Die Oberfläche bindet ausschließlich an `127.0.0.1:4181`. Fortschritt wird atomar in einer ignorierten lokalen Datei gespeichert. Ein Export ist erst nach allen 18 Fällen möglich und bleibt `human-reviewed-pending-curation`, `compatibilityMutation: none` und `publishable: false`. Weder Export noch Autosave verändern FF-16.

## Schutzgrenzen

- Keine Bewertung ist vorbefüllt.
- Der blockierte Torsofall kann nicht über den Endpunkt bewertet werden.
- Unbekannte Fall-IDs werden abgewiesen.
- Quelländerungen invalidieren vorhandenen Fortschritt über SHA-256.
- CSP erlaubt nur lokale Skripte, Stile, Bilder und API-Aufrufe.
- Es werden weder Rebrickable API noch MOC-Dateien verwendet.
- Kein öffentliches Deployment wurde ausgeführt.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Review-Unit-Tests | Erfolgreich; leerer Start, blockierter Torso, Evidenzpflicht, vollständiger Export und Nichtmutation geprüft. |
| Lokaler HTTP-/Browsercheck | Erfolgreich; 18 offene Fälle, 1 sichtbarer blockierter Fall, lokale LDraw-Bilder und deaktivierter Export. |
| `npm run verify` | Erfolgreich; sämtliche Validatoren, TypeScript, ESLint, 26 Testdateien mit 84 Tests, Produktionsbuild und Cloudflare-Dry-Run bestanden. |

## Offene Risiken

1. Das Werkzeug erzeugt noch keine echte Bewertung; reale Teile beziehungsweise eine unabhängig verlässliche Referenz und ein Mensch bleiben erforderlich.
2. Foto- oder Messdateien werden nur referenziert, nicht kopiert oder in das Repository aufgenommen.
3. Ein vollständiger Review-Export benötigt weiterhin eine getrennte kuratorische Prüfung, bevor Anschlussprofile oder FF-16 geändert werden dürfen.
