# ADR-011: Erweiterten LDraw-Katalog je Kategorie nachladen

- Status: vorgeschlagen
- Datum: 2026-09-30
- Entscheidung durch: Projektverantwortlicher (Schritt 1 „Katalog nachladen statt mitliefern“ freigegeben)
- Tickets: FF-05, FF-16; folgt auf ADR-008 und ADR-009

## Kontext

Seit ADR-009 bindet die App `data/generated/ldraw-expanded-catalog.json` vollständig in das Haupt-Bundle ein. Das Bundle ist dadurch auf rund 15 MB gewachsen (gzip 1,3 MB). Cloudflare Workers Static Assets erlauben höchstens 25 MiB je Datei. Die geplante Freischaltung von Köpfen, Kopfbedeckungen und Zubehör würde diese Grenze erreichen, und jeder Besuch lädt den ganzen Katalog, auch wenn nur eine Kategorie angesehen wird.

## Entscheidung

1. Der Generator schreibt neben dem vollständigen Katalog je Kategorie ein schlankes Laufzeitpaket nach `data/generated/ldraw-runtime/<kategorie>.json`.
2. Ein Paket enthält nur, was Auflisten, Auswählen und Platzieren brauchen: Rebrickable-Nummer, LDraw-Datei und -Stand, Modell- und Vorschau-URL, Art des Geometrie-Fallbacks und einen Verweis auf eine gemeinsame Platzierungstabelle. Namen kommen weiterhin aus dem Rebrickable-Katalogpaket; Belege, Zuordnungsgründe und Hinweise bleiben im vollständigen Katalog.
3. Die App lädt ein Paket erst, wenn die Kategorie geöffnet wird oder eine gespeicherte bzw. importierte Figur Teile daraus nennt. Kuratierte Standardteile bleiben im Haupt-Bundle, damit die Startfigur sofort steht.
4. Der Validator prüft, dass die Laufzeitpakete exakt aus dem vollständigen Katalog abgeleitet sind. Sie sind generierte Daten und werden nicht von Hand bearbeitet.

## Konsequenzen

- Das Haupt-Bundle schrumpft von rund 15 MB auf rund 0,4 MB. Das größte nachgeladene Paket (Oberkörper) liegt bei rund 2,3 MB (gzip 0,23 MB).
- Beim ersten Öffnen einer Kategorie entsteht eine kurze Ladezeit; die Oberfläche zeigt dafür schon heute „Katalogpaket wird geladen …“.
- Weitere Freischaltungen wachsen nur das Paket ihrer Kategorie.
- Keine neue Laufzeitabhängigkeit, kein Worker-API-Handler, keine Cloud-Datenbank.
