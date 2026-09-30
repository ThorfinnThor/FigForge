# Generierte Daten

FF-08 befüllt dieses Verzeichnis ausschließlich durch den geprüften Quellenadapter. Die GitHub Action erstellt daraus einen Review-Pull-Request; generierte Dateien werden nie von Hand geändert.

- `catalog-source.lock.json`: vom Refresh festgehaltene Download-Hashes und Abrufzeiten.
- `catalog-normalized.json`: deterministische Normalisierung der erlaubten Catalog-CSV-Dateien.
- `catalog-refresh-report.json`: maschinenlesbarer Diff-/Provenienzbericht.
- `catalog-packages/`: fünf kompakte, nach Builder-Slot getrennte Browserpakete mit 20.202 Minifig-Teilen; ohne Bilder, MOC-Inhalte oder API-Daten.
- `shop-export/`: je Builder-Rolle Rebrickable-Farben und LEGO-Elementnummern der builder-fertigen Teile aus `elements.csv.gz` für den Shop-Export (ADR-012); erzeugt mit `npm run assets:shop-export`.
- `mapping-review.json`: deterministischer FF-09-Report zu offenen Mappings und Dublettensignalen.
- `model-packages.json`: FF-10-Index des reproduzierbaren, ausdrücklich nicht veröffentlichbaren FF-04-Fixturepakets und seiner SVG-Thumbnails.
- `asset-manifest.json`: FF-11-Manifest mit Artefakt-Hashes, Provenienz, Lizenzstatus und offenen Freigabeblockern.
- `ldraw-fit-review.json`: hashgebundene Geometrievorprüfung für 10 offiziell zugeordnete LDraw-Modelle mit 19 noch nicht menschlich entschiedenen Passformfällen.

Roharchive bleiben transient und werden wegen `.gitignore` nicht eingecheckt.
