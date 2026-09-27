# ADR-005: Versionierter lokaler Basissuch-Normalizer

- Status: angenommen
- Datum: 2026-09-27
- Ticket: FF-17

## Entscheidung

Die sofort verfügbare Suche nutzt einen kleinen, versionierten Deutsch→Englisch-Begriffs-Layer und deterministisches lexikalisches Ranking im Browser. Der Normalizer ist kein Übersetzer und ruft weder ein Modell noch eine externe API auf.

Er behandelt bekannte Zusammensetzungen vor Einzelwörtern, erhält IDs und unbekannte Wörter, führt belegte Flexionsformen zusammen und erkennt sichere Kategorien, Farben und Negationen strukturiert. Verwandte Begriffe wie `fangs` werden getrennt und schwächer gewichtet. Mehrdeutige Begriffe wie „Schild“ erzeugen eine Warnung, aber keine erfundene Übersetzung.

## Konsequenzen

- Die Basissuche ist sofort und offline aus den statischen Katalogdaten nutzbar.
- Kategorie- und Farbfilter werden nur angewendet, wenn der Parser sie sicher erkennt.
- Negationen bleiben im normalisierten Text und können als Ausschlussfilter wirken.
- Die Begriffslisten und Regression-Fixtures sind versioniert und per FF-03-Hash gebunden.
- Semantische Modelle, Embeddings, Worker, Downloads und externe Übersetzungsdienste gehören nicht zu FF-17.
