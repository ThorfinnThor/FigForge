# ADR-008: Standardbaugruppen aus Rebrickable-Farbcodes zusammensetzen

- Status: vorgeschlagen
- Datum: 2026-09-29
- Tickets: FF-05, FF-16

## Kontext

Rebrickable führt komplette Torsos als `973cNNhMM` (Torso mit Armen `NN` und Händen `MM`) und komplette Beine als `970cNN` (Hüfte mit Beinen `NN`). LDraw modelliert Geometrie farbneutral und hat für die unbedruckten Farbkombinationen keine eigene Datei. Deshalb standen 100 einfarbige Standardtorsos und 65 Standardbeine auf „keine offizielle Zuordnung“, obwohl ihre Geometrie aus offiziellen Einzelteilen (`973`, `3818`, `3819`, `3820`, `3815b`, `3816c`, `3817c`) vollständig vorliegt. Bei zehn bedruckten Torsos liefert LDraw nur den Torso-Druck ohne Arme.

## Entscheidung

Eine Standardbaugruppe wird aus offiziellen LDraw-Teilen zusammengesetzt, wenn alle folgenden Belege vorliegen:

1. **Codetabelle.** Ein Farbcode gilt nur, wenn alle unbedruckten Grundbaugruppen (`973cNNhMM`, `970cNN`), deren Name der festen Form „Torso, A Arms, H Hands“, „Torso, A Arms and Hands“ oder „Hips and L Legs“ folgt, für diesen Code denselben Farbnamen nennen und dieser Farbname im gesperrten Rebrickable-Katalog genau einen RGB-Wert hat. Widersprüche oder unbekannte Farben sperren den Code.
2. **Eintragsbestätigung.** Der Name des einzelnen Eintrags muss dieselben Farben selbst nennen („, White Arms, Yellow Hands“ bzw. „Hips and White Legs“). Ein zweiter, abweichender Arm- oder Beinhinweis sperrt den Eintrag.
3. **Geometrie.** Unbedruckte Baugruppen werden nur zusammengesetzt, wenn keine offizielle LDraw-Datei die Nummer beansprucht. Bedruckte Torsos brauchen genau eine offizielle Torso-Druckdatei (`973p…`, Typ `Part`). Bedruckte Beine werden nicht zusammengesetzt.
4. **Platzierung.** Die Lage von Armen, Händen und Beinen wird aus den offiziellen Shortcuts derselben Familie abgeleitet. Mindestens 90 % dieser Shortcuts müssen exakt dieselbe Lage verwenden, sonst bricht der Build ab.

Torso- und Hüftkörper behalten die bisherige Katalogfarbe. Arme, Hände und Beine erhalten die Farbe aus Code und Name. Die abgeleitete Tabelle, nicht aufgelöste Codes und die Shortcut-Übereinstimmung werden in `data/generated/ldraw-expanded-catalog.json` ausgegeben; der Validator leitet die Tabelle unabhängig aus dem gesperrten Katalog neu ab und vergleicht.

## Konsequenzen

- Rund 165 unbedruckte Standardbaugruppen und bis zu zehn bedruckte Torsos mit offiziellem Druck werden ohne Raten freigeschaltet.
- Rebrickable-Namen werden nur über feste, verankerte Muster gelesen, nicht unscharf verglichen. Einzelne fehlerhafte Rebrickable-Namen bleiben gesperrt.
- Bedruckte Varianten ohne offizielle Druckdatei bleiben gesperrt. Ob sie später unbedruckt angezeigt werden, ist eine eigene Produktentscheidung.
- `mappingEvidence` erhält den Wert `rebrickable-assembly-code`; jeder solche Eintrag trägt seine Zusammensetzung in `assemblyComposition`.
- Weiterhin keine Rebrickable-API, keine MOC-Dateien und keine Aussage über physische Passform.
