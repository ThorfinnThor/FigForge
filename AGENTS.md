# FigForge – verbindliche Arbeitsregeln

Der Implementierungsplan unter `docs/implementation-plan.md` und die Gestaltung „Lochwand“ aus `docs/decisions/ADR-007-lochwand-design.md` sind maßgeblich. Die ältere Designreferenz `design/reference.png` gilt nur noch für die Anordnung der Arbeitszonen; ihre Farben und Schriften sind ersetzt.

## Unveränderliche Grenzen

- Katalogdaten: Rebrickable Catalog Downloads/CSV. Einzige Erweiterung (ADR-012): für BrickLink-Artikelnummern der offizielle BrickLink Catalog Download (Parts, Part and Color Codes) als hashgebundener Snapshot, dessen Rohdateien nicht veröffentlicht werden, sowie offizielle LDraw-Header. Keine MOC-Dateien.
- Keine MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte importieren, verarbeiten oder ausliefern.
- Weder die Rebrickable API noch die BrickLink API wird in V1 verwendet.
- Keine Teilenummern, Produktmerkmale, Preise oder Verfügbarkeiten aus der Designreferenz übernehmen.
- Unbekannte Rechte und Zuordnungen bleiben unbekannt; sie werden nicht geraten.
- Keine Produktionsdeployments aus GitHub Actions. Build und Deployment erfolgen später über Cloudflare Workers Builds nach einem freigegebenen Merge.
- Kein eigener Worker-API-Handler, keine Cloud-Datenbank und keine Accounts im MVP.

## Änderungskontrolle

- GitHub ist die maßgebliche Repository-Quelle.
- Der Produktionsbranch ist geschützt. Automatisierte Datenänderungen werden ausschließlich als Review-Pull-Request vorgeschlagen.
- Generierte Daten werden nicht von Hand editiert. Änderungen gehören in Adapter, kuratierte Daten oder belegte Overrides.
- Architekturänderungen benötigen eine kurze ADR.
- Keine zusätzlichen Features zur Abrundung.
- Tests und Sollwerte dürfen nicht passend zur Implementierung umdefiniert werden.

## Pflichtübergabe

Jede Übergabe nennt geänderte Dateien, tatsächlich ausgeführte Befehle und Tests, Ergebnisse, bekannte Einschränkungen und offene Risiken.
