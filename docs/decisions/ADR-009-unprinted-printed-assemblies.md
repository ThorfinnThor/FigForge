# ADR-009: Bedruckte Standardbaugruppen ohne LDraw-Druck unbedruckt anbieten

- Status: angenommen
- Datum: 2026-09-30
- Entscheidung durch: Projektverantwortlicher („mit Hinweis“ freischalten)
- Tickets: FF-05, FF-16; erweitert ADR-008

## Kontext

Rebrickable führt rund 6.800 bedruckte Torsos (`973cNNhMMprXXXX`) und 2.800 bedruckte Beine (`970cNNprXXXX`), für die keine offizielle LDraw-Datei den Aufdruck enthält. Ohne diese Teile fehlen im Builder fast alle Figuren aus Themenwelten. Einen fehlenden Aufdruck aus Bildern nachzubauen ist nach AGENTS.md ausgeschlossen.

## Entscheidung

Eine bedruckte Standardbaugruppe wird nach den Regeln aus ADR-008 zusammengesetzt, wenn keine offizielle LDraw-Datei ihre Nummer nennt:

1. Farbcode und Eintragsname müssen Arm-, Hand- bzw. Beinfarbe wie in ADR-008 bestätigen. Nennt der Name einen zweiten Arm- oder Beinhinweis (etwa bedruckte Arme), bleibt der Eintrag gesperrt.
2. Torso- bzw. Hüftkörper ist das unbedruckte offizielle Teil (`973`, `3815b`) in der ersten Katalogfarbe. Fehlt eine Katalogfarbe, bleibt der Eintrag gesperrt; es wird kein neutrales Grau verwendet.
3. Der Eintrag trägt `geometryFallback.kind = "unprinted-assembly-code"`. Die Oberfläche zeigt dafür wie bei den Druckeltern-Fallbacks den Hinweis „Geometrie ohne Druck“.
4. Einträge mit derselben Farbkombination teilen ein erzeugtes Modell und ein Vorschaubild.
5. Die Zusammensetzungsbelege stehen in `data/generated/ldraw-assembly-compositions.json`, damit das Browser-Bundle sie nicht mitlädt.

Sobald eine spätere offizielle LDraw-Version eine Datei für die Nummer liefert, greift automatisch die direkte Zuordnung mit echtem Aufdruck.

## Konsequenzen

- Rund 6.700 weitere Torsos und Beine sind im Builder wählbar, sichtbar als unbedruckt markiert.
- Das Haupt-Bundle wächst, weil der erweiterte Katalog vollständig eingebunden wird. Weitere große Freischaltungen brauchen vorher ein nachgeladenes Katalogformat.
- Weiterhin keine Rebrickable-API, keine MOC-Dateien, keine Bilder und keine Aussage über physische Passform.
