# ADR-046: Markenname „Create Your Minifig“

**Status:** akzeptiert (Entscheidung des Eigentümers, 2026-10-22)  
**Datum:** 2026-10-22

## Kontext

Die Seite läuft unter createyourminifig.com, zeigte aber überall den Namen
„FigForge“ (Kopfzeile, Titel, Texte, Vorschaubilder, strukturierte Daten).

## Entscheidung

- Der sichtbare Name ist **Create Your Minifig** (Kopfzeile als zweifarbiger
  Schriftzug „Create Your“ weiß, „Minifig“ gelb). Das gilt für Titel, Texte,
  Rechtstexte, Ratgeber, Open Graph (`og:site_name`, `og:image` mit neuem Bild),
  JSON-LD, `llms.txt`, 404-Seite, Web-App-Manifest (Kurzname „Minifig“) und
  Download-Dateinamen (`minifig-…`).
- **Bleibt „FigForge“ (interner Projektname):** Code, Repository, Paketname,
  Dateiformat-Kennungen (`figforge-figure`), Speicherschlüssel (`figforge`
  IndexedDB, `figforge-consent-v1`), Freigabelinks (`#figforge=`), Cache-Namen,
  Amazon-Tracking-ID `figforge-21` und generierte LDraw-Dateien. Eine Umbenennung
  würde gespeicherte Entwürfe, Einwilligungen und geteilte Links ungültig machen.
- Die Websiteangaben nennen „FigForge“ noch als `alternateName`, damit Suchmaschinen
  den Namenswechsel zuordnen.

## Folgen

- Seitentitel sind durch das längere Suffix („ | Create Your Minifig“) etwas
  länger; bei sehr langen Ratgebertiteln kann Google sie kürzen.
- Die Demo-Videos, die Texte in Reddit-Beiträgen und der Name in Konten
  (Google Analytics, Rakuten, Search Console) tragen noch „FigForge“ und müssen
  bei Bedarf einzeln angepasst werden.
