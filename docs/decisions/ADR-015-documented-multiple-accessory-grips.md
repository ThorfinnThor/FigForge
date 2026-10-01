# ADR-015: Dokumentierte Auswahl bei mehreren geometrischen Zubehörgriffen

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Bei 107 noch gesperrten Zubehörteilen enthält die offizielle LDraw-Geometrie mehrere Rundzylinder in Handgriffgröße. Eine kollisionsfreie Position allein bestimmt nicht, welcher Zylinder als Handgriff gedacht ist. Die bereits gepinnte LDCad Shadow Library beschreibt bei sieben dieser Katalogteile genau einen männlichen Rundverbinder in Handgriffgröße.

## Entscheidung

Die sieben belegten Fälle werden in `data/curated/ldraw-multiple-grip-clearance-reviews.json` versioniert. Nur der eine dokumentierte LDCad-Verbinder wird geprüft; geometrische Alternativen werden nicht geraten. Die Prüfung verwendet wie ADR-014 die tatsächliche geschlossene Referenzgeometrie. Zwei zusätzliche Anschlussdateien werden aus derselben bereits gesperrten LDCad-Revision übernommen.

Drei Teile bestehen die digitale Kollisionsprüfung und werden freigeschaltet. Vier Teile kollidieren auch gegen die geschlossene Geometrie und bleiben gesperrt. Die übrigen 100 Fälle besitzen in der gepinnten Anschlussquelle keinen eindeutig einzelnen Handgriff und bleiben ebenfalls gesperrt.

Es gelten weiterhin ausschließlich Rebrickable Catalog Downloads/CSV, die gepinnte offizielle LDraw-Bibliothek und die gepinnte LDCad Shadow Library. Rebrickable-API und MOC-Dateien sind ausgeschlossen.

## Folgen

Die Auswahl ist reproduzierbar und quellenbelegt. Sie erhöht den Builder-Katalog um drei Teile, ohne bei den anderen 104 Fällen eine beabsichtigte Griffposition zu erfinden. Digitale Kollisionsfreiheit ist keine Garantie für reale Klemmkraft oder Materialspannung.
