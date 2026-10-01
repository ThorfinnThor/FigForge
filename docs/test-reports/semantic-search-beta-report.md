# Semantische Suche – Beta-Integrationsbericht

## Umfang

- Profil: `compact-minilm`, gelockte Revision `751bff37182d3f1213fa05d7196b954e230abad9`
- Suchbestand: 2.726 builderfähige Teile mit exakter Druckgeometrie
- Index: 384 Dimensionen, Float32 little endian, 4.187.136 Byte
- Gesamtdownload: 42.443.717 Byte einschließlich Modell, Tokenizer, Mapping und ONNX-WASM-Laufzeit
- Ausführung: lokaler Web-Worker, kein Backend, keine externe Inferenz-API
- Datenregel: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien

## Technische Sicherungen

- Ein Releasevertrag hält Modellrevision, Normalizer-Version, Dokumentzahl sowie SHA-256 und Bytezahl aller Dateien fest.
- Der Generator akzeptiert nur exakt dargestellte, digital einsetzbare Teile und erwartet genau 2.726 Dokumente.
- Der Browser prüft jedes Suchasset vor Initialisierung.
- Exakte IDs und strukturierte Kategorie-, Farb- und Negationsregeln bleiben vorrangig.
- Downloadabbruch und Fehler deaktivieren nur die Beta; die Basissuche bleibt aktiv.

## Noch nicht behauptet

Die Suchqualität ist nicht abschließend freigegeben. Das FF-18-Review enthält weiterhin keine menschlichen Relevanzlabels. Deshalb wird die Funktion in der Oberfläche als Beta bezeichnet und MiniLM nicht als Benchmarkgewinner ausgegeben.
