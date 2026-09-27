# FF-17-Verifikationsbericht: Basissuche und Normalizer

Stand: 27. September 2026.

## Ergebnis

FF-17 liefert eine sofort verfügbare, lokale Stichwortsuche mit dem versionierten Normalizer `de-en-domain-v1`:

- Exakte Rebrickable-Teilenummern werden geschützt und vor lexikalischen Treffern priorisiert.
- Bekannte Zusammensetzungen (`Ogerkopf`, `langes Schwert`) werden vor Einzelwörtern verarbeitet.
- Flexionen (`Hauer`, `Hauern`) werden zusammengeführt; verwandte Begriffe (`fangs`) bleiben schwächer getrennt.
- Sichere Negationen (`ohne Helm`) bleiben sichtbar und werden als Ausschluss behandelt.
- Kategorien und Farben werden nur als strukturierte Filter gesetzt, wenn das Lexikon sie eindeutig erkennt.
- Unbekannte Wörter bleiben im normalisierten Suchtext und werden in der UI angezeigt.
- Mehrdeutige Ausdrücke wie „Schild“ erzeugen eine Warnung und keine erfundene Übersetzung.

Die Katalogsuche verarbeitet weiterhin nur die kuratierten FF-03-Daten. Es gibt keinen Modell-Download, keine Embeddings, keinen Worker und keine externe Übersetzungs- oder Rebrickable-API.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run data:validate:ff17` | Erfolgreich; Normalizer `de-en-domain-v1`, 23 Lexikoneinträge, 9 Fixtures, exakte ID-Suche geprüft. |
| FF-17-Unit-Tests | Erfolgreich; 57 Tests insgesamt, einschließlich IDs, Zusammensetzungen, Farben, Kategorien, Negationen, Mehrdeutigkeit und unbekannter Wörter. |
| `npm run typecheck` | Erfolgreich. |
| `npm run lint` | Erfolgreich. |
| `npm run build` | Erfolgreich. |
| `npm run cf:check` | Erfolgreich; Wrangler-Dry-Run ohne Bindings. |
| `npm audit --audit-level=high` | Erfolgreich; 0 Schwachstellen. |

## Offene Risiken

1. Die Fixtures belegen Normalizer-Verträge und deterministische Suche, aber noch keine semantische Relevanz im 160-Fälle-Testset.
2. Unklare Begriffe werden nicht automatisch disambiguiert; dafür ist eine menschliche Suchannotation erforderlich.
3. Erweiterte Suche, Modell-/Indexprofile und Browser-Downloadmessungen sind nicht Bestandteil von FF-17.
