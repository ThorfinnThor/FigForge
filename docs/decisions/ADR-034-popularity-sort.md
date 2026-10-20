# ADR-034: Standardreihenfolge nach Beliebtheit

**Status:** akzeptiert  
**Datum:** 2026-10-20

## Kontext

Die Teileliste im Builder war nach den baubaren und den vorgestellten Teilen
rein nach Teilenummer sortiert. Wer „Kopf“ öffnete, sah zuerst seltene,
numerisch frühe Sonderköpfe statt der Teile, die man am ehesten sucht.

## Entscheidung

Jedes Katalogpaket-Teil erhält das optionale Feld `setCount`: die Zahl der
verschiedenen Rebrickable-Sets, in denen die Teilenummer vorkommt (direkte
Inventarteile und Teile der enthaltenen Minifiguren, wie im Set-Index aus
ADR-020). Der Generator berechnet sie aus `catalog-set-index.json`; Teile ohne
Set tragen das Feld nicht. Der Daten-Refresh übergibt den frisch gebauten Index
an den Paketbau, der eigenständige Befehl `data:build:catalog-packages` liest
ihn aus `data/generated`. `validate-generated-catalog` prüft, dass jeder Wert
zum Set-Index passt.

Die Standardreihenfolge ist: baubare Teile zuerst, dann die Teile der
Starterfiguren, dann `setCount` absteigend, bei Gleichstand nach Teilenummer
(`src/catalog/part-popularity.ts`). Die Suche mit Suchbegriff behält ihre
eigene Rangfolge.

## Folgen

- Die Katalogpakete wachsen um rund 4 % (etwa 0,1 MB entpackt).
- „Beliebt“ heißt hier „kommt in vielen Sets vor“, nicht „wird oft gekauft“
  oder „wird oft gebaut“. Die Oberfläche behauptet nichts darüber hinaus.
- Der Wert ändert sich mit jedem Refresh leicht; Refresh-PRs enthalten diese
  Änderungen in den Paketdateien.
