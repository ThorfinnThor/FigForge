# ADR-044: LEGO-Partnerlinks nach Browsersprache

**Status:** akzeptiert (Entscheidung des Eigentümers, 2026-10-22); Partnerlinks noch nicht aktiv  
**Datum:** 2026-10-22

## Kontext

FigForge richtet sich weltweit an Deutsch und Englisch sprechende Besucher. Das
LEGO-Partnerprogramm läuft bei Rakuten Advertising je Markt als eigenes Programm
(zum Beispiel Lego EU, Lego UK). Ein Partnerlink zahlt nur im passenden Markt.
Es gibt keinen Server (`AGENTS.md`: kein Worker-Handler im MVP), also keine
Länderzuordnung über die IP-Adresse.

## Entscheidung

- Der Markt wird im Browser aus `navigator.languages` gewählt (erste Sprache mit
  bekanntem Land, zum Beispiel `en-GB`, `de-AT`). Das wird nur lokal gelesen und
  nirgends übertragen. Ohne Landesangabe nutzt die deutsche Seite den deutschen
  Shop; sonst bleibt der Link unverändert.
- `src/procurement/lego-affiliate.ts` hält die Zuordnung Land → Shop (`de-de`,
  `de-at`, `en-gb`, …) und Programm (`eu`, `uk`) sowie die Deep-Link-Vorlagen
  (`LEGO_AFFILIATE_TEMPLATES`, `{url}` als Platzhalter, nur `https://click.linksynergy.com/…`).
  Solange eine Vorlage `null` ist, bekommen die Besucher des Programms den
  einfachen Link auf den passenden Shop.
- Die Datenschutzerklärung erwähnt Rakuten Advertising nur, solange mindestens
  eine Vorlage gesetzt ist (`privacySections(…, legoAffiliate)`, vorab erzeugtes
  HTML ebenso). Partnerlinks tragen `rel="sponsored"`; die Bereiche sind als
  Anzeige gekennzeichnet.
- Angewendet auf die LEGO-Links der Sets und des Zubehörs (`CuratedProductGrid`).
  Der Knopf „Pick a Brick öffnen“ bleibt ein einfacher Link, bis die
  Programmbedingungen dazu gelesen sind.

## Folgen

- Es ist eine Näherung: Ein Deutscher mit englischem Browser bekommt den
  britischen oder US-Shop. Genauer wäre ein Worker mit Länderangabe von
  Cloudflare; das braucht ein neues ADR und eine Änderung der Regel.
- Die Länderliste je Programm (`MARKETS`) muss zu den Programmbedingungen passen;
  ein Land bekommt erst dann ein Programm, wenn es dort abgedeckt ist.
- Aktivieren: siehe `docs/legal/lego-partnerlinks-aktivierung.md`.
