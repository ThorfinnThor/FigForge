# LEGO-Partnerlinks aktivieren

Stand 2026-10-22: gebaut (ADR-044), **nicht aktiv**, bis Vorlagen eingetragen sind.

1. **Rakuten-Konto:** `createyourminifig.com` im Profil als Seite eintragen, Profil vervollständigen, dann bei den Programmen **Lego EU** (MID 50641) und **Lego UK** (MID 24340) auf „Apply“ klicken. Die Bedingungen („View offer terms“) vorher lesen: Markennutzung, Einschränkungen für Links, abgedeckte Länder.
2. **Deep-Link-Vorlage je Programm:** Im Rakuten-Dashboard unter Links einen Deep Link für eine LEGO-Produktseite erzeugen. In der erzeugten Adresse die Produktadresse (nach `murl=`) durch `{url}` ersetzen. Beispiel: `https://click.linksynergy.com/deeplink?id=…&mid=50641&murl={url}`.
3. **Eintragen:** in `src/procurement/lego-affiliate.ts` die Vorlage bei `LEGO_AFFILIATE_TEMPLATES` setzen (`eu`, `uk`). Länder, die das Programm abdeckt, in `MARKETS` dem Programm zuordnen (Feld `region`).
4. **Danach prüfen:** Ein Test stellt sicher, dass Vorlagen nur `https://click.linksynergy.com/…` mit genau einem `{url}` sein dürfen. Die Datenschutzerklärung erwähnt Rakuten Advertising dann automatisch (Abschnitt „Externe Links und Partnerlinks“). **Diesen Absatz rechtlich prüfen lassen**, vor allem die Aussage zur Verarbeitung außerhalb der EU.
5. Auf der Live-Seite `/sets` mit einem Browser in Deutsch und einem in Englisch (Großbritannien) ansehen, dass die Links „Bei LEGO prüfen“ über `click.linksynergy.com` laufen und im jeweiligen Shop landen.
