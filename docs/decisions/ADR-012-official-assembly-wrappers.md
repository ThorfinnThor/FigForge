# ADR-012: Offizielle LDraw-Baugruppenwrapper für ältere Einzelteilnummern

- Status: angenommen
- Datum: 2026-10-01

## Kontext

Ein Teil älterer Rebrickable-Katalognummern bezeichnet nur einen bedruckten Torso- oder Beinkörper. Die offizielle LDraw-Bibliothek enthält dafür zusätzlich vollständige, standardkonforme Oberkörper- beziehungsweise Hüfte-und-Beine-Shortcuts. Ohne diese Wrapper kann der FigForge-Builder das belegte Druckteil nicht in seinem Baugruppen-Slot darstellen.

## Entscheidung

FigForge darf einen offiziellen vollständigen LDraw-Shortcut als Wrapper verwenden, wenn er das eindeutig zugeordnete Einzelteil direkt referenziert und genau ein solcher vollständiger Wrapper existiert. Für Oberkörper gilt dies nur für bedruckte `973p…`-Körper, für Beine nur für als Baugruppe nummerierte und benannte `970c…pr…`-Einträge. Mehrere Wrapper, einzelne Arme/Hände/Beine sowie inkompatible Sonderkörper bleiben gesperrt.

Die Zuordnung wird als `official-assembly-wrapper` mit der referenzierten Einzelteildatei protokolliert. Es werden ausschließlich der gesperrte Rebrickable-CSV-Katalog und die gepinnte offizielle LDraw-Bibliothek verwendet; keine API, keine MOC-Dateien und keine unscharfe Namenssuche.

## Folgen

Ältere Druckteile können mit den von LDraw belegten Armen, Händen oder Gegenbeinen dargestellt werden. Varianten mit widersprüchlichen offiziellen Wrappern werden nicht geraten. Ein Wrapper ist eine digitale Builder-Darstellung und keine Aussage, dass das Rebrickable-Einzelteil als komplette Baugruppe verkauft wird.
