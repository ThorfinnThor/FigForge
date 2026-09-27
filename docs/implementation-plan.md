# FigForge — Implementierungsplan und Design-Spezifikation

**Version:** 1.2 · **Aktualisiert:** 27. September 2026  
**Status:** Spezifikation zur Umsetzung; noch keine implementierte oder rechtlich freigegebene Anwendung.  
**Arbeitsname:** FigForge. Name, Domain und Logo sind noch nicht auf Verfügbarkeit oder kollidierende Rechte geprüft.  
**Entwicklungsmodelle:** GPT-6 Sol und GPT-6 Luna. Die Aufgabenverteilung ist eine Empfehlung für dieses Projekt, keine Garantie über Modellleistung oder Kosten.

> **Produktversprechen:** Beschreibe ein Teil in deinen eigenen Worten, kombiniere nachgewiesene Originalteile zu einer digitalen Figur und exportiere eine überprüfbare Einkaufsliste.
>
> **Technische Leitentscheidung:** Ein begrenzter Minifiguren-Konfigurator auf freien Komponenten — kein nachgebautes LEGO-CAD-System. Die Anwendung läuft zunächst ohne eigenes Anwendungsbackend.

### Änderungen in Version 1.2

**Verbindlich beschlossen:** Alle Teile-Embeddings werden vorab in der Build-Pipeline erzeugt (Option 2). Für die lokale Anfrageverarbeitung vergleichen wir ein kompaktes englisches MiniLM mit einem kuratierten Deutsch→Englisch-Begriffs-Layer gegen das mehrsprachige E5-small. Das kleine Modell ist der bevorzugte Testkandidat, **noch kein festgelegter Qualitätssieger**. Ein dokumentierter Vergleich entscheidet über den Release. Die App bleibt zunächst ohne eigenes Anwendungsbackend.

**Rebrickable-Klarstellung:** Version 1 verwendet ausschließlich die Rebrickable-**Downloads/CSV-Dateien** für den Katalogimport. Die vom Projektverantwortlichen bestätigte kommerzielle Nutzbarkeit wird **nur auf diese Download-Daten** bezogen. Die Rebrickable API ist für den MVP weder technisch erforderlich noch als kommerziell freigegeben vorausgesetzt. Jeder spätere API-Einsatz ist ein separates Vorhaben und setzt eine erneute Prüfung der dann geltenden API-Bedingungen beziehungsweise eine ausdrückliche Freigabe voraus.

> **Verbindliche Datenquellen-Grenze: Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.** Rebrickable-MOC-Dateien, MOC-Anleitungen und sonstige nutzergenerierte MOC-Inhalte werden weder importiert noch verarbeitet oder ausgeliefert.

**Verbindliche Betriebsentscheidung:** GitHub ist das zentrale Repository. Regelmäßige Katalogaktualisierungen laufen als geplante GitHub Actions und verwenden ausschließlich die freigegebenen Rebrickable Catalog Downloads/CSV. Der Workflow validiert Änderungen und erstellt oder aktualisiert einen Review-Pull-Request; er überträgt ungeprüfte Daten nicht direkt nach Produktion. Nach Review und Merge baut und deployt Cloudflare Workers Builds die Anwendung aus dem GitHub-Repository als Cloudflare Workers Static Assets. GitHub Actions besitzt keine Cloudflare-Produktionszugangsdaten und übernimmt nicht das Produktionsdeployment.

Kapitel 1, 5, 6, 10–12 sowie 15–17 wurden entsprechend präzisiert. Die ausgewählte Designrichtung und der übrige Produktumfang bleiben unverändert.

**Nachweisumfang dieser Revision:** Die neu aufgenommenen Modellkarten, Dateilisten, Cloudflare Workers Static Assets, Workers Builds und die relevante Hosting-Dateigrenze wurden erneut abgerufen. Die übrigen Quellenstatus aus Version 1.0 werden nicht als in dieser Revision erneut geprüft ausgegeben. Es wurden noch keine Suchbenchmarks oder Browsermessungen ausgeführt.

## Inhalt

1. [Ziel und verbindliche Entscheidungen](#1-ziel-und-verbindliche-entscheidungen)
2. [Korrekturen und offene Nachweise](#2-korrekturen-und-offene-nachweise)
3. [MVP und Nutzerablauf](#3-mvp-und-nutzerablauf)
4. [Design-Spezifikation](#4-design-spezifikation)
5. [Architektur und Wiederverwendung](#5-architektur-und-wiederverwendung)
6. [Datenmodell und Datenpipeline](#6-datenmodell-und-datenpipeline)
7. [3D-Builder und Kompatibilität](#7-3d-builder-und-kompatibilität)
8. [Semantische Suche](#8-semantische-suche)
9. [Speichern, Teilen und Einkaufslisten](#9-speichern-teilen-und-einkaufslisten)
10. [Rechte, Datenschutz und Sicherheit](#10-rechte-datenschutz-und-sicherheit)
11. [Hosting, Kosten und Leistungsbudgets](#11-hosting-kosten-und-leistungsbudgets)
12. [Umsetzungsphasen und Arbeitspakete](#12-umsetzungsphasen-und-arbeitspakete)
13. [Aufgabenverteilung zwischen Sol und Luna](#13-aufgabenverteilung-zwischen-sol-und-luna)
14. [Tests und Abnahmekriterien](#14-tests-und-abnahmekriterien)
15. [Repository, Startaufträge und Zusammenarbeit](#15-repository-startaufträge-und-zusammenarbeit)
16. [Release-Checkliste und spätere Ausbaustufen](#16-release-checkliste-und-spätere-ausbaustufen)
17. [Quellen und Verifikationsstatus](#17-quellen-und-verifikationsstatus)

---

## 1. Ziel und verbindliche Entscheidungen

Wir testen, ob eine einfache Verbindung aus **natürlicher Teilesuche, unmittelbarer 3D-Vorschau und brauchbarem Einkaufslistenexport** einen eigenständigen Nutzen hat. Eine große Nachfrage oder Zahlungsbereitschaft ist bislang nicht nachgewiesen. Deshalb steht ein kleiner, überprüfbarer Funktionsumfang vor Vollständigkeit.

| Entscheidung | Festlegung für Version 1 |
|---|---|
| Zielgruppe | Menschen, die eigene Figuren aus existierenden Teilen kombinieren möchten, ohne Katalognamen auswendig zu kennen. |
| Kernablauf | Suchen → einsetzen → vergleichen → lokal speichern → Teileliste exportieren. |
| Katalog | Kuratierter, belegbarer Ausschnitt statt „alle existierenden Minifiguren-Teile“. |
| Figuren | Zunächst Standard-Minifiguren mit geprüften Anschlusspunkten; keine beliebigen Bigfigs oder Sonderkörpersysteme. |
| Technik | React, TypeScript, Vite, Three.js und LDrawLoader; statische Daten und Assets. |
| Suche | Sofort verfügbare Stichwort-/Synonymsuche plus lokale semantische Suche. Bevorzugter Testkandidat: MiniLM-L6 INT8 mit deutschem Begriffs-Layer; E5-small INT8 als Qualitätsbaseline. |
| Teile-Embeddings — Option 2 | Verbindlich vorab beim Build berechnen. Im Nutzerbrowser nur den Suchtext einbetten und mit dem passenden statischen Index vergleichen. |
| Modellwahl — Option 1 | Zwei getrennte Modelle/Indizes im Entwicklungstest, ein freigegebenes Profil im regulären Release. Keine automatische Doppelinstallation beim Nutzer. |
| Datenbeschaffung | Offline-/Build-Pipeline; keine fremden API-Schlüssel im Browser. |
| Repository | GitHub ist die maßgebliche Quelle für Code, Konfiguration und geprüfte Datenänderungen. |
| Regelmäßige Datenpflege | Geplante GitHub Actions laden nur Rebrickable Catalog Downloads/CSV, prüfen Hashes/Schemata/Provenienz und erstellen einen Review-Pull-Request; kein ungeprüfter Direktimport nach `main` oder Produktion. |
| Build und Deployment | Cloudflare Workers Builds ist mit GitHub verbunden und baut/deployt nach Review und Merge; Vorschauen für Arbeitsbranches/PRs, Produktion ausschließlich vom geschützten Produktionsbranch. |
| Hosting | Cloudflare Workers Static Assets; im MVP kein eigener Worker-API-Handler und keine Cloud-Datenbank. |
| Speicherung | IndexedDB; ergänzend JSON-Dateien und versionierte Share-Links. |
| Kaufen | BrickLink-kompatibles XML plus Erläuterung des manuellen Imports. Kein eigener Checkout. |
| Backend | Kein eigener API-Server, keine Cloud-Datenbank und keine Accounts in Version 1. |
| Design | Heller, ruhiger Katalog mit eigenständiger Typografie, grünen Funktionsakzenten und sparsamem Lime-/Sketchbook-Charakter. |
| Sprache | Deutsche Oberfläche als Standard, englische Fassung vorbereiten. Suche mindestens auf Deutsch und Englisch testen. |
| Kosten | Möglichst keine laufenden Infrastrukturgebühren im MVP; Entwicklungsaufwand, Modellnutzung beim Programmieren und Rechtsprüfung getrennt betrachten. |

**Reihenfolge:** Zuerst beweisen, dass echte Teile korrekt geladen, kombiniert und auf Einkaufspositionen abgebildet werden können. Danach Katalog und Suchqualität ausbauen. Keine monatelange Datenanreicherung, bevor die ersten realen Figuren funktionieren.

### Was „backendlos“ hier bedeutet

Die Website wird über Cloudflare Workers Static Assets per HTTPS ausgeliefert. Backendlos heißt in diesem Plan: **keine eigene serverseitige Geschäftslogik im laufenden Produkt**. GitHub Actions für Datenpflege und Tests sowie Cloudflare Workers Builds für Build und Deployment sind CI/CD-Infrastruktur, keine dauerhaft betriebene Anwendungs-API. Im MVP gibt es keinen eigenen Worker-Request-Handler, keine Cloud-Datenbank und keine serverseitige Suche.

Sol und Luna werden als **Werkzeuge zum Entwickeln** eingesetzt. Sie werden **nicht** in die öffentlich erreichbare App eingebaut und nicht bei jeder Nutzersuche aufgerufen.

---

## 2. Korrekturen und offene Nachweise

Einige Aussagen aus der bisherigen Ideensammlung waren zu weitgehend. Diese Spezifikation ersetzt sie durch überprüfbare Bedingungen.

| Frühere Vereinfachung | Verbindliche Behandlung im Plan |
|---|---|
| „Die Minifig-Dateien entsprechen dem verfügbaren Katalog.“ | LDraw-Dateien können auch Unterteile, Primitive, Varianten oder Baugruppen sein. Dateizahl ist keine Zahl kaufbarer Artikel. |
| „Eine passende Teilenummer genügt.“ | Modell, Druckvariante, Farbe, Nummerierungssystem und gegebenenfalls Verkaufsbaugruppe müssen zusammenpassen. |
| „Jedes Kopf-/Haarteil passt an denselben Slot.“ | Das ist nur für geprüfte Familien zulässig. Sonderformen, Helme, Nackenaufsätze und Waffen brauchen Ausnahmen. |
| „LDraw enthält alle benötigten Verbindungspunkte.“ | Anschlusspunkte werden in unserer eigenen Registry geprüft und ergänzt. Wir setzen keine vollständige standardisierte Snap-Datenbank voraus. |
| „Rebrickable-CSV enthält automatisch alle externen IDs.“ | Das konkrete Downloadschema wird untersucht. Fehlende Zuordnungen werden nicht aus ähnlichen Nummern geraten. |
| „Die Quellenfreigabe ersetzt die Dokumentation.“ | Der Projektverantwortliche hat die kommerzielle Nutzbarkeit der Rebrickable **Downloads/CSV** bestätigt. Wir planen diese Download-Daten ein und hinterlegen den einschlägigen Lizenz-/Bedingungsnachweis samt Quellenangabe im Register. Keine automatische Ausdehnung auf API, Fotos, andere Inhalte oder nicht erfasste Rechte. [S03](#s03) |
| „Kein Backend bedeutet keine Kosten pro Nutzer.“ | Es entfallen serverseitige Inferenzaufrufe; Datenübertragung, Speicher, Hardware und Hostingbedingungen bleiben relevant. |
| „Jedes Suchmodell braucht dieselbe Downloadlösung.“ | MiniLM-L6 hat eine geprüfte INT8-Datei von rund 23 MB und passt größenmäßig unter das 25-MiB-Assetlimit; E5-small mit rund 118 MB benötigt eine andere Verteilung. Die tatsächlich gewählten Dateien entscheiden, nicht der Modellname. [S09](#s09)[S20](#s20)[S23](#s23) |
| „Der Disclaimer macht die App kommerziell sicher.“ | Nein. Die Fair-Play-Seite ist keine pauschale kommerzielle Lizenz; der Disclaimer repariert keine unzulässige Nutzung. [S10](#s10) |
| „Rechtsprobleme lassen sich später nur durch Branding lösen.“ | Nicht garantiert. Ein Problem mit Formen, Aufdrucken oder Datenrechten kann auch Asset-Auswahl und Kernfunktion betreffen. |

### Der Entwurf ist eine Stilreferenz, kein Katalogbeleg

Die generierte Designgrafik enthält nicht verifizierte Teilenummern, illustrative Aufdrucke und eine inszenierte Figur. **Keine Nummer, Farbe, Waffe oder Rüstung wird aus dem Bild ungeprüft in Produktdaten übernommen.** Auch „24 Treffer“, „thousands of parts“ und vermeintliche Verfügbarkeiten sind keine belegten Produktdaten.

Die Fantasy-Figur dient der Gestaltung. Die umgesetzte Vorschau muss aus den tatsächlich freigegebenen Modellen entstehen — ohne erfundene Details, Stoffsimulationen oder Zusatzteile, die sich nicht auf der Teileliste wiederfinden.

---

## 3. MVP und Nutzerablauf

### 3.1 Umfang

**Technischer Proof of Concept:** etwa 20–40 geprüfte Varianten, darunter mindestens fünf Köpfe, fünf Haar-/Kopfbedeckungsoptionen, mehrere Oberkörper-/Beinbaugruppen und drei Handaccessoires. Ziel ist der vollständige Ablauf, nicht eine bestimmte Kataloggröße.

**Geschlossene Alpha:** Planungsziel von etwa 250–500 geprüften Varianten über mehrere Stile, etwa Alltag, Fantasy und Weltraum. Die Zahl wird reduziert, falls Rechte, Modellqualität oder Einkaufszuordnung nicht sauber nachweisbar sind.

„Variante“ bedeutet eine konkret unterscheidbare Kombination aus Teil, Aufdruck und belegter Farbe. Varianten derselben Geometrie können ein gemeinsames Modell verwenden, sofern das Rendering exakt bleibt.

| Bereich | Im MVP | Bewusst später |
|---|---|---|
| Suche | Deutsche/englische Texte, IDs, Kategorien, Farben, Sortierung nach Relevanz. | Bildsuche, Fotoanalyse, generative Figuren. |
| Builder | Kopf, Kopfbedeckung, Oberkörperbaugruppe, Beinbaugruppe, linkes/rechtes Handaccessoire; ausgewählte Nackenaufsätze nach Test. | Frei austauschbare Arme/Hände, flexible Umhänge, Bigfigs, Minidolls, beliebiges Bauen. |
| Vorschau | Drehen, zoomen, feste Kameraansichten, ausgewähltes Teil hervorheben. | Beliebige Gelenkposen, Fotostudio, eigene Hintergründe und Dioramen. |
| Speichern | Aktuelle Figur, lokale Sammlung, lokale Favoriten, JSON-Import/-Export. | Cloud-Sync, Accounts und öffentliche Galerien. |
| Teilen | URL-Fragment mit begrenztem, validiertem Figureninhalt. | Öffentliche Profilseiten und serverseitige Linkvorschauen. |
| Einkauf | Prüfliste und BrickLink-XML, Kopierfunktion, Importhilfe. | Live-Preise, Lagerbestand, Shopoptimierung und API-Account-Verbindung. |
| Produktseiten | Builder, lokale Sammlung, Hilfe, Credits/Lizenzen, Datenschutz, Anbieterkennzeichnung. | Community, Newsfeed, Likes, Bezahlschranke. |

### 3.2 Hauptablauf

1. Die App öffnet direkt den Builder mit einer aus echten Assets zusammengesetzten Beispielfigur. Kein Login und keine vorgeschaltete Werbeseite.
2. Der Nutzer sucht beispielsweise „Ogerkopf mit Hauern“. Die App zeigt passende geprüfte Kandidaten; keine Garantie auf einen Treffer bei jeder Beschreibung.
3. Ein Klick setzt das Teil in den passenden Slot. Unpassende Kombinationen werden erklärt, nicht stillschweigend zugelassen.
4. Die Auswahl wird in der 3D-Vorschau und in „Deine Figur“ gleichzeitig aktualisiert. Ein Rückgängig-Schritt bleibt möglich.
5. Der Nutzer ergänzt etwa ein langes Schwert. Bei einem beidseitig möglichen Accessoire wählt er „Linke Hand“ oder „Rechte Hand“.
6. „Teileliste prüfen“ öffnet die normalisierten Einkaufspositionen und zeigt fehlende Zuordnungen, Mengen und bekannte Einschränkungen.
7. Der Nutzer kopiert oder speichert das XML und öffnet separat BrickLinks Wanted-List-Import. Preise, Versand und Kauf werden dort geprüft.

### 3.3 Produktwahrheit

Drei Zustände müssen überall getrennt werden:

- **Katalog belegt:** Wir haben einen Nachweis für diese Teil-/Farbvariante.
- **Digital unterstützt:** Unser Modell und dessen Platzierung wurden geprüft.
- **Aktuell kaufbar:** Das würde aktuelle Händlerdaten verlangen; im MVP ist es **nicht geprüft**.

Eine vorhandene Katalogvariante darf deshalb niemals automatisch ein grünes „Auf Lager“ oder einen erfundenen Preis erhalten.

---

## 4. Design-Spezifikation

### 4.1 Referenz und Übersetzung in eine echte Arbeitsoberfläche

![Freigegebene visuelle Stilreferenz: FigForge mit hellem Katalog, grünen und limefarbenen Akzenten sowie zentraler Figur.](assets/figforge-design-reference.png)

**Referenzauflösung:** 1536 × 1024 Pixel. Das Bild ist im Begleitpaket enthalten. Farben, Typografie und Maße unten sind daraus abgeleitete, bewusst präzisierte Designentscheidungen — keine Behauptung über exakt gemessene Schriftarten oder Pixelwerte des generierten Bildes.

Die Richtung bleibt: **überwiegend Clean Minimal, etwas Creative Studio und nur wenig dramatische Inszenierung**. Der Arbeitsbereich hat Vorrang vor dekorativem Marketing.

**Beibehalten:** helle Flächen, links die Kategorien, daneben die Suchergebnisse, eine große Figur und rechts die Teileübersicht; ein handgezeichneter Markenakzent und ein dezenter Lime-Pinselstrich hinter der Vorschau.

**Ändern:** weniger Werbetext, keine nicht existierenden Menüpunkte, keine angeblichen Konten, keine redundanten Einkaufsbuttons, kein großes Marketing-Footerband im sichtbaren Arbeitsbereich. Der Fantasy-Look der Beispielperson wird nicht zur Einschränkung auf ein einzelnes Thema.

### 4.2 Marke und grafische Sprache

**Arbeitswortmarke:** „FigForge“ in einer markanten, leicht handschriftlichen Form. Für den Prototyp eine typografische Lösung verwenden; keine Minifiguren-Silhouette als Logo. Die kleine gezeichnete Krone aus der Referenz ist optional und bleibt bis zur Namens-/Markenprüfung ein Entwurf.

**Tagline:** „Echte Teile. Eigene Charaktere.“

**Stilregeln:**

- Keine violett-blauen SaaS-Verläufe, gläsernen Karten, leuchtenden Außenkanten oder übergroßen Pillen.
- Farbe hat eine Funktion: Grün für Auswahl und Bestätigung, Lime für den primären nächsten Schritt und die Marke.
- Höchstens ein größerer Sketchbook-Akzent pro sichtbarer Arbeitsfläche. Keine Kritzeleien hinter Suchtexten oder Teilenummern.
- Dünne, konsistente Linienicons; 20 px im Normalfall, 24 px bei Kategorien.
- Keine Emojis als Produktionsicons. Neutrale Rahmen lassen die farbigen Teile wirken.
- Schatten nur zur Ebenentrennung, nicht an jeder einzelnen Textzeile.
- Der reale Builder darf schlichter als die generierte Figur aussehen. Produktkorrektheit hat Vorrang vor künstlich hinzugefügtem Detailreichtum.

### 4.3 Farb- und Oberflächentokens

| Token | Wert | Zweck |
|---|---|---|
| `--bg-app` | `#F5F6F4` | Gesamte Arbeitsfläche. |
| `--surface` | `#FFFFFF` | Karten, Suchfeld, modale Flächen. |
| `--surface-soft` | `#EFF2EF` | Thumbnail-Hintergrund und ruhige Sekundärflächen. |
| `--text-primary` | `#11191D` | Überschriften und aktive Texte. |
| `--text-secondary` | `#56636A` | Erläuterungen und IDs. |
| `--border-subtle` | `#DDE3DE` | Unaufdringliche Trennlinien. |
| `--border-control` | `#7A8781` | Grenzen wichtiger Eingabeelemente und Zustände; Kontrast prüfen. |
| `--green` | `#087F63` | Auswahl, aktive Kategorie, bestätigte Aktion. |
| `--green-hover` | `#06684F` | Hoverzustand grüner Buttons. |
| `--green-soft` | `#E5F3EC` | Aktive Kategorie und leichte Auswahlflächen. |
| `--lime` | `#D5FF45` | Primärer Export-/Prüfbutton, Unterstreichung und Markendetail. |
| `--lime-soft` | `#F2F8D7` | Sehr dezenter Bühnenakzent. |
| `--warning` / `--warning-bg` | `#9A4B10` / `#FFF4DE` | Nicht geprüfte Zuordnung oder Kompatibilität. |
| `--danger` | `#B42318` | Fehler und blockierte Exporte. |
| `--focus` | `#087F63` | Gut sichtbarer Tastaturfokus. |

Berechnete Kontraste ausgewählter Vollfarben: Weiß auf Grün etwa **4,97:1**, Sekundärtext auf Weiß etwa **6,20:1**, dunkler Text auf Lime etwa **15,43:1**. Das sind eigene sRGB-Berechnungen; halbtransparente Flächen und reale Zustände werden separat getestet. Lime erhält immer dunklen, nicht weißen Text.

```css
:root {
  --bg-app: #f5f6f4;
  --surface: #fff;
  --surface-soft: #eff2ef;
  --text-primary: #11191d;
  --text-secondary: #56636a;
  --border-subtle: #dde3de;
  --border-control: #7a8781;
  --green: #087f63;
  --green-hover: #06684f;
  --green-soft: #e5f3ec;
  --lime: #d5ff45;
  --lime-soft: #f2f8d7;
  --warning: #9a4b10;
  --warning-bg: #fff4de;
  --danger: #b42318;
  --focus: #087f63;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-panel: 0 6px 24px rgb(17 25 29 / 5%);
  --shadow-float: 0 12px 36px rgb(17 25 29 / 12%);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
}
```

### 4.4 Typografie

| Verwendung | Spezifikation |
|---|---|
| Oberfläche | Manrope, alternativ System-Sans bis zur Einbindung. |
| Wortmarke / handschriftlicher Akzent | Kalam Bold als Prototypenbasis; später optional eigene Wortmarke. |
| Große Einführung | 38/44 px, Gewicht 750–800, leicht negative Laufweite; maximal zwei Zeilen. |
| Laufende Arbeit / kompakter Titel | 26/32 px, Gewicht 750. |
| Panelüberschrift | 18/24 px, Gewicht 700. |
| Suchfeld | 16/24 px, Gewicht 500. |
| Normaler UI-Text | 14/20 px, Gewicht 500. |
| Teilenamen auf Karten | 13/18 px, Gewicht 650–700. |
| IDs, Hinweise | 12/17 px; nicht kleiner skalieren, um mehr Karten zu erzwingen. |
| Handschriftlicher Hinweis | 18–22 px; kurz, nicht für Fehlermeldungen oder Bedienhinweise. |

Manrope und Kalam werden in ihren offiziellen Font-Repositories unter SIL OFL 1.1 angeboten. Bei tatsächlicher Einbindung die jeweiligen Lizenzhinweise mitführen. Schriften später von der eigenen Origin ausliefern, keine Laufzeitabhängigkeit von einem externen Font-CDN. Dieses Planungspaket enthält **keine Schriftdateien**. [S13](#s13)[S14](#s14)

### 4.5 Desktop-Layout

**Ab 1440 px:** vier Spalten; Kopfzeile 72 px; Seitenabstand 32 px; Abstand zwischen Spalten 20 px. Maximale Arbeitsbreite 1800 px, darüber zentrieren.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ FigForge      Builder   Meine Figuren   Hilfe         Teileliste prüfen →  │
├───────────┬────────────────────────┬──────────────────────┬────────────────┤
│ Kategorien│ Titel + Suche          │                      │ Deine Figur    │
│           │ Filter + Trefferzahl   │      3D-Vorschau     │                │
│ Kopf      │                        │                      │ Slot-Liste     │
│ Haare/Hut │ Katalogkarten          │   echter Teilemix    │ Warnungen      │
│ Körper    │                        │                      │                │
│ Beine     │                        │                      │ Lokal speichern│
│ Zubehör   │                        │ Kameraansichten      │ Liste prüfen   │
└───────────┴────────────────────────┴──────────────────────┴────────────────┘
```

```css
/* Erst ab dem Desktop-Breakpoint einsetzen. */
.workspace {
  display: grid;
  grid-template-columns:
    176px
    minmax(350px, 1.1fr)
    minmax(350px, 1fr)
    280px;
  gap: 20px;
  padding: 24px 32px;
  max-width: 1800px;
  margin-inline: auto;
}
```

Der Katalog darf vertikal scrollen; Figur und Auswahl bleiben sichtbar, soweit die Fensterhöhe reicht. Auf kurzen Displays auf normalen Seitenscroll wechseln. Keine Scrollfalle durch mehrere verschachtelte Panes. Alle Scrollregionen müssen per Tastatur erreichbar sein.

### 4.6 Responsive Verhalten

| Breite | Verhalten |
|---|---|
| `≥ 1440 px` | Vollständige Vier-Spalten-Arbeitsfläche. Katalog nach verfügbarer Breite in drei oder vier Spalten. |
| `1100–1439 px` | Kategorien als Iconleiste mit beschrifteten Tooltips; Katalog und Vorschau nebeneinander. Figurenliste in einem aufklappbaren rechten Drawer. |
| `768–1099 px` | Zwei Hauptbereiche: Katalog und Vorschau. Kategorien als horizontaler Chipbereich; Teileliste als Drawer. |
| `< 768 px` | Tabs „Teile“, „Figur“, „Liste“. Ein DOM-Bereich für den aktiven Inhalt; kein Desktop-Layout einfach verkleinern. |
| `320–389 px` | Zwei Karten pro Reihe nur bei ausreichend lesbarem Inhalt, sonst eine. Keine horizontale Gesamtscrollleiste. |

Mobil: Suche oben anheften, Touchziele mindestens 44 × 44 CSS-Pixel als Projektziel. Auswahl bestätigt sich mit kurzem Hinweis „Kopf eingesetzt“; eine kleine Figuren-Vorschau kann optional erscheinen. Die vollständige 3D-Szene ist im Tab „Figur“ erreichbar. Bei ausgeblendeter Szene Renderloop pausieren oder auf Bedarf reduzieren.

Der Tab „Liste“ übernimmt mobil den Export-CTA. Eine fixierte Aktionsleiste darf keine letzte Listenzeile verdecken und berücksichtigt `safe-area-inset-bottom`.

### 4.7 Komponenten und Verhalten

| Komponente | Spezifikation und Zustände |
|---|---|
| `AppHeader` | Wortmarke links; nur funktionierende Navigation. Kein Accountavatar und kein Dark-Mode-Schalter im MVP. |
| `CategoryRail` | Aktive Kategorie mit grünem Rand und leichter Grünfläche. Labels sichtbar oder zugänglich. Kategorien bilden Fähigkeiten des MVP ab, nicht alle Icons des Mockups. |
| `SearchBar` | 52 px hoch; sichtbares Label oder klare zugängliche Beschriftung; Suchicon als Button, Enter löst Suche aus. Ladezustand darf Eingabe nicht löschen. |
| `FilterBar` | Kategorie, belegte Farbe, Sortierung. Jahresfilter nur nach nachgewiesener Datengrundlage. Kein interaktiver „Originalteile“-Schalter, wenn Alternativen gar nicht angeboten werden. |
| `SearchStatus` | Echte Trefferzahl und Modus „Stichwortsuche“ / „Erweiterte Suche“. Vor Aktivierung echte fehlende Downloadmenge, währenddessen Fortschritt und Abbruch, danach Cachezustand anzeigen. Keine Aufforderung, beide Benchmarkmodelle zu laden. |
| `PartCard` | 12 px Radius, neutraler Bildbereich, zwei Zeilen Name, ID mit Angabe des Systems. Hauptaktion setzt ein; Detail-/Favoritenbuttons sind getrennte Geschwisterelemente, keine verschachtelten Buttons. |
| `PartCard:selected` | 2 px grüner Rahmen plus Häkchen und zugänglicher Zustand. Auswahl nicht nur durch Farbe signalisieren. |
| `PartDetails` | Varianten, Farben, Datenquelle, Renderstatus und Anschlussstatus; keine erfundenen Preisfelder. Auf Mobil als Bottom Sheet. |
| `FigureViewport` | Helle Bühne, dezenter Bodenschatten, ruhige Studio-Beleuchtung; Konturen und Aufdrucke bleiben erkennbar. |
| `ViewportToolbar` | Drehen/Zoom bzw. Reset und feste Ansichten. Alle relevanten Aktionen außerhalb des Canvas als echte Buttons. |
| `FigurePartsPanel` | Slotname, Thumbnail, Teilname, Variante, Farbe und Entfernen. „Deine Figur“ statt Einkaufskorb. |
| `ExportReview` | Einkaufspositionen, Prüfstatus, nicht exportierbare Positionen, XML kopieren und Datei speichern. |
| `LocalCollection` | Auf diesem Gerät gespeicherte Figuren; Umbenennen, Öffnen, Duplizieren, Löschen mit Rücknahme oder Bestätigung. |

**Buttonhierarchie:** Primär „Teileliste prüfen“ in Lime mit dunkler Schrift. Sekundär „Lokal speichern“ als ruhiger Umrissbutton. „Einsetzen“ in Detailansichten darf grün sein. Header-CTA und Panel-CTA öffnen dieselbe Aktion; auf schmalen Displays nur einen gleichzeitig prominent zeigen.

**Nicht aus der Referenz übernehmen:** paralleles „Add to Parts List“ und „Export to BrickLink“, obwohl alle eingesetzten Teile bereits die Figur bilden. Die Figur ist automatisch die Quelle der Teileliste.

### 4.8 Texte

| Stelle | Deutscher Standardtext |
|---|---|
| Einführung | „Baue den Charakter, den du dir vorstellst.“ |
| Unterzeile | „Finde echte Teile mit deinen eigenen Worten.“ |
| Suchbeispiel | „Zum Beispiel: Ogerkopf mit Hauern“ |
| Untere Markenanmerkung | „Gleiche Teile. Andere Geschichten.“ |
| Lokales Speichern | „Auf diesem Gerät gespeichert.“ |
| Kein Treffer | „Kein passender Treffer. Versuche einen allgemeineren Begriff oder ändere die Kategorie.“ |
| Semantik noch nicht geladen | „Erweiterte Suche laden · ca. {downloadMB} MB“. Die fehlenden Dateien aus dem Manifest summieren, nicht nur die ONNX-Datei. Zusatz: „Danach auf diesem Gerät nutzbar, solange der Cache erhalten bleibt.“ |
| Modell bereits gespeichert | „Erweiterte Suche bereit — Verarbeitung auf diesem Gerät.“ |
| Modelldownload | „Suchmodell wird geladen: {loadedMB} / {totalMB} MB“ mit Abbrechen. Der Builder und die Stichwortsuche bleiben bedienbar. |
| Semantik ausgefallen | „Die erweiterte Suche ist gerade nicht verfügbar. Stichwortsuche funktioniert weiterhin.“ |
| Fehlendes Mapping | „Für dieses Teil ist die BrickLink-Zuordnung noch nicht bestätigt.“ |
| Ungeprüfte Kombination | „Diese Kombination wurde noch nicht auf Passform geprüft.“ |
| Einkaufshinweis | „Preise, Versand und Verfügbarkeit prüfst du anschließend bei BrickLink.“ |

### 4.9 Bewegung, Zugriff und Fehler

Hover-/Fokuswechsel: etwa 120–160 ms. Teiltausch: maximal eine kurze Hervorhebung; kein sichtbares Springen der Kamera. Modale Flächen: 180–220 ms. `prefers-reduced-motion` respektieren. Keine automatische Kamerarotation.

Ziel ist WCAG 2.2 AA für die bedienbare Oberfläche. Jeder wesentliche Figurenwechsel muss auch ohne Canvas-Interaktion möglich sein. Fokusführung, Screenreader-Status, Textkontrast und Dialogbedienung werden explizit geprüft. Die gesetzliche Einordnung der konkreten App ist von diesem Qualitätsziel zu unterscheiden. [S12](#s12)

Fehlerzustände sind Bestandteil des Designs: fehlendes Modell, langsamer Download, ungültiger Share-Link, voller lokaler Speicher, fehlende Exportzuordnung und verlorener WebGL-Kontext. Keine leere weiße Fläche als Fehleranzeige.

---

## 5. Architektur und Wiederverwendung

### 5.1 Komponentenentscheidung

Wir verwenden **Three.js mit LDrawLoader** als technische Grundlage. LDrawLoader ist ein Addon für LDraw-Dateien, kein fertiger Konfigurator. Seine Dokumentation beschreibt auch das Bündeln von Modellabhängigkeiten, um viele einzelne Dateianfragen zu vermeiden. Three.js ist MIT-lizenziert. [S01](#s01)[S02](#s02)

| Baustein | Entscheidung |
|---|---|
| React + TypeScript + Vite | UI und statischer Build; konkrete kompatible Versionen in der ersten Implementierung prüfen und im Lockfile festhalten. |
| Three.js + LDrawLoader | Erste Referenzimplementierung für Laden, Szene und Kamera. |
| Eigener `FigureSceneController` | Dünne Verbindung zwischen serialisierbarem Figurenstate und Three.js; keine Einkaufslogik im Renderer. |
| `buildinginstructions.js` | Optionale Referenz für LDraw-Darstellung und Vorschauen; Projektcode unter Unlicense, eingebundene Daten/Abhängigkeiten separat behandeln. [S04](#s04) |
| `brick-flow-agent` | Kein notwendiger Bestandteil. Nur nach gezieltem Code-, Lizenz- und Abhängigkeitsreview einzelne geeignete Ansätze übernehmen. |
| Studio / Mecabricks | Nicht einbetten und nicht voraussetzen. Sie sind kein Ersatz für eine freigegebene Komponentenlizenz. |
| Transformers.js | Embedding-Inferenz in einem Worker, mit WASM-Fallback und explizitem Modelldownload. [S05](#s05) |
| IndexedDB | Entwürfe und Favoriten. Kleines, getestetes Repository-Modul statt Cloud-Datenbank. |
| GitHub + GitHub Actions | Zentrales Repository, Pull-Request-Reviews, CI und geplanter Katalog-Refresh; keine Produktionsdeployments aus Actions. |
| Cloudflare Workers Static Assets + Workers Builds | Cloudflare baut aus dem verbundenen GitHub-Repository und deployt das statische Vite-Ergebnis; kein eigener Worker-API-Handler im MVP. [S09](#s09)[S24](#s24) |
| CSS Custom Properties + CSS Modules | Designsystem ohne verpflichtendes fertiges SaaS-UI-Kit. |
| Tests | Unit-Tests, React-Komponententests, Browser-E2E und visuelle Vergleiche; konkrete Pakete zum Projektstart lizenz-/versionsprüfen. |

**Kein großer Fork zu Beginn.** Ein vollständiger Editor bringt meist Funktionen und Abhängigkeiten mit, die wir nicht benötigen. Erst ein kleiner, eigener Adapter macht spätere Rendererwechsel möglich.

### 5.2 Laufzeit

```text
Cloudflare Workers Static Assets
    │
    ├── App-Bundle und Styles
    ├── versionierter Katalog + Suchindex
    ├── Vorschaubilder + Modellpakete
    └── bei Aktivierung: ein freigegebenes Suchmodell + passender Index
            │
            ▼
Browser
    ├── React-Oberfläche
    ├── FigureStore ──→ Kompatibilitätsprüfung
    │       ├── Three.js-SceneController
    │       ├── Einkaufslisten-Compiler
    │       └── IndexedDB / JSON / Share-Link
    ├── Such-Worker: Query-Normalisierung + Query-Embedding + statischer Index
    └── lokaler Asset-Cache
```

### 5.3 Datenaktualisierung und Build-Zeit

```text
Geplante GitHub Action
    ↓
Nur Rebrickable Catalog Downloads/CSV laden
    ↓
Schema, Hash, Provenienz und Ausschluss von MOC-Dateien prüfen
    ↓
Review-Pull-Request erstellen/aktualisieren
    ↓ menschliches Review + Merge in den geschützten Produktionsbranch
Cloudflare Workers Builds
    ↓
Freigegebene Quellen + feste Versionen
    ↓
Import → Normalisierung → Rechte-/Qualitätsprüfung
    ↓
Manuelle Mapping- und Ankerkorrekturen
    ↓
Katalog → Asset-Pakete → Thumbnails → Suchdokumente → Teile-Embeddings pro Testprofil
    ↓
Integritätsprüfung + Exportfixtures + Lizenzmanifest
    ↓
Statisches Release-Verzeichnis
    ↓
Deployment als Cloudflare Workers Static Assets
```

**Option 2 ist Bestandteil jedes Suchprofils:** Die vollständigen Teile-Embeddings werden hier vorab erzeugt und als versionierte Dateien exportiert. Der Browser baut keinen Teileindex neu auf. Für den Modellvergleich entstehen separate MiniLM- und E5-Indizes; das reguläre Release enthält nur das gewählte Profil. Details in Kapitel 8.

Generierte Daten werden nie von Hand editiert. Änderungen gehören in die Quellenadapter oder nachvollziehbare Override-Dateien. Ein erneuter Build mit denselben Eingaben soll dieselben Daten-Hashes ergeben.

Der geplante GitHub-Workflow besitzt nur die minimal erforderlichen Repository-Rechte. Er darf einen Pull-Request erzeugen beziehungsweise aktualisieren, aber weder Branchschutz umgehen noch selbst nach Produktion deployen. Netzwerkfehler, Schemaänderungen, unerwartete Dateimengen, fehlende Prüfsummen oder erkannte MOC-Inhalte brechen die Aktualisierung ab und erhalten einen sichtbaren Fehlerbericht.

---
## 6. Datenmodell und Datenpipeline

### 6.1 Grundprinzip: Anzeige, Geometrie und Kaufartikel trennen

Ein Verkaufsartikel kann aus mehreren sichtbaren Geometrien bestehen. Umgekehrt kann dieselbe Geometrie mehrere kaufbare Farbvarianten darstellen. Deshalb darf die Teileliste **nicht** aus allen Meshes der Three.js-Szene erzeugt werden.

Wir unterscheiden:

| Objekt | Bedeutung |
|---|---|
| `CatalogPart` | Beschreibt eine Teilfamilie oder einen konkreten dekorierten Artikel. |
| `PartVariant` | Exakte auswählbare Variante einschließlich belegter Farbe und Erscheinung. |
| `RenderAsset` | 3D-Datei und Vorschau, unabhängig von der Einkaufs-ID. |
| `AttachmentProfile` | Geprüfte Anschlusspunkte und Transformationsdaten. |
| `ProcurementRecipe` | Eine oder mehrere tatsächliche Einkaufspositionen für diese Auswahl. |
| `FigureDocument` | Auswahl, Pose/Kamera und Dokumentversion; keine eingebetteten 3D-Dateien. |
| `Evidence` | Herkunft und Prüfstatus einer Behauptung, Lizenz oder Zuordnung. |

### 6.2 Vertragsskizze

Der folgende TypeScript-Ausschnitt beschreibt die beabsichtigten Schnittstellen. Er ist **noch kein fertiges Paket**. Validierung, Fehlertypen und Migrationen müssen implementiert werden.

```ts
type Slot =
  | 'head'
  | 'headwear'
  | 'torsoAssembly'
  | 'legsAssembly'
  | 'neckAccessory'
  | 'leftHandAccessory'
  | 'rightHandAccessory';

type CheckStatus = 'verified' | 'unverified' | 'rejected';
type Matrix4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

interface Evidence {
  id: string;
  source: 'ldraw' | 'rebrickable' | 'manual' | 'other';
  sourceUrl: string;
  sourceRevision: string;
  retrievedAt: string;
  checkedAt?: string;
  status: CheckStatus;
  licenseId?: string;
  note?: string;
}

interface RenderAsset {
  id: string;
  format: 'packed-mpd' | 'glb';
  url: string;             // nur eigene erlaubte Asset-Pfade
  sha256: string;
  thumbnailUrl: string;
  appearance: 'exact' | 'approximate' | 'missing';
  licenseEvidenceIds: string[];
}

interface PurchaseLine {
  itemType: 'P';
  bricklinkItemId: string; // nie aus einer fremden ID raten
  bricklinkColorId: number;
  quantity: number;
  evidenceIds: string[];
}

interface ProcurementRecipe {
  strategy: 'single-item' | 'assembly' | 'components';
  status: CheckStatus;
  lines: PurchaseLine[];
}

interface PartVariant {
  id: string;             // eigene stabile, nicht sprechend erratene ID
  partId: string;
  displayName: { de: string; en: string };
  categoryId: string;
  sourceIds: {
    ldraw: string[];
    rebrickable: string[];
    bricklink: string[];
  };
  color: {
    internalId: string;
    nameDe: string;
    nameEn: string;
    displayHex: string;
    ldrawCode?: number;
    rebrickableId?: number;
    bricklinkId?: number;
    evidenceIds: string[];
  };
  assetId: string;
  attachmentProfileId: string;
  allowedSlots: Slot[];
  procurement: ProcurementRecipe;
  searchableTags: string[];
  catalogEvidenceIds: string[];
  releaseStatus: 'draft' | 'review' | 'published' | 'blocked';
}

interface AttachmentProfile {
  id: string;
  family: string;
  rootTransform: Matrix4;
  anchors: Record<string, Matrix4>;
  allowedParentFamilies: string[];
  exclusionTags: string[];
  reviewStatus: CheckStatus;
  evidenceIds: string[];
}

interface FigureDocument {
  schemaVersion: 1;
  catalogVersion: string;
  id: string;
  name: string;
  updatedAt: string;
  selections: Partial<Record<Slot, { variantId: string }>>;
  cameraPreset: 'three-quarter' | 'front' | 'back';
}
```

**Wichtige Invarianten:** Alle IDs sind systemgebunden. Kein gemeinsamer Nummernraum für LDraw, BrickLink, LEGO-Elementnummern und Rebrickable. Farbe ist ebenfalls systemgebunden. `displayHex` beschreibt nur die Bildschirmanzeige, nicht eine lizenzierte oder garantierte reale Farbmessung.

### 6.3 Quellenbeschaffung

**LDraw:** Nur bewusst ausgewählte Teile und deren transitive Unterdateien aus einem festgehaltenen Release übernehmen. Lizenzheader, Pfade, Abhängigkeiten und Hashes speichern. Unterteile dürfen nicht unabsichtlich als kaufbare Artikel erscheinen. [S15](#s15)

**Rebrickable Downloads/CSV:** Für Version 1 als kommerziell nutzbare Metadatenquelle eingeplant, entsprechend der Bestätigung des Projektverantwortlichen. Den einschlägigen Nachweis für die **Download-Daten** im Quellenregister ablegen und Attribution umsetzen. Das tatsächliche CSV-Schema bleibt technisch zu prüfen. **Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.** MOC-Dateien, MOC-Anleitungen und sonstige nutzergenerierte MOC-Inhalte sind keine freigegebene Katalogquelle. Die Freigabe nicht auf fremde Fotos, sonstige Websiteinhalte oder die Rebrickable API ausdehnen. [S03](#s03)

**Rebrickable API:** Wird in Version 1 **nicht verwendet**. Es gibt keinen Runtime-Call an Rebrickable, keinen API-Key im Frontend und keine Abhängigkeit der Suche oder des Builders von der API. Ein späterer API-Einsatz – etwa für Account-/Collection-Synchronisierung – erfordert eine separate Architekturentscheidung und vor kommerzieller Nutzung eine erneute Prüfung der dann geltenden API-Bedingungen beziehungsweise eine ausdrückliche Freigabe. [S03](#s03)

**Nummernzuordnung:** Explizite Quellenzuordnungen bevorzugen. Jeder nicht eindeutige Fall landet in `mapping-review.json`, nicht automatisch im öffentlichen Export. Manuelle Recherche dient einzelnen überprüften Zuordnungen und ersetzt keine Lizenz für einen kopierten Gesamtkatalog.

### 6.4 Build-Schritte

1. **Import:** Quellen nur aus einer freigegebenen Liste; Downloadrevision, Datum und Hash erfassen. Der geplante GitHub-Actions-Refresh akzeptiert bei Rebrickable ausschließlich Catalog Downloads/CSV und verwirft MOC-Dateien, MOC-Anleitungen sowie sonstige nutzergenerierte MOC-Inhalte vor jeder weiteren Verarbeitung.
2. **Dateiklassifikation:** Hauptteile, Unterteile, Primitive und Baugruppen unterscheiden.
3. **Kategorien:** Erste regelbasierte Vorschläge aus Namen und Keywords; Grenzfälle manuell prüfen.
4. **Variantenbildung:** Druck und belegte Farben als eigenständige auswählbare Varianten behandeln.
5. **Mapping:** Renderobjekt mit der richtigen Einkaufsbaugruppe verbinden; mehrere mögliche IDs als Prüffall führen.
6. **Ankerdaten:** Transformationsprofile aus der geprüften Registry zuordnen.
7. **Asset-Erstellung:** Für den ersten Release gepackte LDraw-Abhängigkeiten nutzen. GLB-Konvertierung erst nach Vergleichstest; nicht gleichzeitig zwei vollständige Pipelines entwickeln.
8. **Thumbnails:** Aus denselben freigegebenen Daten rendern wie die Figur. Konsistente Beleuchtung, Blickrichtung und Skalierung pro Kategorie.
9. **Suchdokumente:** Namen, sichtbare Merkmale, Kategorien, Synonyme und eindeutige IDs vorbereiten.
10. **Embedding-Indizes — verbindlich:** Teilevektoren vollständig beim Build erzeugen. Für `compact-minilm` und `quality-e5` getrennte Indizes mit festgehaltenem ONNX-Artefakt, Tokenizer, Textschema, Präfixen, Pooling, Normalisierung und Revisionshash bauen. Nur das freigegebene Profil ausliefern; nie im Browser alle Teile neu einbetten.
11. **Qualitätsprüfung:** Fehlende Dateien, unbekannte IDs, nicht belegte Farben, fehlende Lizenzangaben und falsche Baugruppen blockieren.
12. **Release:** Manifest, Katalog, Modelle, Bilder, Index und Lizenzseite atomar versionieren.

### 6.5 Veröffentlichungsregel

Eine Variante wird für den vollständigen MVP erst veröffentlicht, wenn sie eine belastbare Quellen-/Rechtezuordnung, belegte Farbvariante, passende Geometrie, geprüftes Anschlussprofil und eine bestätigte Einkaufszuordnung hat.

Ein interner Entwicklungsmodus darf unvollständige Datensätze zeigen, aber mit sichtbarer Markierung. Solche Datensätze dürfen nicht unbemerkt in den öffentlichen Katalog gelangen.

---

## 7. 3D-Builder und Kompatibilität

### 7.1 Was wir tatsächlich entwickeln

Unser eigener Anteil ist die **Figurenlogik**: welche Auswahl in welchen Slot gehört, wie sie platziert wird, welche Konflikte auftreten und welche Einkaufspositionen daraus entstehen. Rendering, Kamera und Dateiladen werden auf vorhandenen Komponenten aufgebaut.

Die erste Szene enthält eine einfache, echte Standardfigur. Keine aufwendige Felsenbasis und keine dekorativen Gegenstände, die versehentlich mitgekauft werden könnten. Ein neutraler Präsentationsteller ist nur Bühnenelement und wird entsprechend behandelt.

### 7.2 Anschlussmodell

```text
figureRoot
  ├── legsAssembly
  ├── torsoAssembly
  │     ├── neckAccessory, falls für diese Kombination unterstützt
  │     ├── head
  │     │     └── headwear
  │     ├── leftHandAnchor  → leftHandAccessory
  │     └── rightHandAnchor → rightHandAccessory
  └── presentationStage, niemals Einkaufsposition
```

Dies ist ein logisches Schema, keine pauschale Aussage über die Koordinaten aller Dateien. Jedes unterstützte Teilprofil bringt eigene Orientierung und Offsets mit. LDraw-Koordinaten werden einmal konsistent in die Szene transformiert und anhand von Referenzobjekten geprüft.

**Keine geratenen Fixwerte aus dem bisherigen Gespräch übernehmen.** Kopfposition, Handgriff, Drehrichtung und Torsohöhe werden aus den tatsächlichen Testassets bestimmt.

### 7.3 Regeln für die erste Version

| Fall | Verhalten |
|---|---|
| Normaler Kopf auf geprüfter Standardbaugruppe | Direkter Austausch. |
| Haare und Helm belegen denselben Slot | Gegenseitiger Austausch; Kombination erst später bei explizitem Modell. |
| Schwert in einer Hand | Teilbezogener Griffanker und geprüfte Ausrichtung, nicht nur allgemeiner Mittelpunkt. |
| Große Rüstung oder Nackenaufsatz | Nur geprüfte Profile; mögliche Auswirkungen auf Kopfhöhe und Kopfbedeckung berücksichtigen. |
| Bigfig-Kopf / Minidoll / Spezialkörper | Nicht im Standard-Builder anbieten. Erklärung statt geometrisch falscher Platzierung. |
| Ungeprüfte Kombination | Im öffentlichen MVP nicht als „passend“ freigeben; blockieren oder deutlich als nicht unterstützten Fall erklären. |
| Umhang / flexibles Teil | Zunächst weglassen, sofern kein getestetes statisches Modell und Profil vorhanden sind. |

Es gibt zunächst keine vollständige physikalische Kollisions- oder Steckbarkeitsgarantie. Eine kleine Kompatibilitätsmatrix mit geprüften Kombinationen ist verlässlicher als eine scheinbar universelle, ungetestete Simulation.

### 7.4 Baugruppen und Pose

Oberkörper und Beine werden zunächst als geprüfte **Verkaufsbaugruppen** behandelt. Frei editierbare Arme und Hände sind kein Pflichtumfang. Eine eingekaufte Torso-Baugruppe darf nicht zusätzlich alle bereits enthaltenen Arme und Hände in die Einkaufsliste schreiben.

Die erste Version bietet **Kameraansichten**, keine irreführend benannten „Posen“, solange die tatsächlichen Gelenke nicht unabhängig und korrekt bewegbar sind. Gelenksteuerung kommt erst mit getrennten Geometrieknoten und testsicheren Pivots.

### 7.5 Technische Qualitätsanforderungen

Ein Teiltausch ist transaktional: Modell laden und validieren, dann einsetzen. Bei Fehler bleibt die bisherige Figur erhalten. Schnelle aufeinanderfolgende Klicks dürfen durch eine ältere Netzantwort nicht rückgängig gemacht werden.

Materialien mit Aufdrucken werden nicht pauschal umgefärbt. Die freie Farbauswahl beschränkt sich auf nachgewiesene Varianten. Texturbasierte Drucke und LDraw-Sonderfunktionen werden mit den gewählten Loadern ausdrücklich getestet; fehlende Muster dürfen nicht unbemerkt als exakte Darstellung erscheinen.

Geometrien, Texturen und Materialien brauchen eine dokumentierte Cache-/Dispose-Strategie. Ein gemeinsam genutztes Asset darf beim Entfernen eines Slots nicht die übrige Szene beschädigen. Bei Kontextverlust erhält der Nutzer eine Wiederherstellungsaktion.

---

## 8. Semantische Suche

### 8.1 Verbindliche Entscheidung: Teilevektoren vorab berechnen

**Option 2 wird unabhängig von der Modellwahl umgesetzt.** Der Build erzeugt sämtliche Katalog-Embeddings. Im Browser wird nur die aktuelle, gegebenenfalls normalisierte Suchanfrage eingebettet und mit dem fertigen Index verglichen. Neue oder geänderte Teile erfordern einen aktualisierten Datenbuild, keine serverseitige Suche.

```text
LOKALER BUILD / SPÄTER CI                 BROWSER DES NUTZERS

Geprüfte Teile + Beschreibungen          „grüner Ogerkopf mit Hauern“
             │                                       │
Textschema des jeweiligen Profils        Normalisierung des gewählten Profils
             │                                       │
Gepinntes Embedding-Modell               Dasselbe Modell / dieselbe Revision
             │                                       │
Vorberechnete Teilevektoren              Ein Query-Vektor
             └──────────→ Vergleich im Worker ←───────┘
                                    │
                          Reale Katalogtreffer
```

Die Modelle werden **in der Entwicklung** gegeneinander getestet. Im regulären Release lädt der Nutzer nur das ausgewählte Modell, dessen notwendigen Tokenizer-/Laufzeitdateien und dessen Index. Es gibt keinen automatischen Download beider Kandidaten und keinen kostenpflichtigen Inferenzdienst. Sol und Luna sind Entwicklungswerkzeuge, nicht Laufzeitabhängigkeiten dieser Suche.

### 8.2 Suchstrategie und Datenwahrheit

Die Suche kombiniert drei Schichten:

1. **Deterministisch:** Exakte, systemgebundene IDs und eindeutige Namen werden bevorzugt.
2. **Lexikalisch:** Deutsche/englische Stichwörter, kontrollierte Tippfehlertoleranz und geprüfte Synonyme.
3. **Semantisch:** Ähnlichkeit zwischen Anfrage- und Teilevektoren; anschließend deterministische Zusammenführung mit den ersten beiden Schichten.

Kategorie, unterstützter Slot, belegte Farbe und explizite Ausschlüsse werden strukturiert behandelt, soweit der Parser sie zuverlässig erkennt. Unsichere Interpretationen dürfen nicht unbemerkt harte Filter werden. Eine Suche nach einem Kopf darf bei aktivem Kopffilter keinen Helm liefern. Gültige IDs werden nicht durch eine Rechtschreibkorrektur verändert.

Ein Suchdokument enthält Originalname, Kategorie, überprüfte sichtbare Merkmale und eigene, als solche gekennzeichnete Suchannotation. Das kompakte Profil erhält konsistente englische Dokumente; deutsche Begriffe bleiben zusätzlich im lexikalischen Index. Beide Modelle erhalten für den Vergleich dieselben belegten Teilinformationen, mit modellgerechtem Textformat.

„Oger“, „Ork“ und „Troll“ sind keine austauschbaren offiziellen Bezeichnungen. Solche Verwandtschaften können vorsichtig das Entdecken unterstützen, dürfen aber weder Katalogdaten ändern noch exakte Treffer vortäuschen. Das System erzeugt keine neuen Artikel. Semantische Ähnlichkeit beweist weder Passform noch reale Verfügbarkeit.

### 8.3 Zwei konkrete Testprofile für Option 1

| Profil | Modell und Rolle | Größenordnung der abgerufenen Dateien | Verwendung |
|---|---|---|---|
| **`compact-minilm`** | `sentence-transformers/all-MiniLM-L6-v2`, browserfähiger Export `Xenova/all-MiniLM-L6-v2`, INT8. Bevorzugter Kandidat wegen geringerer Downloadmenge. | Rund **23 MB** für die quantisierte ONNX-Datei; `tokenizer.json` rund **0,71 MB**. Laufzeit, Konfiguration, Index und App kommen hinzu. [S20](#s20)[S21](#s21) | Englisches Modell plus eigener, getesteter Deutsch→Englisch-Begriffs-Layer. Apache-2.0-Kennzeichnung; keine verlässlich allgemeine Mehrsprachigkeit unterstellen. [S21](#s21) |
| **`quality-e5`** | `intfloat/multilingual-e5-small`, browserfähiger Export `Xenova/multilingual-e5-small`, INT8. Mehrsprachige Qualitätsbaseline. | Rund **118 MB** für ONNX plus **17,1 MB** für `tokenizer.json`, also etwa **135 MB allein für diese beiden Dateien**. Zusätzliche Dateien separat messen. [S23](#s23) | Deutsche/englische Anfragen direkt; modellgerechte Query-/Passage-Präfixe. Das Ursprungsmodell ist MIT-gekennzeichnet. [S22](#s22) |

Größen sind gerundete Repository-Angaben, **MB dezimal**, keine gemessenen Gesamttransfers der App. Nur benötigte Dateien laden, niemals das gesamte Repository mit sämtlichen Quantisierungen. Die konkrete ONNX-Datei und ihre SHA-256 werden gepinnt; Labels wie „q4“ garantieren keinen kleineren Download. Die Lizenznachweise für Ursprungsmodell, tatsächlich ausgelieferten Export und Laufzeit gehören ins Register.

Das zuvor diskutierte `paraphrase-multilingual-MiniLM-L12-v2` ist **kein Standardkandidat mehr**. Es kann später als zusätzliche Untersuchung dienen, blockiert aber nicht den MVP. Ebenso ist ein weiteres statisches Embeddingmodell kein verpflichtender dritter Pfad.

**Noch offen:** Welches Profil unsere Teile tatsächlich besser findet. Downloadgröße, Modellname und allgemeine Benchmarks ersetzen den eigenen Relevanztest nicht.

### 8.4 Deutsch→Englisch-Begriffs-Layer für das kompakte Profil

Der Normalizer ist ein kleines, versioniertes Domänenmodul, **kein vollständiger Übersetzer und kein zusätzlicher LLM-Aufruf**. Er arbeitet mit einer überprüften Begriffsliste, Regeln für bekannte Zusammensetzungen und Beispielen. Englische Anfragen bleiben nutzbar; der unveränderte Originaltext bleibt für die lexikalische Suche erhalten.

| Deutscher Ausdruck | Primäre Normalisierung | Behandlung |
|---|---|---|
| `Ogerkopf` | `ogre head` | Bekannte Zusammensetzung zerlegen; nicht pauschal zu „Ork“ umbenennen. |
| `Hauer`, `Hauern` | `tusks` | Flexionsformen zusammenführen; `fangs` nur als schwächerer verwandter Suchbegriff. |
| `Schwert`, `langes Schwert` | `sword`, `long sword` | Gegenstand und Eigenschaft getrennt erhalten. |
| `Rüstung` | `armor` | `armour` als lexikalisches Alias. |
| `zerzauste schwarze Haare` | `messy black hair` | Merkmal und Farbe erhalten. |
| `ohne Helm` | `without helmet` | Negation nicht als Füllwort löschen; bei sicherer Erkennung zusätzlich als Ausschluss verwenden. |
| `Schild` | kontextabhängig | Nicht blind immer `shield`: Wappenschild und Straßenschild unterscheiden. |

**Beispiel:** `großer grüner Ogerkopf mit Hauern` → `large green ogre head with tusks`. Das ist ein Verarbeitungsschema, keine Garantie auf einen existierenden passenden Artikel.

Umsetzungsregeln: bekannte zusammengesetzte Wörter und Mehrwortbegriffe vor Einzelwortersetzungen behandeln; Negationen erhalten; IDs schützen; unbekannte Wörter nicht still löschen. Verwandte Begriffe getrennt gewichten statt den Embeddingtext mit beliebigen Synonymen zu überladen. Nicht erkannte Eigenschaften dürfen nicht in erfundene Katalogattribute übersetzt werden.

Bei unklaren deutschen Ausdrücken bleibt die Basissuche aktiv. Die UI darf eine verständliche Umformulierung empfehlen, aber nicht automatisch E5 nachladen oder eine externe Übersetzungs-API aufrufen. Das Produkt verspricht in dieser Variante zunächst **getestete deutsche und englische Domänensuche**, keine beliebigen Sprachen.

Luna kann Lexikon, Übersetzungen und Grenzfallfixtures vorbereiten; Sol prüft Normalisierungsvertrag und Rankingintegration. Menschliche Stichproben sichern, dass die Wörter tatsächlich zu sichtbaren Teilemerkmalen passen.

### 8.5 Getrennte Indizes und reproduzierbare Modellverträge

Für den Benchmark werden **zwei eigene Teileindizes** erzeugt. Obwohl beide Modelle 384-dimensionale Vektoren liefern, liegen sie nicht im selben semantischen Koordinatensystem. Ein MiniLM-Query darf niemals gegen E5-Teilevektoren gesucht werden. [S21](#s21)[S22](#s22)

Die Pipeline verwendet pro Profil ein festgehaltenes Modell-/Tokenizerpaket und eine definierte Verarbeitung. Bevorzugt werden die Teile offline mit derselben ONNX-Export-/Quantisierungsfassung berechnet, die später im Browser läuft. Andere Laufzeiten oder Rechenpräzisionen erfordern einen dokumentierten Paritätstest, nicht bloß identische Vektorlängen.

Für E5 erhalten Suchanfragen das Präfix `query: ` und Teilebeschreibungen `passage: `, auch bei deutschen Texten. Für MiniLM werden diese E5-spezifischen Präfixe nicht übernommen. Pooling mit Attention-Maske sowie L2-Normalisierung werden entsprechend den Modellvorgaben implementiert und in Build und Browser geprüft. [S21](#s21)[S22](#s22)

Ein `search-profile.json` hält mindestens fest:

```text
profileId, schemaVersion, catalogVersion
upstreamModelId, exportRepository, modelRevision, onnxSha256
runtimeVersion, tokenizerRevision, tokenizerSha256, quantization
embeddingDimension, pooling, normalize, maxTokens
queryPrefix, documentPrefix, queryNormalizerVersion, documentSchemaVersion
indexDtype, indexSha256, orderedVariantIdsSha256
requiredFiles[]: path, byteLength, sha256
```

Der Query-Normalizer und die erzeugenden Textschemata werden mit dem Profil versioniert. Änderungen an Modell, Tokenizer, Dokumenttexten oder Vektorverarbeitung lösen einen passenden Indexneubau aus; reine Query-Regeländerungen benötigen mindestens neue Regressionstests und eine neue Profilversion. Nach Katalogänderungen werden neue/geänderte Dokumentvektoren beim Build aktualisiert, unveränderte Vektoren nur bei identischem Vertrag wiederverwendet.

**Speicherformat:** Zunächst Float32 für einfache Referenztests. Float16 ist eine gesonderte Größenoptimierung, die erst nach Ranking-Paritätstest freigegeben wird; beim Vergleich kann der Worker wieder in Float32 rechnen. Keine kostenpflichtige Vektordatenbank erforderlich. Für den kuratierten Katalog beginnt die Umsetzung mit direktem normalisiertem Vektorvergleich im Worker.

| Beispielumfang | Float32, 384 Dimensionen | Float16, 384 Dimensionen |
|---|---:|---:|
| 500 Varianten | 768.000 Byte ≈ 0,77 MB | 384.000 Byte ≈ 0,38 MB |
| 10.000 Varianten | 15.360.000 Byte ≈ 15,36 MB | 7.680.000 Byte ≈ 7,68 MB |

Die Tabelle ist eine Rechnung `Anzahl × 384 × Bytes pro Wert`, ohne Metadaten. 10.000 Varianten sind ein Skalierungsbeispiel, keine bereits vorhandene Kataloggröße. Der kleine Index ersetzt nicht den Download des Modells zur Anfrageverarbeitung.

### 8.6 Browser-Ausführung, Download und Hosting

Die Inferenz und Vektorsuche laufen außerhalb des UI-Threads in einem Worker. WASM ist der zu testende Basispfad; WebGPU nur nach Fähigkeitserkennung und Vergleich auf den Zielbrowsern. Dokumentierte lokale Modellpfade und Cachemechanismen werden verwendet. [S05](#s05)[S08](#s08)

**Nutzerablauf:** Stichwortsuche und Builder sofort → erweiterte Suche mit tatsächlicher fehlender Downloadgröße aktivieren → Fortschritt/Abbruch → Dateien prüfen und cachen → nur Suchanfragen lokal einbetten. Während des Downloads darf der Builder nicht blockieren. Bei Abbruch, fehlender Unterstützung oder verlorenem Cache bleibt die Basissuche verfügbar. Caching ist keine Garantie, dass ein Browser die Dateien dauerhaft behält.

Das Produktionsprofil legt Modell und Index gemeinsam fest. Es erfolgt **kein** stiller Modellwechsel bei schwierigen Suchanfragen. Ein Entwicklungsvergleich darf beide Profile verwenden; dafür keine öffentliche Doppel-Downloadoberfläche bauen.

**Kompakter Kandidat:** Die rund 23 MB große INT8-Datei liegt unter dem aktuellen Cloudflare-Workers-Static-Assets-Limit von 25 MiB je Datei. Das vermeidet grundsätzlich eine Segmentierung dieses Modells. Als gezielte Ausnahme vom sonstigen 20-MiB-Assetbudget ist für diese einzelne ONNX-Datei ein internes Limit von **24 MiB** vorgesehen. Tatsächliche Bytes und nötige Begleitdateien im Build prüfen. [S09](#s09)[S20](#s20)

**E5 nur bei Bedarf für den Release:** Seine große Datei überschreitet das Limit. Dann zunächst statische Segmente von höchstens 20 MiB untersuchen, mit Manifest, Reihenfolge, Bytezahl und SHA-256. Zusammensetzen und Loader-/Cache-Adapter im Worker sind eigene Testaufgaben; Segmentierung senkt weder Gesamttransfer noch Inferenzspeicher. Ein separater Assethost bedarf einer Kostenfreigabe. Keine Segmentierungsinfrastruktur allein für einen nicht ausgelieferten Benchmarkkandidaten bauen. [S08](#s08)[S09](#s09)[S23](#s23)

**Downloadbudget als Hypothese:** Für das kompakte Profil werden etwa **25–35 MB zusätzliche Suchdateien** angestrebt. Das ist kein bestätigtes Gesamtbudget: ONNX, Tokenizer, tatsächlich benötigte WASM-/Laufzeitdateien, Lexikon und gewählter Index müssen im kalten Browserprofil zusammen gemessen werden. 3D-Assets und UI separat ausweisen. Wird das Ziel überschritten, tatsächliche Werte melden statt die zusätzlichen Dateien aus der Rechnung wegzulassen.

### 8.7 Benchmark und Entscheidungskriterien

**Testset: 160 manuell bewertete Anfragen.** 80 dienen Entwicklung/Abstimmung, 80 bleiben bis zur Entscheidung zurückgehalten. Beide Hälften enthalten jeweils 30 deutsche, 20 englische, 10 Tippfehler-/Zusammensetzungsfälle, 10 Mehrdeutigkeits-/Negationsfälle und 10 im Katalog nicht erfüllbare Anfragen. Thematisch ausgewogen über Köpfe, Haare, Kleidung, Waffen und Zubehör, Alltag, Fantasy und Weltraum. Fast gleiche Paraphrasen bleiben in derselben Hälfte, damit das Testset nicht versehentlich ins Training der Regeln eingeht.

Luna bereitet Fälle und Lexikoneinträge vor; der Mensch beurteilt reale Kandidaten. Sol implementiert die Auswertung und friert Testdaten sowie Grenzwerte vor dem Entscheidungsdurchlauf ein. Die spätere Alpha liefert zusätzliche, noch unbekannte Anfragen.

| Vergleich | Zweck |
|---|---|
| Nur IDs + lexikalische Suche | Prüfen, ob ein semantisches Modell überhaupt zusätzlichen Nutzen bringt. |
| `compact-minilm` + Normalizer + gemeinsames Ranking | Bevorzugte schlanke Produktvariante. |
| `quality-e5` + gemeinsames Ranking | Qualitätsbaseline, nicht automatisch die Wahrheit oder der Gewinner. |

Für alle Varianten gelten derselbe Katalog, dieselben Filter und dieselbe Relevanzdefinition. Exakte IDs werden separat geprüft und nicht zum künstlichen Anheben der semantischen Trefferquote verwendet. Relevanz wird gegen menschliche Urteile gemessen, **nicht** als bloße Übereinstimmung mit E5-Ergebnissen.

**Messwerte:** nDCG@10 mit vorab festgelegten Relevanzstufen 0/1/2, Success@5 (mindestens ein akzeptabler Treffer in den ersten fünf), getrennte deutsche/englische Ergebnisse, Fehler bei Negation und Mehrdeutigkeit, kalter Downloadumfang, Startzeit, warme p50/p95-Latenz und gemessener Speicherbedarf soweit messbar. Nicht erfüllbare Anfragen separat auswerten; keine ungeprüften universellen Cosinus-Grenzwerte verwenden.

**Geplantes Entscheidungstor — noch kein Messergebnis:**

- Vorhandene exakte IDs werden im richtigen Nummerierungssystem an erster Stelle gefunden. Strukturierte Filter werden nicht verletzt.
- Das ausgelieferte Profil erreicht auf den erfüllbaren Holdout-Anfragen mindestens **85 % Success@5**. Auf einer zurückgehaltenen Paraphrasen-Teilmenge zeigt es zusätzlich einen nachvollziehbaren Nutzen gegenüber der Basissuche.
- Das kompakte Profil wird bevorzugt, wenn sein nDCG@10 mindestens **95 % des E5-Werts** erreicht, sowohl insgesamt als auch für die deutsche Teilmenge. Zusätzlich soll Success@5 gegenüber E5 um höchstens **5 Prozentpunkte** abfallen; keine wiederkehrenden schweren Negations-/Kategoriefehler. Kleine Teilmengen durch Einzelfallprüfung absichern.
- „95 %“ bedeutet hier ein vorab gesetztes **relatives Qualitätsziel**, keine versprochene Trefferquote und keine 95-%-Identität der Ergebnislisten. Eine ebenfalls schlechte E5-Baseline genügt nicht: Das absolute Qualitätsziel bleibt Pflicht.
- Das gewählte Profil muss auf den Zielgeräten innerhalb der gemessenen Speicher-/Latenzgrenzen laufen. Die Größenhypothese allein entscheidet nicht.

Besteht das kompakte Profil, wird nur dieses ausgeliefert. Verfehlt es die Kriterien und besteht E5 Qualität **und** Browser-/Downloadprüfung, kann E5 das Releaseprofil werden. Scheitern beide, zuerst Annotationen, Normalizer, Ranking oder Katalogumfang überarbeiten; keine erzwungene Freigabe einer schlechten Lösung. Eine kleine Search-API ist nur eine spätere, ausdrücklich genehmigungspflichtige Architekturänderung, **kein Bestandteil dieses MVP-Plans**.

Ergebnisdateien: `docs/test-reports/search-benchmark.md`, maschinenlesbare Metriken und `docs/decisions/ADR-003-search-profile.md` mit Katalog-/Profilhashes, Testbedingungen und Begründung. Keine Bestwerte aus dem Entwicklungsset als unabhängiges Testergebnis ausgeben.

### 8.8 Abnahme und Verantwortlichkeiten

| Teilaufgabe | Zuständig | Nachweis |
|---|---|---|
| Lexikon, bekannte Wortzusammensetzungen, Vorschläge für Suchannotation und Fixtures | Luna, Review Sol + Mensch | Versionierte JSON-Daten, positive/negative Beispiele; keine erfundenen Merkmale. |
| Zwei getrennte Build-Indizes, Profilvertrag und Paritätstest | Sol; standardisierte Datenaufbereitung nach Vorgabe an Luna delegierbar | Hashes, reproduzierbare Builds, absichtlich falsches Modell-/Indexpaar wird abgewiesen. |
| Vergleich und Entscheidung | Sol, Relevanzfreigabe Mensch | Holdout-Report einschließlich Basissuche und sprachgetrennter Werte. |
| Worker, Browserressourcen und gegebenenfalls Modellsegmentierung | Sol | Geräte-/Netzwerkmessungen, Abbruch, Cache-Update, kein UI-Blockieren. |
| Download-/Statusoberfläche, Normalizer-Regressionen und E2E-Tests | Luna, Review Sol | Einhaltung der Design-Spec und reproduzierbare Fehlerpfade. |

**Fertig ist das Suchpaket erst, wenn:** Teilevektoren ausschließlich im Build entstehen; Modell und Index zusammen versioniert sind; das Normalizer-Verhalten getestet ist; der Entscheidungstest dokumentiert wurde; nur ein Releaseprofil geladen wird; und Suche plus 3D-Builder ohne eigenes Anwendungsbackend zusammen funktionieren.

---

## 9. Speichern, Teilen und Einkaufslisten

### 9.1 Lokale Entwürfe

IndexedDB speichert Figuren, Favoriten und Einstellungen. Autosave erfolgt verzögert nach einer erfolgreichen, gültigen Änderung. Der Nutzer sieht „Auf diesem Gerät gespeichert“. Kein Wortlaut, der eine Cloud-Sicherung suggeriert.

Speichern kann scheitern oder vom Browser später gelöscht werden. Deshalb JSON-Export anbieten, Speicherfehler sichtbar machen und eine Funktion „Lokale Daten löschen“ bereitstellen. Versionswechsel dürfen vorhandene Entwürfe nicht stillschweigend zerstören.

### 9.2 Share-Links

Eine kleine versionierte Figur kann im URL-Fragment abgelegt werden, zum Beispiel schematisch `/#figure=<payload>`. Fragmentinhalte werden für die Rekonstruktion im Browser verarbeitet; das ist kein privater, zugriffsgeschützter Datenspeicher.

Nur eigene Varianten-IDs, Version, Name und begrenzte Einstellungen zulassen. Keine Modell-URLs, HTML-Inhalte oder ausführbaren Daten. Links können veralten; dann erklärt die App, welche Varianten fehlen, statt Ersatzteile heimlich auszuwählen.

Projektlimits: höchstens 8 KiB kodierter Fragmentinhalt, 64 KiB Importdatei und 256 KiB nach eventueller Dekompression. Maximal unterstützte Slotzahl fest begrenzen. Grenzen sind Sicherheitsentscheidungen für diesen kleinen Dokumenttyp und werden getestet.

### 9.3 Einkaufslisten-Compiler

Die Teileliste entsteht aus `ProcurementRecipe`, nicht aus der Geometriehierarchie.

```text
gültige Figur
    ↓
pro Auswahl bestätigtes Beschaffungsrezept
    ↓
Baugruppen auflösen oder als Baugruppe übernehmen
    ↓
Doppelzählungen verhindern
    ↓
nach Artikeltyp + BrickLink-ID + BrickLink-Farbe aggregieren
    ↓
Prüfergebnis + XML
```

Fehlt eine bestätigte Zuordnung, ist der vollständige Export blockiert. Optional kann der Nutzer bewusst nur die verifizierten Positionen exportieren; fehlende Teile werden dabei unübersehbar benannt. Kein stiller Teil-Export.

### 9.4 XML und Übergabe an BrickLink

BrickLink dokumentiert ein Wanted-List-XML mit `INVENTORY`, `ITEM`, `ITEMTYPE` und `ITEMID`; `COLOR` und `MINQTY` werden für unseren farbspezifischen Export verwendet. Die Dokumentation verlangt, eine XML-Deklaration wegzulassen. Ein End-to-End-Test auf der tatsächlichen Importseite bleibt nötig. [S16](#s16)

Der Serializer baut das XML aus validierten Daten; Texte werden escaped. Keine ausgedachten Beispielnummern im produktiven Export. `MINQTY` ist eine positive ganze Zahl. Es gibt keinen automatisch gesetzten Maximalpreis und keinen vorgegebenen Händler.

**UI-Aktionen:** „XML kopieren“, „XML speichern“ und „BrickLink-Import öffnen“. Die Hilfe erklärt insbesondere den Bereich „Upload BrickLink XML format“. Die heruntergeladene `.xml`-Datei allein ist kein Beleg dafür, dass sie als beliebige Drittsoftwaredatei hochgeladen werden kann.

Ein Import oder Einkauf im Nutzerkonto wird nicht von uns automatisiert. Ein tatsächlicher Kauf ist kein Abnahmekriterium; geprüft wird, dass die Liste korrekt und ohne beabsichtigte Bestellung übernommen werden kann.

---

## 10. Rechte, Datenschutz und Sicherheit

### 10.1 Rechte sind eine Freigabebedingung

Dieses Dokument ist eine technische und produktbezogene Planung, keine abschließende rechtliche Freigabe. Ein offenes Lizenzthema bleibt offen, bis ein geeigneter Nachweis oder eine konkrete Prüfung vorliegt.

LDraw erlaubt für seine entsprechend lizenzierten Bibliotheksdateien unter Bedingungen unter anderem kommerzielle Nutzung und verlangt Attribution. Die jeweilige Dateilizenz und ihre Abhängigkeiten sind maßgeblich. Die Policy zu gerenderten Bildern ist keine umfassende Lizenz für fremde Marken, Produktformen oder Aufdrucke. [S15](#s15)

| Bereich | Umsetzungsvorgabe | Freigabe |
|---|---|---|
| Eigener Name / Logo | „FigForge“ nur Arbeitsname; unabhängige Wortmarke, kein LEGO-Logo. | Namens- und Markenprüfung vor öffentlichem Branding. |
| LDraw-Dateien | Lizenzheader, Quellenrevisionen und Attribution erhalten; auch konvertierte 3D-Dateien berücksichtigen. | Dateibezogener Nachweis. |
| Rebrickable Catalog Downloads/CSV | Für V1 ausschließlich als Katalogquelle verwenden: **keine MOC-Dateien**, MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte importieren, verarbeiten oder ausliefern; Quellenangabe und Nachweis für die Download-Daten im Register hinterlegen. | Kommerzielle Nutzbarkeit der Catalog-Download-Daten vom Projektverantwortlichen bestätigt; Bedingungen dokumentieren. [S03](#s03) |
| Rebrickable API | In V1 nicht verwenden; kein API-Key, keine Runtime-Abhängigkeit. | Kommerzielle Nutzung **nicht voraussetzen**. Vor jedem späteren API-Einsatz separat prüfen bzw. ausdrücklich freigeben lassen. [S03](#s03) |
| Fotos / Websiteinhalte | Keine ungeklärten Produktfotos, Websitekopien oder MOC-Anleitungen übernehmen. | Nur selbst erzeugte oder separat freigegebene Assets. |
| Formen / Aufdrucke | Darstellung im tatsächlichen kommerziellen Kontext prüfen; Franchise-Motive nicht automatisch durch Datenlizenzen abgedeckt. | Konkrete rechtliche Prüfung. |
| Software / Fonts | Reale Abhängigkeitslizenzen und Notices erfassen, auch bei kopierten Einzeldateien. | Dependency-/Asset-Review. |
| BrickLink | Exportziel, kein eigener Checkout; späterer API-Einsatz als eigenes Projekt. | XML-Integration und sachliche Benennung prüfen. |

Die LEGO-Fair-Play-Richtlinie beschreibt begrenzte nichtkommerzielle Referenznutzung und weist selbst auf die Grenzen des Disclaimers hin. § 23 MarkenG enthält Regeln zur zulässigen referenziellen Markennutzung, ersetzt aber keine Prüfung unserer konkreten Gestaltung. [S10](#s10)[S11](#s11)

**Nicht bis zur ersten Zahlung warten:** Eine frei zugängliche App kann bereits in einem geschäftlichen Kontext stehen. Die öffentliche Freigabe wird daher vor Launch geprüft, nicht erst bei Einführung eines Abos.

### 10.2 Geplante Rechtstexte und Nachweise

`/credits` nennt Quellen und Mitwirkende. `/licenses` enthält die tatsächlich verwendeten Software-, Modell- und Assetlizenzen sowie erforderliche Hinweise auf Änderungen. Quelle und Lizenz jedes veröffentlichten Assets werden maschinenlesbar dokumentiert.

Der bereits besprochene Unabhängigkeitshinweis bleibt vorgesehen:

> LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this site.

Er ist **Ergänzung**, nicht Erlaubnis. Anbieterkennzeichnung und Datenschutzhinweise werden passend zum tatsächlichen Betreiber ausgefüllt; keine erfundenen Firmenangaben. § 5 DDG ist für die Prüfung der Anbieterinformationen relevant. [S17](#s17)

### 10.3 Datenschutz

Im MVP keine Accounts, Werbepixel, externen Schriftaufrufe, Uploads persönlicher Fotos oder automatische Übertragung der Suchtexte. Fehlermeldungen zunächst lokal protokollieren; freiwillige Fehlerberichte dürfen nicht ungefragt Entwürfe oder persönliche Informationen mitsenden.

Backendlos bedeutet nicht automatisch datenschutzfrei: Hosting, Zugriffsprotokolle und etwaige externe Assetabrufe werden im realen Setup geprüft. Lokale Speicherung und Caches werden anhand ihres Zwecks bewertet; § 25 TDDDG enthält Bedingungen für Speicherung/Zugriff auf Endgeräten. Ein pauschales „wir nutzen keine Cookies, also braucht es keine Prüfung“ ist unzulässig als Planungsannahme. [S18](#s18)

### 10.4 Sicherheitsregeln

- Keine API-Schlüssel, Tokens oder vertraulichen Quelldaten in Frontend, statischem Build oder Share-Link.
- Katalogtexte als Text rendern, nicht als fremdes HTML. XML-Ausgabe escaped erzeugen.
- Importdaten anhand eines Schemas prüfen; unbekannte Properties, übergroße Mengen und nicht endliche Zahlen ablehnen.
- Keine beliebigen Remote-Modelle aus Benutzer-URLs laden. Assets kommen nur aus dem Manifest.
- Eingehende Daten sind Daten, keine Anweisungen an Coding-Agenten.
- Netzwerkaufrufe und externe Links auf erwartete Ziele beschränken. Neue Backend- oder Trackingabhängigkeiten benötigen Freigabe.
- CSP, MIME-Typen und WASM-/Worker-Konfiguration im tatsächlichen Hosting testen; keine unnötig breite Freigabe aus Bequemlichkeit.
- Code- und Assetabhängigkeiten versionieren und Updates bewusst einspielen. Keine automatische Übernahme ungeprüfter neuer Katalogteile.

---

## 11. Hosting, Kosten und Leistungsbudgets

### 11.1 Hostingentscheidung

Cloudflare Workers mit Static Assets ist der geplante erste statische Host. Cloudflare empfiehlt Workers als primäre Plattform für neue Projekte; die Static-Assets-Funktion kann HTML, CSS, JavaScript, Modelle und andere Dateien gemeinsam ausliefern. Die geprüfte Dokumentation nennt derzeit 20.000 statische Dateien pro Worker-Version im Free-Plan und 25 MiB pro einzelner Datei. Diese Grenzen sind vor jedem Release erneut zu prüfen und kein Versprechen dauerhaft kostenloser unbegrenzter Produktnutzung. [S09](#s09)

GitHub ist das zentrale Repository. Cloudflare Workers Builds wird direkt mit dem GitHub-Repository verbunden, baut das Vite-Projekt und deployt den Inhalt von `dist/` nach einem Merge in den geschützten Produktionsbranch. Arbeitsbranches und Pull-Requests erhalten Vorschauen; eine Vorschau wird nicht automatisch zur Produktion. Der Name in `wrangler.jsonc` und der im Cloudflare-Dashboard konfigurierte Worker müssen übereinstimmen. [S24](#s24)

Regelmäßige Rebrickable-Aktualisierungen laufen getrennt davon über einen geplanten GitHub-Actions-Workflow. Er lädt ausschließlich Catalog Downloads/CSV, prüft Schema, Hashes, Provenienz, Größenbudgets und den Ausschluss von MOC-Dateien und erstellt oder aktualisiert einen Pull-Request. Erst Review und Merge lösen den Cloudflare-Build aus. GitHub Actions erhält keine Cloudflare-Produktionszugangsdaten; das Deployment bleibt Aufgabe von Cloudflare Workers Builds.

Wir liefern nur `dist/` aus. Im MVP gibt es keinen eigenen Worker-Request-Handler, keine Datenbankbindings und keine implizit aktivierten kostenpflichtigen Dienste. Das SPA-Fallback, Namensauflösung, TLS, Caching, Security-Header und Fehlerrouten müssen nach Deployment überprüft werden.

### 11.2 Kosten sauber trennen

| Kostenart | MVP-Plan |
|---|---|
| Öffentliche KI-Anfragen | Keine bezahlte Inferenz-API pro Suche vorgesehen. |
| Eigener Backendserver | Nicht vorgesehen. |
| Cloud-Datenbank | Nicht vorgesehen. |
| Statisches Hosting | Ziel 0 € innerhalb eines passenden zulässigen Free-Plans. |
| GitHub Actions | Geplanter Datenrefresh und CI innerhalb der tatsächlich verfügbaren GitHub-Kontingente; Laufzeit und Artefakte beobachten. |
| Cloudflare Workers Builds | Build und Deployment aus dem verbundenen GitHub-Repository; tatsächliche Buildkontingente und Bedingungen vor Launch prüfen. |
| Suchmodell / Suchindex | Ein ausgewähltes Profil ausliefern. Kompaktes Modell direkt statisch prüfen; E5-Segmentierung nur bei tatsächlichem Releasebedarf. Separater Host nur nach Kostenfreigabe. |
| Eigene Domain | Optionaler gesonderter Aufwand; zunächst Hosting-Subdomain möglich. |
| Sol/Luna für Entwicklung | Abhängig vom verwendeten Produkt, Plan und Verbrauch; nicht automatisch kostenlos. |
| Lokale Builds und Rendering | Eigene Rechnerzeit, Strom und Speicher. |
| Rechteklärung | Mögliche einmalige Kosten; nicht als durch Technik erledigt behandeln. |
| Wartung / Datenpflege | Arbeitsaufwand, auch wenn Rechnungsbetrag für Hosting 0 € ist. |

Keine bezahlte Ressource ohne Zustimmung aktivieren. Überschreitet das Konzept die Free-Grenzen von GitHub oder Cloudflare, zuerst Aktualisierungsfrequenz, kleineres Startkatalogpaket, weniger Assets und bedarfsgesteuertes Laden prüfen. Nicht unbemerkt in einen bezahlten Plan wechseln.

### 11.3 Vorgeschlagene Leistungsbudgets

Alle Werte sind **Abnahmeziele**, keine schon gemessenen Produkteigenschaften. Testgeräte, Browser, Netzwerkprofil und Messmethode werden protokolliert.

| Messgröße | Erstes Ziel |
|---|---|
| Initiale UI-Dateien | Höchstens etwa 500 KiB komprimiertes JS ohne nachgeladene 3D-/KI-Module. |
| Frühe Nutzbarkeit | Stichwortsuche und Grundnavigation funktionieren, bevor das KI-Modell lädt. |
| Erste echte Figur | Höchstens etwa 8 MiB zusätzliches Assetbudget; POC misst tatsächliche Werte. |
| Thumbnail | Meist 20–60 KiB bei sinnvoller WebP-Auflösung; Detailbilder separat laden. |
| Assetverteilung | Grundsätzlich höchstens 20 MiB je Datei. Gezielte Ausnahme: kompakte INT8-ONNX-Datei bis 24 MiB nach Byteprüfung; das Hostinglimit bleibt 25 MiB. [S09](#s09) |
| Zusätzliche Suchdateien | Kompaktprofil: 25–35 MB als zu prüfende Hypothese, einschließlich notwendiger Laufzeit, Tokenizer und Index. Kein Versprechen über die gesamte App. |
| Releaseprofile | Genau ein Suchmodell mit passendem Index im regulären Release; beide Profile nur im Entwicklungstest. |
| Katalogdateien | Pro Kategorie oder kleinem Paket laden; nicht vollständige LDraw-Library ausliefern. |
| Lexikalische Suche | Ziel unter 100 ms bei warmem Index auf einem definierten Referenzgerät. |
| Semantische Suche | Warmes Ziel: p95 unter 1,5 s auf Referenzdesktop, unter 3 s auf getesteten Mobilgeräten. |
| Teilwechsel | Gecacht möglichst unter 150 ms bis zur sichtbaren Aktualisierung; Ladezustand bei Netzwerkbedarf. |
| 3D | Mindestens 30 fps auf unterstützten Referenzgeräten; Bedarf statt Daueranimation, DPR begrenzen. |
| Modellstart | Fortschritt, Abbruch und Basissuche bleiben verfügbar; keine starre „in wenigen Sekunden“-Zusage. |

Bei überschrittenen Budgets zuerst Assetumfang, doppelte Materialien, Geometriedetails, Workerlast und Lazy Loading prüfen. Der Browser darf nicht wegen gleichzeitiger Inferenz und unnötigem 3D-Dauerloop unbedienbar werden.

---
## 12. Umsetzungsphasen und Arbeitspakete

### 12.1 Meilensteine

| Phase | Ergebnis | Abnahmetor |
|---|---|---|
| **0 — Grundlagen** | Quellenstatus, kleines Testsortiment, Datenverträge, GitHub-Repository, CI-Grundgerüst und Cloudflare-Konfiguration. | Keine ungeklärte Quelle wird stillschweigend als freigegeben behandelt; Branchschutz und Verantwortungsgrenzen zwischen GitHub Actions und Cloudflare sind dokumentiert. |
| **1 — Technischer POC** | Echte Figur laden, mindestens fünf Köpfe/fünf Kopfbedeckungen/drei Handaccessoires wechseln, erste richtige Einkaufsliste. | Geometrie, Anschlüsse und Einkaufspositionen stimmen zusammen. |
| **2 — Kuratierter Katalog** | Reproduzierbare Pipeline, Assetpakete, Vorschauen, Mapping-Review und Lizenzmanifest. | Nur überprüfte Varianten gelangen in den veröffentlichten Datensatz. |
| **3 — Produktoberfläche** | Designgetreuer Desktop-Builder, responsive Ansichten und vollständige UI-Zustände. | Bedienbar mit Maus, Touch und Tastatur; keine Mock-Funktionen. |
| **4 — Suche** | Vorberechnete MiniLM-/E5-Teileindizes, Begriffs-Layer, Basissuche und Vergleichstest; ein ausgewähltes Releaseprofil. | Kapitel 8.7 bestanden: absolute Qualität, 95-%-Vergleichsziel für den Kompaktkandidaten und Browser-/Downloadnachweise; keine Doppelinstallation. |
| **5 — Vollständiger Ablauf** | Speichern, Sammlung, Teilen und fehlerfreier XML-Export. | Eine Figur überlebt Neuladen und wird ohne doppelte/falsche Positionen exportiert. |
| **6 — Freigabe und Alpha** | Tests, Geräteprüfung, rechtliche Freigaben, statisches Deployment und Nutzertests. | Kritische Fehler geschlossen; Betriebskosten und Grenzen transparent. |

Phasen 2 und 3 können nach stabilen Datenverträgen teilweise parallel laufen. Die Suchintegration darf nicht auf unklaren Varianten-IDs aufbauen. Eine öffentliche Veröffentlichung wartet auf die Rechte- und Releasefreigaben, auch wenn der Code früher funktioniert.

### 12.2 Priorisierter Backlog

**Legende:** Sol/Luna bezeichnen das empfohlene Entwicklungsmodell. „Mensch“ ist der Projektverantwortliche beziehungsweise bei Rechtsfragen die fachlich geeignete prüfende Person. Jeder Auftrag liefert Code oder Dokumentation **plus Nachweis**, nicht nur einen Abschlusskommentar.

| Ticket | Konkretes Ergebnis | Umsetzung | Review / Freigabe | Abhängigkeit |
|---|---|---|---|---|
| FF-00 | MVP-Grenzen, offene Annahmen und Entscheidungsliste festhalten. | Sol | Mensch | — |
| FF-01 | Quellen-/Lizenzregister erstellen; vom Projektverantwortlichen bestätigte kommerzielle Nutzung der **Rebrickable Catalog Downloads/CSV** mit einschlägigem Nachweis und Attribution dokumentieren. Verbindlich festhalten und technisch absichern: **keine MOC-Dateien**, MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte. Rebrickable API ausdrücklich als „V1: nicht verwendet / kommerzielle Freigabe nicht vorausgesetzt“ führen. Übrige offene Rechte getrennt führen. | Sol: Vorarbeit | Mensch / Fachprüfung | FF-00 |
| FF-02 | GitHub-Repository, Branchschutz, Lockfile, Datenverträge, Validierungsschema und Testgerüst aufsetzen; `.github/workflows/ci.yml`, geplanten `refresh-catalog.yml` und `wrangler.jsonc` zunächst ohne Produktionsfreigabe definieren. GitHub Actions darf nicht nach Cloudflare deployen. | Sol | Mensch | FF-00 |
| FF-03 | Kleines echtes Testsortiment, Varianten und Einkaufszuordnungen belegen. | Luna: Erfassung | Sol + Mensch | FF-01, FF-02 |
| FF-04 | Three.js-Szene, Modellloader, Kamera und kontrollierter Teiltausch. | Sol | Mensch: visueller Test | FF-03 |
| FF-05 | Anker-Registry und Platzierung der ersten Slotfamilien implementieren. | Sol | Mensch: Passformkontrolle | FF-04 |
| FF-06 | Erste Beschaffungsrezepte und Baugruppenlogik samt erwarteter Teileliste. | Sol | Mensch | FF-03, FF-05 |
| FF-07 | Kleiner klickbarer POC für Kopf, Kopfbedeckung und Handaccessoires. | Luna | Sol | FF-04–FF-06 |
| FF-08 | Quellenadapter und Normalisierung nach freigegebenem Schema; geplanter GitHub-Actions-Refresh ausschließlich für Rebrickable Catalog Downloads/CSV, mit Schema-/Hash-/Provenienzprüfung, MOC-Ausschluss, Abbruchregeln und Review-Pull-Request. | Luna | Sol | FF-01, FF-02, FF-07 |
| FF-09 | Datenvalidatoren, Dublettenprüfung und Review-Report für offene Mappings. | Luna | Sol | FF-08 |
| FF-10 | Reproduzierbare Modellpakete und Thumbnail-Generierung. | Luna | Sol | FF-04, FF-08 |
| FF-11 | Assetmanifest, Lizenzerfassung, Provenienz und Quellenhinweise generieren. | Luna | Sol + Mensch | FF-09, FF-10 |
| FF-12 | Design-Tokens, Buttons, Inputs, Karten und Statuskomponenten. | Luna | Sol + Mensch: Design | FF-02 |
| FF-13 | Desktop-Arbeitsfläche mit echter Katalogliste und Figurenpanel. | Luna | Sol + Mensch: Design | FF-07, FF-12 |
| FF-14 | Tablet-/Mobilansichten, Drawer, Tabs und Tastaturfluss. | Luna | Sol | FF-13 |
| FF-15 | Robuster Scene-Lifecycle: Race Conditions, Cache, Dispose und Fehlerpfade. | Sol | Mensch: Browsernachweise | FF-07 |
| FF-16 | Kompatibilitätsmatrix, Ausschlussregeln und Warnzustände. | Sol | Mensch: Stichproben | FF-05, FF-09 |
| FF-17 | Basissuche plus versionierter Deutsch→Englisch-Normalizer; IDs, bekannte Zusammensetzungen, Negationen, Kategorien und Farbfilter mit Fixtures. | Luna | Sol | FF-08, FF-13 |
| FF-18 | Zwei Build-Indizes für `compact-minilm` und `quality-e5`; 160-Fälle-Testset, Holdout-Vergleich und ADR nach 8.7. Keine Mischung von Modell und Index. | Sol | Mensch: Relevanzbewertung | FF-09, FF-17, FF-21 |
| FF-19 | Ein gewähltes Profil im Worker integrieren: nur Query-Embedding zur Laufzeit, Indexmanifest prüfen, Ranking und FP32-Parität testen. FP16 nur nach gesondertem Qualitätstest. | Sol | Mensch: Testbericht | FF-18 |
| FF-20 | Kompaktmodell direkt ausliefern; echte Gesamtgröße, Worker/RAM, Cache, Abbruch und Nur-ein-Profil-Netzwerkaudit. E5-Segmentadapter nur, falls E5 Releaseprofil wird. | Sol | Mensch: Browsernachweise | FF-19 |
| FF-21 | Geprüfte englische Suchdokumente, deutsches Lexikon und Entwurf des stratifizierten Testsets; Holdout vom Regel-Tuning trennen. | Luna | Sol + Mensch | FF-08, FF-09 |
| FF-22 | IndexedDB, Autosave, lokale Sammlung und Datenmigrationen. | Luna | Sol | FF-02, FF-13 |
| FF-23 | Validierter JSON-Import/-Export und versionierter Share-Link. | Luna | Sol: Sicherheitsreview | FF-22 |
| FF-24 | Einkaufslisten-Compiler: Varianten, Farben, Baugruppen und Mengensummen. | Sol | Mensch: Referenzlisten | FF-06, FF-09, FF-16 |
| FF-25 | Deterministischer XML-Serializer und Exportfixtures. | Luna | Sol | FF-24 |
| FF-26 | Export-Review, Kopier-/Downloadfunktion und BrickLink-Importhilfe. | Luna | Sol + Mensch | FF-25, FF-13 |
| FF-27 | Komponenten-, Fehler-, Import- und E2E-Tests; zusätzlich Normalizer-Regressionen, Modell-/Index-Mismatch, Downloadstatus und fehlender Cache. | Luna | Sol | jeweilige Features |
| FF-28 | Gesamtablauf, Stresstests, kritische Fehler und Integrationsreview. | Sol | Mensch | FF-14–FF-27 |
| FF-29 | Hilfe, Credits, Lizenzansicht und tatsächliche Anbieter-/Datenschutzhinweise. | Luna: Entwurf | Mensch / Fachprüfung | FF-01, FF-11 |
| FF-30 | Performance-, Kontrast-, Tastatur- und Gerätereport erstellen. | Luna: Messung | Sol: Analyse | FF-28 |
| FF-31 | Cloudflare Workers Static Assets und Workers Builds mit GitHub verbinden; Preview-/Produktionsbranches, `dist/`, SPA-Fallback, Security-Header, Rollback und Netzwerkaudit prüfen. Produktionsdeployment ausschließlich über Cloudflare nach freigegebenem Merge. | Sol | Mensch: Deployfreigabe | FF-20, FF-28–FF-30 |
| FF-32 | Moderierte Alpha-Tests und priorisierte nächste Verbesserungen. | Mensch + Luna: Auswertung | Sol + Mensch | FF-31 |

### 12.3 Abnahme des ersten POC

Der POC gilt nicht schon deshalb als gelungen, weil irgendeine Figur sichtbar ist. Er muss nachweisen:

- Mehrere echte Köpfe und Kopfbedeckungen sind austauschbar und bleiben korrekt ausgerichtet.
- Mindestens drei verschiedene Handaccessoires sitzen am geprüften Griffpunkt.
- Ein Oberkörper-/Beinwechsel verändert keine fremden Slots unbeabsichtigt.
- Die Materialdarstellung entspricht der gewählten Variante; Aufdrucke bleiben erhalten.
- Die zugehörige Einkaufsübersicht enthält weder Bühnenobjekte noch doppelt gezählte Baugruppenbestandteile.
- Alle verwendeten Assets und Zuordnungen haben eine nachvollziehbare Herkunft.

Scheitert das an einer Teilfamilie, wird zunächst diese Familie begrenzt oder korrigiert. Eine schöne Oberfläche darf den Fehler nicht verdecken.

---

## 13. Aufgabenverteilung zwischen Sol und Luna

### 13.1 Grundsatz

Die aktuelle OpenAI-Modellübersicht beschreibt GPT-6 Sol für komplexe Coding-/Agentenaufgaben und GPT-6 Luna für fokussierte, umfangreiche Aufgaben bei höherer Kosteneffizienz. Daraus leitet sich die folgende **projektbezogene Empfehlung** ab. Verfügbarkeit und Abrechnung im tatsächlich verwendeten Konto vor Arbeitsbeginn prüfen. [S19](#s19)

**Sol entscheidet und integriert, wo mehrere Systeme zusammenhängen. Luna setzt klar beschriebene, prüfbare Arbeitspakete um.** Beide können Code schreiben; die Trennung ist keine starre Fähigkeitsgrenze. Tests und menschliche Prüfung bleiben entscheidend.

### 13.2 Sol einsetzen für

| Arbeit | Begründung für diese Zuordnung |
|---|---|
| Architektur und stabile Datenverträge | Fehler würden alle weiteren Pakete betreffen. |
| Anker, Transformationen und Scene-Lifecycle | Eng gekoppelte 3D-, Zustands- und Ressourcenfragen. |
| Exakte Beschaffungslogik | Falsche Ergebnisse können zum Kauf falscher oder doppelter Teile führen. |
| MiniLM-/E5-Vergleich, vorab berechnete Indizes und Profilgleichheit | Absolute Relevanz plus 95-%-Vergleichsziel, unverfälschter Holdout und passende Modell-/Indexversionen gemeinsam prüfen. |
| Große Modelldateien und Browserressourcen | Mehrere Browser-/Hostinggrenzen müssen zusammen berücksichtigt werden. |
| Sicherheitskritische Import-/Share-Protokolle | Eingabevalidierung, Größenlimits und Vertrauensgrenzen. |
| Gesamtintegration und harte Fehler | Ursachen verlaufen häufig über mehrere Module. |
| Finaler technischer Release-Review | Alle Verträge, Daten und Laufzeitanforderungen zusammenführen. |

Sol kann bei der Rechtsrecherche strukturieren und Quellen dokumentieren. Es übernimmt **keine anwaltliche Freigabe** und darf ungeklärte Rechte nicht per eigener Schlussfolgerung auf „grün“ setzen.

### 13.3 Luna einsetzen für

| Arbeit | Voraussetzung |
|---|---|
| UI-Komponenten und responsive Layouts | Design-Tokens, Zustände und Referenz sind festgelegt. |
| CSV-/JSON-Adapter und Normalisierung | Eingabeschema und Quellenberechtigung sind geklärt. |
| Domänenlexikon, Übersetzungen, Suchannotation und Normalizer-Fixtures | Kleine Batches, bekannte Zusammensetzungen und Negationen; Sol prüft Verträge, Mensch prüft Merkmale. |
| Thumbnail-/Manifestautomatisierung | Funktionsfähige Referenzpipeline vorhanden. |
| Lokale Sammlung und Standarddialoge | Dokument- und Speichervertrag sind stabil. |
| XML-Serialisierung | Einkaufspositionen kommen bereits aus dem geprüften Compiler. |
| Unit-/Komponenten-/E2E-Tests | Erwartete Ergebnisse unabhängig vom getesteten Code definiert. |
| Hilfetexte, Dokumentation und Reports | Keine erfundenen Produktversprechen oder juristischen Freigaben. |
| Begrenzte Refactorings | Kleiner Bereich, vorhandene Tests, keine versteckte Architekturänderung. |

### 13.4 Kostenschonender Arbeitsmodus

Nicht die gesamte App als einen riesigen Auftrag an beide Modelle geben. Sol definiert zuerst die gemeinsamen Verträge. Luna erhält danach kleine Tickets mit erlaubtem Änderungsbereich, Beispieldaten und überprüfbaren Ergebnissen. Sol prüft besonders Änderungen an den Übergängen zwischen Modulen.

Anfangs höchstens ein bis zwei parallele Luna-Pakete mit unterschiedlichen Dateien. Mehr Parallelität erst, wenn dadurch tatsächlich weniger Durchlaufzeit entsteht. Zwei Agenten sollen nicht gleichzeitig denselben Store, dieselben Contracts oder dieselbe Abhängigkeitsdatei verändern.

Ein Ticket wird zu Sol eskaliert, wenn es eine bisher ungeklärte Architekturentscheidung verlangt, unauflösbare Datenwidersprüche zeigt oder nach zwei eng begrenzten Korrekturversuchen weiterhin am selben grundlegenden Problem scheitert. Das ist eine Arbeitsregel, keine Modellbewertung.

### 13.5 Übergabeformat

Jeder Auftrag enthält:

```text
Ticket:
Ziel:
Abhängigkeiten und freigegebene Verträge:
Erlaubte Dateien:
Nicht verändern:
Beispiele und erwartete Ergebnisse:
Akzeptanzkriterien:
Auszuführende Tests:
Abbruch-/Eskalationskriterien:
```

Jede Rückgabe enthält veränderte Dateien, tatsächliche Testergebnisse, bekannte Einschränkungen und offene Fragen. „Tests sollten funktionieren“ ist kein Testnachweis. Ein Modell darf seine eigene Implementierung nicht dadurch bestätigen, dass es die Sollwerte passend zum aktuellen Ergebnis neu erzeugt.

---

## 14. Tests und Abnahmekriterien

### 14.1 Testebenen

| Ebene | Pflichtfälle |
|---|---|
| Daten | Keine veröffentlichten unbekannten IDs; nachvollziehbare Farben; keine Unterdateien als Shopartikel; vollständige Assetabhängigkeiten. |
| Einheiten | Mengenaggregation, Variantenwahl, Baugruppenrezepte, Undo/Redo, Schema- und Größenvalidierung. |
| Komponenten | Suchzustände, Karte auswählen, Drawer schließen, Fehler anzeigen, Fokus zurückgeben. |
| Renderer | Referenzansichten, passender Kopf-/Handanker, Materialien, rasches Wechseln, Ressourcenfreigabe. |
| Suche | 160-Fälle-Testset mit 80 Holdout-Fällen; MiniLM+Normalizer vs. E5 vs. Basissuche; getrennte Sprachwerte, IDs, Negationen, unbekannte Wörter und Filter. |
| Embedding-Vertrag | Offline-/Browser-Parität, korrekte E5-Präfixe, geordnete Varianten-IDs, abgelehntes Modell-/Index-Mismatch; kein Teile-Embedding bei Nutzung der App. |
| Speicher | Neuladen, Migration, gelöschter Katalogeintrag, Quota-Fehler und JSON-Wiederherstellung. |
| Export | Exakte erwartete Artikel-/Farb-/Mengentupel, XML ohne Deklaration, Escaping und fehlendes Mapping. |
| Sicherheit | Bösartige Texte, riesige Importdatei, ungültige Matrizen/IDs, externe Asset-URL und Dekompressionsgrenze. |
| Betrieb | Kalter Cache, Downloadabbruch, Cache-Update, reale Zusatzbytes und Modellstart, kein Doppelmodell-Download, Assets unter freigegebenem Limit, keine geheimen Schlüssel im Build. |

### 14.2 Ende-zu-Ende-Szenarien

**E2E-01 — Erste Figur:** App öffnen → nach Kopf suchen → Kopf einsetzen → Kopfbedeckung einsetzen → Handaccessoire wählen → Auswahl und Figur stimmen überein.

**E2E-02 — Nicht unterstützte Kombination:** Konflikt auslösen → klarer Hinweis → alte gültige Figur bleibt erhalten → passende Alternative auswählen.

**E2E-03 — Speicherung:** Figur umbenennen → lokal speichern → Seite neu laden → Auswahl, Varianten und Name sind identisch.

**E2E-04 — Teilen:** Share-Link erstellen → in leerem Profil öffnen → Figur wird korrekt wiederhergestellt; fehlender Katalogeintrag erzeugt Hinweis statt stillen Ersatz.

**E2E-05 — Export:** Figur mit Baugruppen und gleichen Accessoires prüfen → korrekt aggregiertes XML → manuell auf der aktuellen BrickLink-Importseite testen, ohne Teile zu bestellen.

**E2E-06 — Offline-nahe Situation:** Nach initialem Laden Netzwerk unterbrechen → bereits geladene Auswahl weiter bedienen → fehlende Assets nachvollziehbar behandeln.

**E2E-07 — Semantik-Ausfall:** Modelldownload abbrechen oder Ressourcenfehler simulieren → Basissuche bleibt benutzbar; Modus wird korrekt angezeigt.

**E2E-08 — Mobile Bedienung:** Suchen, einsetzen, Figur kontrollieren und Liste exportieren, ohne Desktop-Hover oder präzise Drag-Gesten vorauszusetzen.

**E2E-09 — Keine Doppelinstallation:** Leeres Browserprofil → Basissuche verwenden → genau ein Releaseprofil aktivieren → Netzwerk zeigt nur dessen erforderliche Dateien/Index; keine E5-Nachladung bei unbekanntem deutschem Wort.

**E2E-10 — Falsches Modell-/Indexpaar:** Veralteten oder fremden Index simulieren → Integritäts-/Profilprüfung stoppt semantische Suche → keine unbrauchbaren Vektorvergleiche, Basissuche bleibt verfügbar.

**E2E-11 — Kein Katalog-Embedding im Browser:** Erweiterte Suche aktivieren → Worker erhält vorab berechnete Teilevektoren → Inferenzaufrufe ausschließlich für Nutzeranfragen, nicht für sämtliche Katalogtexte.

### 14.3 Visuelle Abnahme

Prüfbreiten: 1536, 1440, 1280, 1024, 768, 390 und 320 CSS-Pixel. Zusätzlich Browserzoom bis 200 % und mindestens eine kurze Fensterhöhe testen.

Die generierte Referenz wird **nicht** als pixelgenaues Golden Image für reale Teile verwendet. Erst eine echte, freigegebene Browseransicht mit realen Assets wird als Screenshotbaseline festgehalten. Designreview vergleicht Hierarchie, Abstände, Farblogik, Typografie und Interaktionen.

Keine abgeschnittenen Kartenbeschriftungen ohne erreichbaren vollständigen Namen. Keine Texte auf dem Pinselstrich. Keine Schattenwolken um jede Karte. Keine tote Community-Navigation und kein Accountavatar ohne Accountfunktion.

### 14.4 Menschliche Prüfungen

Mindestens einige repräsentative Figuren und Accessoire-Kombinationen werden gegen reale Teile beziehungsweise verlässliche Referenzen geprüft. Geometrische Nähe im Browser ist kein Nachweis für physische Passform.

Rechtsfreigabe, Markenentscheidung, Nutzerverständnis und tatsächliche Suchrelevanz sind keine rein automatisierten Tests. Sol und Luna bereiten Nachweise vor; sie ersetzen diese Entscheidungen nicht.

---

## 15. Repository, Startaufträge und Zusammenarbeit

### 15.1 Vorgeschlagene Struktur

```text
figforge/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── wrangler.jsonc
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml
│       └── refresh-catalog.yml
├── docs/
│   ├── implementation-plan.md
│   ├── design-spec.md
│   ├── decisions/
│   │   └── ADR-003-search-profile.md
│   ├── source-register.md
│   ├── legal-review-checklist.md
│   └── test-reports/
├── design/
│   └── reference.png
├── src/
│   ├── app/
│   ├── contracts/
│   ├── components/
│   ├── features/
│   │   ├── catalog/
│   │   ├── search/
│   │   ├── figure/
│   │   ├── collection/
│   │   └── export/
│   ├── engine/
│   │   ├── rendering/
│   │   ├── attachments/
│   │   ├── compatibility/
│   │   └── procurement/
│   ├── workers/
│   ├── storage/
│   ├── i18n/
│   └── styles/
├── tools/
│   ├── import/
│   ├── normalize/
│   ├── build-assets/
│   ├── render-thumbnails/
│   ├── build-search/
│   ├── benchmark-search/
│   └── validate/
├── data/
│   ├── sources.lock.json
│   ├── curated/
│   │   ├── lexicon.de-en.json
│   │   └── search-annotations.json
│   ├── search-profiles/
│   │   ├── compact-minilm.json
│   │   └── quality-e5.json
│   ├── overrides/
│   └── generated/
├── public/
│   ├── catalog/
│   ├── assets/
│   ├── models/
│   ├── search/                     # nur gewähltes Releaseprofil
│   ├── licenses/
│   └── _headers
└── tests/
    ├── fixtures/
    │   ├── search-dev.jsonl
    │   ├── search-holdout.jsonl
    │   └── query-normalizer.json
    ├── unit/
    ├── integration/
    ├── e2e/
    └── visual/
```

Große Roharchive und unnötige Originalbibliotheken nicht unbesehen im Git-Repository oder Web-Build speichern. Assetmanifeste und reproduzierbare Beschaffungs-/Buildschritte dokumentieren. Ein Dateiname unter `public/` ist keine Zugriffskontrolle.

### 15.2 Geplante Scripts

Diese Befehle sind **Soll-Schnittstellen**, noch keine existierenden Implementierungen:

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:visual
npm run data:refresh
npm run data:import
npm run data:validate
npm run assets:build
npm run previews:build
npm run search:build -- --profile compact-minilm
npm run search:build -- --profile quality-e5
npm run search:benchmark
npm run search:parity
npm run search:package -- --profile compact-minilm
npm run licenses:check
npm run budget:check
npm run build
npm run verify
```

Die Suchbefehle sind geplante Schnittstellen: `search:build` erzeugt Teilevektoren ausschließlich vorab; `search:benchmark` vergleicht beide Profile und die Basissuche; `search:parity` prüft Modell-/Index-/Browsergleichheit; `search:package` kopiert nur das freigegebene Profil ins Release. `compact-minilm` im Packaging-Beispiel ist kein vorweggenommenes Benchmark-Ergebnis.

`data:refresh` lädt ausschließlich die freigegebenen Rebrickable Catalog Downloads/CSV in einen temporären Arbeitsbereich und übergibt sie an Import und Validierung; MOC-Dateien sind ein harter Fehler. Der geplante GitHub-Actions-Workflow ruft dieselben Scripts auf wie die lokale Entwicklung und erstellt bei einer gültigen Änderung einen Review-Pull-Request. Er schreibt nicht direkt nach `main`.

`verify` führt die lokal reproduzierbaren Prüfungen aus. Ein grüner Build ersetzt weder Browser-Sichtprüfung noch Quellen-/Rechtefreigabe. GitHub Actions erhält keine Cloudflare-Produktionszugangsdaten. Cloudflare Workers Builds führt nach dem freigegebenen Merge den Produktionsbuild und das Deployment aus; kein `wrangler deploy` aus GitHub Actions.

### 15.3 Erster Auftrag für Sol

```text
Lies den Implementierungsplan und die Designreferenz vollständig.
Bearbeite zunächst FF-00 bis FF-02 und definiere das Testsortiment für FF-03.

Ziel:
Eine kleine, überprüfbare Grundlage für einen backendlosen Minifiguren-Builder.
Noch keinen vollständigen Katalog und keine Account-/Community-Funktionen bauen.

Liefere:
1. Architekturentscheidungen und offene Risiken.
2. Versionierte Datenverträge mit Validierung.
3. GitHub-Repo- und Testgerüst mit Branchschutzvorgaben, `ci.yml`,
   `refresh-catalog.yml` und `wrangler.jsonc`.
4. Quellen-/Lizenzregister mit ehrlichem Status.
5. Präzise, voneinander unabhängige Luna-Tickets.

Keine Teilenummern aus dem generierten Mockup übernehmen.
Nur Rebrickable Catalog Downloads/CSV verwenden; keine MOC-Dateien,
MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte importieren.
GitHub Actions nur für CI und den geprüften Daten-PR verwenden.
Build und Deployment über Cloudflare Workers Builds einplanen; keine
Cloudflare-Produktionszugangsdaten und kein Deployment in GitHub Actions.
Keine Freigaben für Daten oder Marken erfinden.
Keine kostenpflichtigen Dienste oder öffentlichen Deployments ohne Zustimmung.
```

### 15.4 Beispielauftrag für Luna: Designsystem

```text
Bearbeite FF-12 auf Basis der freigegebenen Design-Spezifikation.

Erlaubter Bereich:
src/components/, src/styles/ und zugehörige Komponententests.

Baue:
Buttons, Suchfeld, Filter, PartCard, Statusanzeige und Panelgrundform.
Verwende die definierten Farben, Abstände, Schriftgrößen und Fokuszustände.
Verwende Testdaten nur als klar gekennzeichnete Fixtures, nicht als reale Teile.

Nicht ändern:
Datenverträge, Beschaffungslogik, 3D-Engine, Quellenadapter und Dependencies,
sofern eine neue Abhängigkeit nicht vorher freigegeben wurde.

Nachweise:
Tests, Tastaturbedienung, Zustände für loading/empty/error/selected und
Screenshots der tatsächlichen Browseransicht auf Desktop und Mobil.
```

### 15.5 Beispielauftrag für Luna: Exportoberfläche

```text
Bearbeite FF-26. Einkaufspositionen kommen ausschließlich aus dem bereits
geprüften Einkaufslisten-Compiler und dem Serializer.

Baue den Dialog zur Listenprüfung, die Fehlermeldungen, XML-Kopierfunktion,
Dateispeicherung und Hilfe für den manuellen BrickLink-Import.

Erfinde keine IDs, Preise, Lagerbestände oder kompletten Exportergebnisse.
Bei ungeklärten Positionen muss die Oberfläche warnen und darf keinen
vollständigen, korrekten Export vortäuschen.

Liefere Komponenten- und E2E-Tests einschließlich Clipboard-/Downloadfehlern.
```

### 15.6 Gemeinsame Regeln in `AGENTS.md`

Plan und Designreferenz sind maßgeblich. Architekturänderungen brauchen eine kurze dokumentierte Entscheidung. GitHub ist die maßgebliche Repository-Quelle. Regelmäßige Datenänderungen kommen als prüfbarer Pull-Request aus GitHub Actions; keine Bot-Umgehung des Branchschutzes und kein Direktimport nach Produktion. Build und Deployment erfolgen über Cloudflare Workers Builds, nicht aus GitHub Actions. Keine zusätzlichen Features „zur Abrundung“. Keine Ersetzung realer Assets durch generierte Produktbilder. Keine stillen Datenkorrekturen. **Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien.** Keine MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte importieren, verarbeiten oder ausliefern. Unbekannte Rechte bleiben unbekannt. Tests dürfen nicht passend zur Implementierung umdefiniert werden. Vor einer Zusammenführung müssen tatsächliche Testergebnisse und offene Einschränkungen benannt werden.

---

## 16. Release-Checkliste und spätere Ausbaustufen

### 16.1 Öffentliche Freigabe

- [ ] Projektname, Domain und unabhängiges Branding geprüft.
- [ ] Rechte für die konkret veröffentlichten Daten, Assets und Darstellungen geklärt.
- [ ] Nachweis und Attribution zur vom Projektverantwortlichen bestätigten kommerziellen Nutzung der Rebrickable **Catalog Downloads/CSV** im Quellenregister hinterlegt; keine MOC-Dateien, MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte im Import, Build oder Release; Rebrickable API ist in V1 deaktiviert/nicht eingebunden.
- [ ] GitHub-Produktionsbranch ist geschützt; geplante Katalogaktualisierung erstellt nur einen Review-Pull-Request und kann weder Branchschutz umgehen noch direkt deployen.
- [ ] GitHub Actions verwendet minimale Rechte, gepinnte oder kontrollierte Actions und keine Cloudflare-Produktionszugangsdaten.
- [ ] Cloudflare Workers Builds ist mit dem richtigen GitHub-Repository und Produktionsbranch verbunden; Arbeitsbranches/PRs erzeugen Vorschauen, Produktion entsteht nur nach freigegebenem Merge.
- [ ] `wrangler.jsonc`, Cloudflare-Projektname, Buildbefehl, `dist/`, SPA-Fallback und Security-Header stimmen mit dem geprüften Deployment überein.
- [ ] Keine nicht belegten Varianten, erfundenen IDs oder versteckten Platzhalter im öffentlichen Katalog.
- [ ] POC-Abnahme und mindestens ein vollständiger Figuren-/Exportablauf bestanden.
- [ ] Teile-Embeddings vollständig vorab erzeugt; zur Laufzeit nur Query-Embedding, kein Katalog-Neuaufbau.
- [ ] MiniLM-/E5-/Basissuche-Vergleich mit Holdout dokumentiert; Qualitätsentscheidung nach Kapitel 8.7 und ADR vorhanden.
- [ ] Normalizer, Negationen und unbekannte Begriffe geprüft; Modell/Tokenizer/Index/Profile passen zusammen.
- [ ] Genau ein Releaseprofil; reale Downloadgröße, Cacheverhalten und Zielbrowser gemessen; Basissuche als Rückfallweg vorhanden.
- [ ] Keine doppelte Zählung von Torso-/Arm-/Hand- oder Beinbaugruppen.
- [ ] Export auf der tatsächlichen BrickLink-Importseite geprüft; kein Kauf notwendig.
- [ ] Lokale Daten überstehen Versionswechsel; Export/Backup möglich.
- [ ] Mobil-, Tastatur-, Kontrast- und Fehlerzustände geprüft.
- [ ] Produktions-Netzwerkaudit: keine API-Schlüssel, ungewollten Tracker oder überraschenden externen Dienste.
- [ ] Assetgrößen und Anzahl liegen innerhalb der freigegebenen Hostinggrenzen.
- [ ] Anbieterinformationen, Datenschutzhinweise, Credits und Lizenzen enthalten echte Angaben.
- [ ] Kostenrahmen und mögliche Limitüberschreitungen vom Betreiber verstanden.
- [ ] Vorheriges Release und Katalogversion für Rollback verfügbar.

### 16.2 Bedarf validieren

Mit einer kleinen Gruppe von etwa zehn passenden Testpersonen beobachten, ob sie ohne persönliche Anleitung einen Kopf finden, eine Figur kombinieren und eine brauchbare Teileliste erhalten. Das ist eine explorative Produktprüfung, keine repräsentative Marktstudie.

Festhalten: fehlgeschlagene Suchbegriffe, unklare Begriffe, Abbrüche beim Modelldownload, gewünschte aber fehlende Teile, Schwierigkeiten beim Export und erneute freiwillige Nutzung. Diese Beobachtung kann zunächst manuell stattfinden; ein Analytics-Backend ist dafür nicht Voraussetzung.

Als internes Orientierungsziel sollen mindestens acht von zehn Testpersonen den Kernablauf ohne größere Hilfe schaffen. Werden vor allem Downloadzeit oder Datenauswahl bemängelt, zuerst diese Probleme lösen — nicht Accounts oder Monetarisierung ergänzen.

### 16.3 Spätere Ausbaustufen

**P1 nach bestätigtem Nutzen:** mehr kuratierte Teile, bessere semantische Beschreibungen, verbesserte Druckabdeckung, geprüfte Nacken-/Rückenaccessoires und einzelne Gelenkposen. Weiterhin möglichst statisch.

**P2 nur mit eigenem Kosten-/Rechteentscheid:** Accounts, Gerätesynchronisierung, öffentliche Galerie, bezahlte Funktionen oder aktuelle Marktplatzdaten. Diese Funktionen können ein Backend, Moderation, weitere Verträge und zusätzliche Datenschutzarbeit erfordern.

**Nicht automatisch einplanen:** eigener Checkout, vollständige BrickLink-Katalogspiegelung, Fotoanalyse und generatives Erfinden neuer Bauteile. Sie verändern das Produkt und seine Rechts-/Kostenstruktur erheblich.

### 16.4 Definition of Done des MVP

> Ein Nutzer kann echte freigegebene Teile mit eigenen Worten finden, eine technisch unterstützte Figur in der gewählten Designoberfläche zusammenstellen, lokal speichern und eine nach Artikel, Farbe und Menge korrekte BrickLink-Teileliste erhalten. Die App benötigt dafür kein eigenes Anwendungsbackend, zeigt Einschränkungen ehrlich und veröffentlicht nur geklärte Daten und Assets.

---

## 17. Quellen und Verifikationsstatus

Die folgenden Quellen wurden für die technischen und rechtlichen Randbedingungen herangezogen. **Konkrete Funktionsziele, Budgets, Arbeitspakete und Designwerte sind unsere Planung**, nicht Aussagen der Quellen. Quellenbedingungen und Softwareversionen sind vor ihrer tatsächlichen Verwendung erneut zu prüfen.

| Ref. | Primärquelle | Verwendungszweck / Status |
|---|---|---|
| <a id="s01"></a>S01 | [Three.js: LDrawLoader](https://threejs.org/docs/pages/LDrawLoader.html) | Verifiziert: Addon, LDraw-Laden, unterstützte Metadaten und Bündelungshinweis. Kein Nachweis vollständiger Minifiguren-Kompatibilität. |
| <a id="s02"></a>S02 | [Three.js: LICENSE](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE) | Verifiziert: MIT-Lizenz. Bei Umsetzung konkrete Releaseversion fixieren. |
| <a id="s03"></a>S03 | [Rebrickable: Downloads](https://rebrickable.com/downloads/) und [API-Dokumentation](https://rebrickable.com/api/v3/docs/) | **Projektstatus v1.2:** Die bestätigte kommerzielle Nutzbarkeit wird ausschließlich auf **Catalog Downloads/CSV** bezogen. Nur diese Daten sind die V1-Rebrickable-Katalogquelle; keine MOC-Dateien, MOC-Anleitungen oder sonstigen nutzergenerierten MOC-Inhalte. Nachweis und Attribution ablegen. Die API wird in V1 nicht verwendet. Eine kommerzielle API-Nutzbarkeit wird nicht aus der Download-Freigabe abgeleitet und muss vor einem späteren API-Einsatz separat geprüft bzw. freigegeben werden. |
| <a id="s04"></a>S04 | [buildinginstructions.js: Repository](https://github.com/LasseD/buildinginstructions.js) und [LICENSE](https://github.com/LasseD/buildinginstructions.js/blob/master/LICENSE) | Verifiziert: Browser-LDraw-Darstellung; Projektcode Unlicense, andere Bestandteile separat lizenziert. |
| <a id="s05"></a>S05 | [Transformers.js: WebGPU-Leitfaden](https://huggingface.co/docs/transformers.js/guides/webgpu) | Verifiziert: Browser-Inferenz und Backendauswahl. Konkrete Browserleistung ist zu messen. |
| <a id="s06"></a>S06 | [Sentence Transformers: mehrsprachiges MiniLM](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Nachweis aus v1.0; in v1.1 kein primärer Testkandidat mehr. Keine Suchqualitätsgarantie für diesen Katalog. |
| <a id="s07"></a>S07 | [Xenova: ONNX-Dateien des Kandidaten](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/tree/main/onnx) | Verifiziert: unter anderem rund 118 MB für quantisierte ONNX-Datei; konkrete Revision/Hashes im Build festhalten. |
| <a id="s08"></a>S08 | [Transformers.js: Environment und Caches, v3.8.1](https://huggingface.co/docs/transformers.js/v3.8.1/en/api/env) | Verifiziert: konfigurierbare Modellpfade und Cachemechanismen. Segmentadapter bleibt eigene zu testende Implementierung. |
| <a id="s09"></a>S09 | [Cloudflare Workers: Static Assets](https://developers.cloudflare.com/workers/static-assets/) und [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) | Am 27.09.2026 erneut abgerufen: statische Assets können gemeinsam mit dem Worker deployt werden; derzeit 25 MiB pro einzelner Datei und 20.000 statische Dateien pro Worker-Version im Free-Plan. Keine dauerhafte Preis-/Verfügbarkeitsgarantie. |
| <a id="s10"></a>S10 | [LEGO: Fair Play](https://www.lego.com/en-us/legal/notices-and-policies/fair-play) | Verifiziert: begrenzte Fan-/Referenzregeln und Grenzen des Disclaimers; keine pauschale kommerzielle Freigabe. |
| <a id="s11"></a>S11 | [§ 23 MarkenG](https://www.gesetze-im-internet.de/markeng/__23.html) | Verifiziert: gesetzlicher Rahmen bestimmter referenzieller Markennutzungen; Anwendung auf das konkrete Produkt offen. |
| <a id="s12"></a>S12 | [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Verifiziert: Standard als Grundlage der Accessibility-Ziele. |
| <a id="s13"></a>S13 | [Manrope: OFL](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) | Verifiziert: SIL Open Font License 1.1. |
| <a id="s14"></a>S14 | [Kalam: OFL](https://github.com/google/fonts/blob/main/ofl/kalam/OFL.txt) | Verifiziert: SIL Open Font License 1.1. |
| <a id="s15"></a>S15 | [LDraw: Legal Info](https://www.ldraw.org/legal-info) | Verifiziert: Bibliotheksrechte, Attribution und Rendering-Policy; jeweilige Dateilizenz zusätzlich prüfen. |
| <a id="s16"></a>S16 | [BrickLink: Wanted List, Mass Upload](https://www.bricklink.com/help.asp?helpID=207) | Verifiziert: XML-Struktur und Importweg. Seite weist auf mögliche Unvollständigkeit hin; praktischer Importtest ist deshalb Pflicht. |
| <a id="s17"></a>S17 | [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html) | Verifiziert: Prüfung der Anbieterinformationen. |
| <a id="s18"></a>S18 | [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html) | Verifiziert: Bedingungen zu Speicherung/Zugriff auf Endgeräten; gesetzlicher URL-Pfad verwendet weiterhin `ttdsg`. |
| <a id="s19"></a>S19 | [OpenAI: Modellübersicht](https://developers.openai.com/api/docs/models) | Verifiziert: aktuelle Einordnung von GPT-6 Sol und GPT-6 Luna. Projektaufteilung und Reviewregeln sind unsere Empfehlung. |
| <a id="s20"></a>S20 | [Xenova/all-MiniLM-L6-v2: ONNX-Dateien](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx) | Am 27.09.2026 erneut abgerufen: INT8-/quantisierte Dateien rund 23 MB. Es wird genau eine Variante gewählt, nicht das gesamte Repository. |
| <a id="s21"></a>S21 | [MiniLM: Original-Modellkarte](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/raw/main/README.md) und [Browserexport-Dateien](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main) | Am 27.09.2026 abgerufen: Englisch-Kennzeichnung, Apache-2.0, 384 Dimensionen und Pooling; Tokenizer rund 712 kB. Der deutsche Begriffs-Layer ist unsere zu testende Ergänzung. |
| <a id="s22"></a>S22 | [E5-small: Original-Modellkarte](https://huggingface.co/intfloat/multilingual-e5-small/raw/main/README.md) | Am 27.09.2026 abgerufen: MIT, Mehrsprachigkeit einschließlich Deutsch/Englisch, 384 Dimensionen, `query: `/`passage: `, maskiertes Pooling und Normalisierung. Keine Aussage über unsere gemessene Suchqualität. |
| <a id="s23"></a>S23 | [Xenova/E5-small: ONNX-Dateien](https://huggingface.co/Xenova/multilingual-e5-small/tree/main/onnx) und [Tokenizer/Dateien](https://huggingface.co/Xenova/multilingual-e5-small/tree/main) | Am 27.09.2026 abgerufen: INT8/quantisiert rund 118 MB, `tokenizer.json` rund 17,1 MB; etwa 135 MB sind nur die Summe dieser Dateien, nicht der komplette Laufzeitdownload. |
| <a id="s24"></a>S24 | [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Git-Integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) und [CI/CD-Übersicht](https://developers.cloudflare.com/workers/ci-cd/) | Am 27.09.2026 abgerufen: Workers Builds verbindet GitHub mit Cloudflare und automatisiert Build/Deployment bei Push; Nicht-Produktionsbranches können Vorschauen erhalten. Für FigForge bleibt GitHub Actions auf Datenrefresh und CI beschränkt. |

**Designquelle:** das in dieser Unterhaltung ausgewählte und weiterentwickelte Mockup. Es liegt diesem Paket als `assets/figforge-design-reference.png` bei. Es dient ausschließlich als Gestaltungsreferenz, nicht als Beleg für reale Teile oder freigegebene Produktdarstellungen.

**Offene Nachweise vor Umsetzung beziehungsweise Veröffentlichung:** Ablage des einschlägigen Nachweises zur bestätigten kommerziellen Nutzung der Rebrickable **Catalog Downloads/CSV** und Prüfung der tatsächlichen CSV-Felder, konkrete Asset-/Mappingabdeckung, ausgewählte Modell-/Paketrevisionen, Such-Holdout samt Profilentscheidung, physische Kompatibilität repräsentativer Kombinationen, Marken-/Darstellungsfreigabe, GitHub-Actions-/Branchschutzprüfung sowie reale Cloudflare-/Browsermessungen. Die Rebrickable API und sämtliche MOC-Dateien bleiben außerhalb des MVP; ihre Bedingungen werden erst bei einem späteren, getrennt freizugebenden Vorhaben geprüft.
