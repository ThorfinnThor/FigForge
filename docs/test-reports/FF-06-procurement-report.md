# FF-06 Verifikationsbericht: Beschaffungsrezepte und Baugruppenlogik

Stand: 27. September 2026.

## Ergebnis

FF-06 führt versionierte Beschaffungsrezepte und einen deterministischen Teilelisten-Compiler ein. Der Compiler arbeitet ausschließlich aus ausgewählten Varianten und deren `ProcurementRecipe`; Meshes oder andere Knoten der Three.js-Szene werden nicht ausgewertet.

Für die reale FF-03-Referenzfigur `ff03-variant-02` sind fünf Rezepte erfasst. Weil keine BrickLink-Artikel- und Farbzuordnung unabhängig bestätigt wurde, stehen alle Rezepte auf `unverified`, enthalten keine Einkaufszeilen und erzeugen erwartungsgemäß eine vollständig blockierte Teileliste mit fünf sichtbaren Blockern. Es wurden keine Rebrickable-IDs als BrickLink-IDs umgedeutet.

Die ausführbare Testfixture verwendet ausschließlich synthetische `fixture-*`-IDs. Sie belegt die technische Auflösung der Strategien `single-item`, `assembly` und `components`, die Aggregation gleicher Artikel-/Farbpaare sowie die korrekte Menge zwei bei demselben Accessoire in beiden Händen. Diese IDs sind keine Produktdaten und dürfen nicht exportiert werden.

## Sicherheits- und Konsistenzregeln

- Nur verifizierte Rezepte dürfen Einkaufszeilen enthalten.
- Ein verifiziertes Einzelteil- oder Baugruppenrezept muss genau eine Einkaufszeile ergeben.
- Komponentenrezepte dürfen mehrere belegte Zeilen ergeben.
- Ein vollständiger Export mit auch nur einer ungeprüften Auswahl enthält keine stillschweigende Teilliste.
- Eine Teilliste ist nur im ausdrücklich angeforderten Modus `verified-only` möglich und führt alle ausgelassenen Positionen sichtbar auf.
- Aggregation erfolgt deterministisch nach Artikeltyp, BrickLink-ID und BrickLink-Farbe; Evidenz- und Auswahl-IDs bleiben erhalten.
- Doppelte Figurenslots, unbekannte Rezepte und Variante-Rezept-Konflikte werden abgewiesen.

## Erwartete reale Teileliste

| Ergebnis | Wert |
|---|---|
| Status | `blocked` |
| Einkaufszeilen | 0 |
| Blockierte Auswahlen | 5 |
| Grund | BrickLink-Artikel/-Farben und die Torso-Baugruppenauflösung sind noch nicht menschlich bestätigt. |

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:validate:ff06` | Erfolgreich; 5 Rezepte und 5 Referenzauswahlen, Ergebnis `blocked`, 0 Einkaufszeilen, 5 sichtbare Blocker. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run test` | Erfolgreich; 8 Testdateien, 27 Tests. |
| `npm run verify` | Erfolgreich; alle Datenvalidatoren, TypeScript, ESLint, Tests, Produktionsbuild und Cloudflare-Dry-Run bestanden. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen gemeldet. |

## Offene Risiken

1. Für kein reales FF-06-Rezept ist derzeit eine BrickLink-Zuordnung freigegeben; deshalb darf noch keine reale Einkaufsdatei entstehen.
2. `ff03-torso-3814` beschreibt laut Katalogzeile nur einen Torso. Die benötigte vollständige Oberkörper-Baugruppe muss fachlich aufgelöst und einzeln belegt werden.
3. Die synthetische Soll-Liste beweist Compilerverhalten, nicht die sachliche Richtigkeit zukünftiger realer Zuordnungen.
4. Die menschliche FF-06-Freigabe bleibt ausstehend.
