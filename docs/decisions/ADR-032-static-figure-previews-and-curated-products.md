# ADR-032: Statische Figuren-Vorschauen und kuratierte Produktempfehlungen

**Status:** akzeptiert  
**Datum:** 2026-10-16

## Kontext

Die Ideen-Seite zeigte bisher fünf einzelne Teilbilder statt der fertigen Figur.
Eine zusätzliche interaktive WebGL-Szene pro Karte würde auf mobilen Geräten
Speicher, GPU-Zeit und LDraw-Ladevorgänge vervielfachen. Gleichzeitig sollen
Themenwelten passende LEGO Sets und optionales Sammlungszubehör zeigen, ohne
unbelegte Preis- oder Verfügbarkeitsaussagen zu treffen.

## Entscheidung

Die zwölf kuratierten Starterfiguren erhalten je ein vorab generiertes
WebP-Vorschaubild. `tools/build-figure-preview-thumbnails.ts` setzt dafür nur
die bereits versionierten offiziellen LDraw-Modelle und ihre geprüften
FigForge-Platzierungstransformationen zusammen. Die erzeugten Dateien werden
unter `public/assets/figure-previews` versioniert und auf der Ideen-Seite als
normale, lazy geladene Bilder angezeigt. Der Builder bleibt die einzige
interaktive 3D-Ansicht einer Starterfigur.

Produktempfehlungen werden in einer kleinen, versionierten Kurationsliste
geführt. Jede Setempfehlung enthält eine Setnummer, einen Themenbezug, einen
offiziellen LEGO-Link und einen Amazon-Suchbegriff oder eine belegte ASIN.
Amazon-Links werden ausschließlich über die validierte öffentliche
Affiliate-Konfiguration erzeugt. Die Oberfläche zeigt weder Preise noch eine
behauptete Verfügbarkeit und kennzeichnet Affiliate-Links als Anzeige.

Der neue Navigationspunkt `/sets` bündelt Sets und Zubehör. Auf einer
gefilterten Ideenwelt werden nur die zu dieser Welt passenden Sets gezeigt.

Beim Speichern einer frei gebauten Figur rendert der bereits aktive Builder-
WebGL-Controller einmalig einen komprimierten lokalen Snapshot. Der Snapshot
wird optional im bestehenden Collection-Datensatz gespeichert; es wird kein
zusätzlicher WebGL-Kontext pro Collection-Karte erzeugt. Alte Datensätze ohne
Snapshot werden beim nächsten Öffnen der Collection im Browser-Leerlauf
sequenziell migriert. Dafür wird genau ein temporärer Controller für alle
fehlenden Bilder wiederverwendet und anschließend freigegeben.

Ideas und Collection verwenden dieselbe React-Komponente `FigurePreviewCard`.
Teilebilder bleiben ausschließlich im Teilekatalog erhalten.

## Folgen

- Die Ideen-Seite benötigt pro Karte kein WebGL und lädt auf Mobilgeräten
  wesentlich weniger Geometrie.
- Änderungen an Starterfiguren erfordern ein erneutes Ausführen von
  `npm run assets:figure-previews` und die Prüfung der generierten Bilder.
- Kuratierte Produkte können veralten und müssen anhand offizieller
  Produktseiten überprüft werden; Preise und Lagerstatus bleiben bewusst
  außerhalb des Datenmodells.
- Neue und migrierte Collection-Einträge zeigen die vollständige Figur, ohne
  für jede Karte einen eigenen WebGL-Kontext zu laden.
