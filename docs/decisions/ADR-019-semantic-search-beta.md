# ADR-019: Lokale semantische Suche als explizite Beta

## Status

Angenommen für die technische Integration; die endgültige FF-18-Profilentscheidung bleibt blockiert.

## Kontext

Die Basissuche läuft bereits lokal. Die vorhandenen FF-18-Artefakte vergleichen MiniLM und E5 jedoch nur an 17 kuratierten Dokumenten; alle 160 menschlichen Relevanzurteile sind weiterhin leer. Der Plan erlaubt deshalb noch keine Behauptung, MiniLM sei das endgültig freigegebene Profil. Gleichzeitig soll der vorgesehene Browserpfad mit dem real nutzbaren Katalog implementiert werden.

## Entscheidung

- Die App bietet `compact-minilm` ausdrücklich als optionale Beta an.
- Der Build berechnet 384-dimensionale, L2-normalisierte Float32-Vektoren für die 2.726 builderfähigen Teile mit exakter Druckgeometrie. Im Browser wird ausschließlich der Suchtext eingebettet.
- Modell, Tokenizer, ONNX-WASM-Laufzeit, Mapping und Index werden statisch über Cloudflare ausgeliefert. Es gibt keine Such-API und keine Übertragung der Anfrage.
- Das Paket wird erst nach einer Nutzeraktion geladen, in einem Web-Worker ausgeführt, anhand der gelockten Bytezahlen und SHA-256-Werte geprüft und im Browser-Cache abgelegt.
- Exakte IDs, Kategorien, Farben und Negationen bleiben deterministisch. Semantische Treffer ergänzen die Basissuche und dürfen deren ID-/Filterregeln nicht umgehen.
- Bei Abbruch oder Fehler bleibt die Basissuche verfügbar.
- E5 wird nicht öffentlich mitgeladen. Die endgültige Profilwahl und Qualitätsaussage bleiben bis zum menschlichen Relevanzreview gesperrt.

## Folgen

Der reale zusätzliche Download beträgt 42.443.717 Byte und überschreitet damit die im Plan formulierte Hypothese von 25–35 MB. Größte Einzeldatei ist das gelockte INT8-ONNX-Modell mit 22.972.370 Byte und bleibt unter dem Cloudflare-Einzeldateilimit. Das Paket erhöht nicht den initialen App-Download.

Die Suchdokumente verwenden ausschließlich Rebrickable-Katalognamen, Kategorien, belegte Farben, Rollen und IDs. Es werden keine Merkmale erfunden und keine MOC-Dateien oder Rebrickable-API-Daten verwendet.
