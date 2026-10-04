# ADR-021: Ehrlicher Suchergebnisvertrag

**Status:** angenommen
**Datum:** 2026-10-03

## Kontext

Die semantische Suche lieferte bislang jeden der bis zu 400 nächstgelegenen
Vektortreffer aus. Dadurch zeigte die Oberfläche auch bei einer nicht erfüllbaren
oder unbekannten Anfrage Teile als „passend“ an. Ein hoher Kosinuswert allein ist
jedoch kein Beleg für einen direkten Treffer: In den menschlich bewerteten
Development- und Holdout-Daten überlappen sich die Werte unpassender,
akzeptabler und sehr passender Kandidaten.

## Entscheidung

Die Suche unterscheidet verbindlich drei Ergebnisse: `direct`, `suggestions` und
`none`. Ein direkter Treffer benötigt eine exakte Teilenummer oder vollständige,
bekannte lexikalische Evidenz ohne unbekannte Suchbegriffe. Rein semantische
Treffer werden unabhängig von ihrer Höhe nur als Vorschläge bezeichnet.

Semantische Kandidaten unter 0,42 werden verworfen. Dieser Grenzwert wurde nur
auf dem menschlich bewerteten Development-Satz gewählt: Für Relevanzstufen 1
oder 2 erreicht er dort 94,7 % Recall bei 71,7 % Precision. Die anschließende
einmalige Prüfung des Holdouts ergab 78,6 % Recall bei 66,7 % Precision. Die
verbleibenden Fehlkandidaten begründen ausdrücklich die Bezeichnung
„Vorschläge“ statt „Treffer“.

Von den verbleibenden semantischen Vorschlägen werden höchstens die drei
stärksten angezeigt. Direkte Treffer werden nicht abgeschnitten. In der
bewerteten Stichprobe steigt die Präzision der Vorschlagsliste dadurch von
71,7 % auf 83,9 % im Development-Satz und von 66,7 % auf 88,9 % im Holdout;
die Holdout-Stichprobe enthält dabei sechs Anfragen mit mindestens einem
Vorschlag und bleibt daher ein kleines, nicht endgültiges Qualitätssignal.

Freitext, für den die Basissuche keinerlei bekannte lexikalische Evidenz hat,
liefert nicht länger den ungefilterten Gesamtkatalog. Ohne ausreichend starken
Semantiktreffer ist das Ergebnis `none`.

## Folgen

- Die Oberfläche behauptet bei semantischer Ähnlichkeit keine sichere
  Übereinstimmung mehr.
- Unbekannte Begriffe funktionieren nach Laden des lokalen Suchmodells weiter,
  erscheinen aber als ähnliche Vorschläge.
- Der Grenzwert ist an das versionierte Profil `compact-minilm` gebunden und muss
  bei einem Modell- oder Dokumentprofilwechsel neu kalibriert werden.
- Die Grenze beweist nicht, dass ein vorgeschlagenes Teil die Anfrage erfüllt;
  sie entfernt nur schwächere semantische Geräusche.
