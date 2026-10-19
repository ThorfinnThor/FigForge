# ADR-012: Teilelisten-Export für LEGO Pick a Brick, Rebrickable und BrickLink

**Status:** akzeptiert
**Datum:** 2026-09-30
**Erweitert:** 2026-10-19

## Kontext

Der Implementierungsplan (Kapitel 9.3/9.4) sieht als Einkaufsübergabe ein
BrickLink-Wanted-List-XML vor. Dafür werden BrickLink-Artikel- und Farbnummern
benötigt. Die Rebrickable Catalog Downloads/CSV enthalten keine BrickLink-Nummern,
die Rebrickable API ist in V1 ausgeschlossen und BrickLink-IDs dürfen nicht aus
anderen Nummernräumen geraten werden. Seit FF-06 war deshalb zunächst keine Figur
als BrickLink-XML exportierbar.

Die inzwischen gepinnte offizielle LDraw-Bibliothek enthält bei einem Teil der
exakt zugeordneten Dateien ausdrückliche `Bricklink <ID>`-Schlüsselwörter. Diese
ID wird nur übernommen, wenn dieselbe Datei die Rebrickable-Teilenummer ebenfalls
ausdrücklich nennt oder ihr Dateiname exakt dieser Teilenummer entspricht. Der
offizielle BrickLink Color Guide liefert einen getrennten Farbnummernraum; eine
Farbe wird nur bei exakter Namensübereinstimmung übernommen. Druckeltern- und
Geometrie-Fallbacks belegen keine Einkaufszuordnung.

Ergänzend wurden am 19. Oktober 2026 nach Anmeldung die offiziellen
BrickLink-Tabellen **Parts** und **Part and Color Codes** über den
Catalog-Download bezogen. Der Import akzeptiert eine Zuordnung nur, wenn LEGO-
Elementcode, primäre Artikelnummer und/oder ausdrücklich aufgeführte alternative
Artikelnummer gemeinsam genau eine im Parts-Katalog vorhandene BrickLink-
Artikelnummer ergeben. Mehrere Kandidaten bleiben gesperrt. Die Rohdateien sind
transient und werden nicht veröffentlicht; Hashes, Zeilenzahlen, jeder angenommene
Belegweg und alle offenen Fälle stehen im generierten Crosswalk.

Die freigegebenen Builder-Teile tragen dagegen belegte Rebrickable-Teilenummern.
`catalog-normalized.json` enthält aus `inventory_parts.csv.gz` zusätzlich die
in offiziellen Inventaren belegten Rebrickable-Farbnummern. `elements.csv.gz`
liefert, soweit vorhanden, die LEGO-Elementnummern der Teil-Farb-Kombinationen.
Bei gedruckten Torsos und Beinen, die nach ADR-009 nur als „Geometrie ohne Druck“
dargestellt werden, bleibt `rebrickablePartNum` die echte Druckvariante; die
unbedruckte Stellvertretergeometrie betrifft nur das 3D-Modell.

Recherche zu Zielseiten (Stand 2026-09-30; praktischer BrickLink-Test vom
2026-10-19):

| Ziel | Importweg | Benötigte IDs | Partnerprogramm |
| --- | --- | --- | --- |
| LEGO Pick a Brick | Upload einer CSV mit `elementId` und `quantity`, bis 400 Positionen; zunächst in Nordamerika eingeführt | LEGO-Elementnummer | LEGO-Affiliate-Programm über Rakuten Advertising; laut Drittquellen 3–5 % auf LEGO.com-Käufe. Ob Pick-a-Brick-Warenkörbe provisionsfähig sind, ist unbestätigt. |
| Rebrickable | Import einer Teileliste als CSV `Part,Color,Quantity` in das Nutzerkonto; von dort Kauf bei BrickLink, Brick Owl oder LEGO | Rebrickable-Teil und -Farbe | Kein Partnerprogramm für Drittseiten bekannt. |
| BrickLink | Wanted-List-XML | BrickLink-Artikel und -Farbe | Kein öffentliches Partnerprogramm gefunden. |
| Brick Owl | Wishlist-Import, u. a. BrickLink-XML | BrickLink- oder Brick-Owl-IDs | Partnerschema für Websites (z. B. Brickset); Bedingungen nicht öffentlich dokumentiert. |

## Entscheidung

1. FigForge exportiert drei getrennte Formate:
   - **LEGO Pick a Brick CSV** (`elementId,quantity`) – einziges Ziel mit
     bekanntem, öffentlich zugänglichem Partnerprogramm.
   - **Rebrickable-Teilelisten-CSV** (`Part,Color,Quantity`) – ohne Provision,
     aber weiterhin als breiter Katalogweg.
   - **BrickLink-Wanted-List-XML** (`ITEMTYPE=P`, `ITEMID`, `COLOR`, `MINQTY`) –
     nur für Teil-/Farb-Kombinationen mit den oben beschriebenen Belegen.
2. Die XML enthält keine Deklaration und kann auf BrickLinks offizieller
   Wanted-List-Uploadseite hochgeladen werden. FigForge nutzt keine BrickLink-API,
   verbindet kein Konto und führt keinen Kauf aus. Brick Owl bleibt ohne eigenen
   belegten Exportweg außerhalb des Umfangs.
3. Ein Generator erzeugt je Builder-Rolle ein Exportpaket unter
   `data/generated/shop-export/`. Es enthält für jedes builder-fertige Teil die
   in offiziellen Inventaren belegten Rebrickable-Farben, – sofern vorhanden –
   deren LEGO-Elementnummern sowie getrennte belegte BrickLink-Artikel- und
   Farbnummern. `data/generated/bricklink-item-crosswalk.json` dokumentiert den
   hashgebundenen offiziellen BrickLink-Katalogimport, die belegten IDs aus den
   gepinnten offiziellen LDraw-Headern sowie alle mehrdeutigen und unbelegten
   Teile. Dadurch benötigt die Validierung in einem sauberen CI-Checkout keine
   transienten Rohdownloads. Die App lädt ein Rollenpaket erst, wenn die Rolle
   in der Figur belegt ist.
4. Nichts wird geraten:
   - Hat ein Teil im Katalog keine Farbe, ist es für alle drei Formate blockiert.
   - Hat ein Teil mehrere belegte Katalogfarben, muss die Person eine davon im
     Figurenpanel ausdrücklich als Einkaufsfarbe wählen. Die Vorschaufarbe ist
     keine Nutzerwahl und wird nicht exportiert. Die Auswahl färbt die
     3D-Vorschau noch nicht um; die Oberfläche weist darauf hin.
   - Hat die Teil-Farb-Kombination keine oder mehrere LEGO-Elementnummern, ist
     sie nur für Pick a Brick blockiert.
   - Fehlt eine eindeutige BrickLink-Artikelnummer oder eine exakt abgeglichene
     BrickLink-Farbe, ist sie nur für BrickLink blockiert.
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
- Von 14.882 builder-fertigen Einträgen besitzen nach Zusammenführung der
  offiziellen BrickLink-Katalogtabellen mit den streng belegten LDraw-Metadaten
  14.087 eine eindeutige BrickLink-Artikelnummer. Zusammen mit den exakt
  abgeglichenen Farben ergeben sich 16.213 exportierbare Teil-Farb-Kombinationen.
  795 Artikelnummern bleiben mangels eindeutigen Belegs sichtbar blockiert;
  insbesondere werden mehrdeutige Kandidaten nicht geraten.
- Im aktuell ausgelieferten Suchkatalog mit 2.713 sichtbaren 3D-Teilen sind
  2.544 Artikelnummern eindeutig belegt; 169 bleiben aus demselben Grund
  blockiert. Damit ist die zuvor als „ca. 2.700“ bezeichnete Nutzeroberfläche
  vollständig geprüft, ohne fehlende Zuordnungen zu erfinden.
- Praktischer BrickLink-Test (2026-10-19): Die offizielle Uploadseite hat eine
  von FigForge erzeugte XML-Zeile (`ITEMTYPE=P`, `ITEMID=3626`, `COLOR=3`,
  `MINQTY=1`) als „Minifigure, Head (Plain)“, Yellow, Menge 1 erkannt und in die
  getrennte Wanted List „FigForge XML test 2026-10-19“ übernommen. Es wurde kein
  Kauf ausgelöst. BrickLink-IDs und Farbnamen können sich in späteren
  LDraw-/BrickLink-Ständen ändern und müssen bei Aktualisierung erneut geprüft
  werden.
- Vor der Aktivierung eines Partnerlinks sind die Programmbedingungen,
  insbesondere für Pick a Brick, und die Werbekennzeichnung rechtlich zu prüfen.
- Die Farbauswahl wird in neuen Figurenprojekten und Share-Links mit
  `schemaVersion: 2` gespeichert. V1-Projekte und V1-Links bleiben lesbar und
  werden beim Laden ohne erfundene Farbe migriert.
- Von 14.882 builder-fertigen Teilen besitzen 14.125 genau eine Katalogfarbe
  und 621 mehrere belegte Katalogfarben. Damit sind 14.746 Teile grundsätzlich
  als Rebrickable-Zeile exportierbar; bei den 621 mehrfarbigen Teilen erst nach
  der ausdrücklichen Auswahl. 136 Teile ohne belegte Katalogfarbe bleiben blockiert.

## Nachtrag 2026-10-19 (II): Pflege des BrickLink-Crosswalks ohne erneuten Download

**Problem.** Der Crosswalk muss zum aktuellen Katalogstand passen (Prüfsumme, vollständige
Abdeckung). Der Katalogstand ändert sich bei jedem wöchentlichen Refresh, der BrickLink-
Download braucht aber eine Anmeldung und bleibt ein manueller Schritt. Ohne Anpassung
wäre jeder Refresh an dieser Prüfung gescheitert.

**Entscheidung.**

1. Die BrickLink-Tabellen sind ein **Snapshot** mit Download-Datum (`snapshotDate`).
   Zuordnungen nach Teilenummer ändern sich selten; sie bleiben beim Refresh unverändert.
2. Der Schritt `assets:ldraw-expanded` gleicht den Crosswalk vor dem Exportbau ab
   (`refreshBrickLinkItemCrosswalkFile`, auch als `npm run data:refresh:bricklink`):
   - bestehende Zuordnungen bleiben,
   - neue Builder-Teile erhalten eine ID nur über eindeutig belegte offizielle LDraw-
     Header, sonst den Status `not-in-snapshot` und bleiben für BrickLink gesperrt,
   - nicht mehr vorhandene Teile entfallen,
   - die Prüfsumme des Katalogstands wird nachgezogen. Das Ergebnis ist deterministisch
     (keine Zeitstempel).
3. Ist der Snapshot älter als 90 Tage, öffnet der wöchentliche Lauf ein Issue (Label
   `bricklink-snapshot-stale`) mit der Anleitung für einen neuen Import
   (`npm run data:import:bricklink -- <Parts.txt> <Part-and-Color-Codes.txt> <Datum>`)
   und schließt es nach dem Import wieder. Die Rohdateien werden nicht committet.
4. Ein automatischer Download mit Anmeldedaten im CI wird bewusst nicht gebaut
   (Zugangsdaten, Nutzungsbedingungen, Fragilität).

**Folgen.** Neue Teile ohne LDraw-Header sind bis zum nächsten Snapshot nicht per
BrickLink exportierbar; die Oberfläche nennt den Grund. Die Quellenregel in `AGENTS.md`
und im Quellenregister nennt den BrickLink Catalog Download nun ausdrücklich. **Offen:**
die Nutzungsbedingungen des Downloads sind für die Veröffentlichung der abgeleiteten
Zuordnungstabelle in einem öffentlichen Repository rechtlich nicht geprüft.
