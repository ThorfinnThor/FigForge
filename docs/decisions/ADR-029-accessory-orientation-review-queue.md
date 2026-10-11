# ADR-029: Mehransichten-Review für Zubehör-Ausrichtung

## Status

Akzeptiert — 2026-10-11

## Kontext

Der digitale LDraw-Check kann Kollisionsfreiheit, Griffkandidaten und einen reproduzierbaren Transformationskandidaten prüfen. Er kann jedoch nicht zuverlässig entscheiden, ob ein langes oder asymmetrisches Zubehörteil in der sichtbaren Dreiviertel-, Vorder- und Rückansicht plausibel ausgerichtet ist. Ein kollisionsfreier Lauf ist deshalb kein Beleg für die richtige Handhaltung.

## Entscheidung

Für alle aktuell digital verbundenen Handzubehörteile wird aus den generierten Laufzeit- und Validierungsdaten eine nicht veröffentlichbare Review-Warteschlange erzeugt. Jeder Eintrag enthält die drei verbindlichen Ansichten, den verwendeten Transformationskandidaten, die digitale Evidenz und Risikomarker wie nicht standardmäßige Orientierung, große Ausdehnung oder mehrere Griffkandidaten. Ein reproduzierbarer Prioritätswert sortiert Fälle mit mehreren Griffkandidaten zuerst, danach ungewöhnliche Rotation und große Ausdehnung. Alle Einträge bleiben bis zur dokumentierten Sichtprüfung im Status `pending-human-visual-review`.

Die Warteschlange ergänzt die bestehenden Clearance- und Semantic-Grip-Prüfungen. Sie aktiviert keine zusätzlichen Teile automatisch und ersetzt keine physische Passformprüfung.

## Konsequenzen

- Fehlpositionierungen können systematisch nach Teilnummer und Ansicht abgearbeitet werden.
- Ein bestandener Geometriecheck wird in der UI und in der Dokumentation nicht mit einer visuellen Bestätigung verwechselt.
- Eine spätere menschliche Entscheidung kann reproduzierbar auf genau den geprüften Laufzeitstand zurückgeführt werden.
- Bis zur Sichtprüfung bleiben die bestehenden 321 Zubehörteile digital verbunden; die Warteschlange ist die nächste Freigabestufe, keine automatische Freigabe.
