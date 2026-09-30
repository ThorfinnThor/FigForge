# ADR-012: Teilelisten-Export für LEGO Pick a Brick und Rebrickable

**Status:** vorgeschlagen
**Datum:** 2026-09-30

## Kontext

Der Implementierungsplan (Kapitel 9.3/9.4) sieht als Einkaufsübergabe ein
BrickLink-Wanted-List-XML vor. Dafür werden BrickLink-Artikel- und Farbnummern
benötigt. Diese stehen in keiner zulässigen Quelle: Die Rebrickable Catalog
Downloads/CSV enthalten keine BrickLink-Nummern, die Rebrickable API ist in V1
ausgeschlossen und BrickLink-IDs dürfen nicht aus anderen Nummernräumen geraten
werden. Seit FF-06 ist deshalb keine einzige Figur als BrickLink-XML exportierbar.

Die freigegebenen Builder-Teile tragen dagegen belegte Rebrickable-Teilenummern.
`catalog-normalized.json` enthält aus `elements.csv.gz` zusätzlich die
Rebrickable-Farbnummer und die LEGO-Elementnummern jeder Teil-Farb-Kombination.
Bei gedruckten Torsos und Beinen, die nach ADR-009 nur als „Geometrie ohne Druck“
dargestellt werden, bleibt `rebrickablePartNum` die echte Druckvariante; die
unbedruckte Stellvertretergeometrie betrifft nur das 3D-Modell.

Recherche zu Zielseiten (Stand 2026-09-30, ohne praktischen Importtest):

| Ziel | Importweg | Benötigte IDs | Partnerprogramm |
| --- | --- | --- | --- |
| LEGO Pick a Brick | Upload einer CSV mit `elementId` und `quantity`, bis 400 Positionen; zunächst in Nordamerika eingeführt | LEGO-Elementnummer | LEGO-Affiliate-Programm über Rakuten Advertising; laut Drittquellen 3–5 % auf LEGO.com-Käufe. Ob Pick-a-Brick-Warenkörbe provisionsfähig sind, ist unbestätigt. |
| Rebrickable | Import einer Teileliste als CSV `Part,Color,Quantity` in das Nutzerkonto; von dort Kauf bei BrickLink, Brick Owl oder LEGO | Rebrickable-Teil und -Farbe | Kein Partnerprogramm für Drittseiten bekannt. |
| BrickLink | Wanted-List-XML | BrickLink-Artikel und -Farbe | Kein öffentliches Partnerprogramm gefunden. |
| Brick Owl | Wishlist-Import, u. a. BrickLink-XML | BrickLink- oder Brick-Owl-IDs | Partnerschema für Websites (z. B. Brickset); Bedingungen nicht öffentlich dokumentiert. |

## Entscheidung

1. FigForge exportiert zusätzlich zwei Formate, deren IDs aus den zulässigen
   Catalog-Downloads stammen:
   - **LEGO Pick a Brick CSV** (`elementId,quantity`) – einziges Ziel mit
     bekanntem, öffentlich zugänglichem Partnerprogramm.
   - **Rebrickable-Teilelisten-CSV** (`Part,Color,Quantity`) – ohne Provision,
     aber Brücke zu BrickLink und Brick Owl, deren IDs FigForge nicht besitzt.
2. BrickLink-XML bleibt wie in FF-06 an bestätigte Beschaffungsrezepte gebunden.
   Brick Owl wird erst mit einer belegten ID-Quelle aufgenommen.
3. Ein Generator erzeugt je Builder-Rolle ein kleines Exportpaket unter
   `data/generated/shop-export/`. Es enthält für jedes builder-fertige Teil die
   eindeutige Rebrickable-Farbe und deren LEGO-Elementnummern. Die App lädt ein
   Paket erst, wenn die Rolle in der Figur belegt ist.
4. Nichts wird geraten:
   - Hat ein Teil im Katalog keine oder mehrere Farben, ist es für beide Formate
     blockiert („Farbe nicht eindeutig“). Die Vorschaufarbe ist keine Nutzerwahl
     und wird nicht exportiert.
   - Hat die Teil-Farb-Kombination keine oder mehrere LEGO-Elementnummern, ist
     sie nur für Pick a Brick blockiert.
   - Blockierte Teile erscheinen sichtbar in der Liste. Ein Download ohne sie ist
     möglich, benennt aber vorher, was fehlt (kein stiller Teil-Export).
5. Partner-IDs werden nicht erfunden. Ein Build-Wert
   `VITE_LEGO_AFFILIATE_LINK_TEMPLATE` mit dem Platzhalter `{url}` kann den
   Link zu Pick a Brick als Partnerlink ausgeben. Ist er nicht gesetzt oder
   ungültig, verlinkt FigForge direkt. Ist er gesetzt, zeigt die Oberfläche einen
   Werbehinweis neben dem Link.

## Folgen

- Kein Backend, keine API, kein Checkout. Preise, Verfügbarkeit und Kauf prüft
  die Person im jeweiligen Shop.
- Pick a Brick führt nur einen Teil aller Elemente. Nicht verkaufte Elemente
  meldet LEGO beim Upload; FigForge prüft keine Verfügbarkeit.
- Praktischer Test Pick a Brick (2026-09-30, Palico): Der Upload hat die CSV
  gelesen und beide Elementnummern (6002763, 6396389) erkannt, beide aber als
  „currently unavailable on Pick a Brick“ gemeldet. Format und Nummern stimmen;
  das Sortiment ist die Grenze. Die Oberfläche sagt das vorab und verweist auf
  die Rebrickable-Liste. Der Rebrickable-Import ist noch ungetestet.
- Vor der Aktivierung eines Partnerlinks sind die Programmbedingungen,
  insbesondere für Pick a Brick, und die Werbekennzeichnung rechtlich zu prüfen.
- Eine spätere Farbauswahl im Builder würde die Zahl eindeutig exportierbarer
  Teile erhöhen; sie ist nicht Teil dieser Entscheidung.
