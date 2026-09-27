# FF-05/FF-16 – digitale Anschlussprofile

## Ergebnis

Die manuelle 18-Fälle-Passformeingabe ist nicht mehr Bestandteil des Builder-Laufzeitpfads. FigForge verwendet eine gepinnte Teilmenge der LDCad Shadow Library auf Revision `9b1131fb1991f8c0bfc072325e4e12f6271aba35`.

| Bereich | Ergebnis |
|---|---|
| Köpfe | 3 digital unterstützt |
| Kopfbedeckungen | 3 digital unterstützt |
| Handzubehör | `10053` und `3841` digital unterstützt |
| Blockiert | `11439` ohne Snap-Metadaten; `3814` nur unvollständige Torsohülle |
| Menschliche Eingabe | nicht erforderlich |
| Veröffentlichung | weiterhin `false`; kein Deployment |

## Sicherheitsgrenzen

- Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien und keine Rebrickable API.
- Die LDCad-Daten sind eine separate Verbindungsquelle und keine Katalogquelle.
- Digitale Platzierung ist keine Garantie für Klemmkraft oder Materialspannung.
- Unbekannte Profile bleiben gesperrt.

## Lizenz

Die vendorten Verbindungslinien und die daraus normalisierte Registry stehen unter CC BY-SA 4.0. Attribution und Revision werden unter `public/licenses/LDCadShadowLibrary-NOTICE.txt` ausgeliefert.
