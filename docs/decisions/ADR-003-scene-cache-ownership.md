# ADR-003: Scene-Cache und Ressourcen-Eigentümerschaft

- Status: angenommen
- Datum: 2026-09-27
- Ticket: FF-15

## Entscheidung

Der `FigureSceneController` besitzt einen sitzungsgebundenen `CachingScenePartLoader`. Der Cache lädt je Assetschlüssel genau einen privaten Prototyp. Jede Slot-Anfrage erhält daraus einen tiefen Objektklon mit eigenen Geometrien, Materialien und Texturen. Ein Slot darf deshalb seine Instanz freigeben, ohne andere Slots oder den Cacheprototyp zu beschädigen.

Ein abgebrochener Aufrufer beendet nur sein eigenes Warten und nicht einen parallel genutzten Prototyp-Load. Fehlerhafte Loads werden aus dem Cache entfernt und können erneut versucht werden. Beim Abbau des Controllers werden laufende Loads abgebrochen, aktuelle Slotinstanzen freigegeben, Cacheprototypen freigegeben und spät eintreffende Ergebnisse verworfen und entsorgt.

## Konsequenzen

- Geteilte Netzwerk-/Parse-Arbeit ist möglich, ohne GPU-Ressourcen zwischen Slotinstanzen unsicher zu teilen.
- Geometrien, Materialien und Texturen benötigen pro sichtbarer Instanz zusätzlichen Speicher; Sicherheit und eindeutiges Dispose-Eigentum haben im MVP Vorrang vor maximalem GPU-Sharing.
- Der Cache lebt nur so lange wie die Szene. Es gibt keinen persistenten Browsercache und keine neue Datenquelle.
- Der Tausch bleibt transaktional: Erst ein vollständig geladenes und geklontes Teil ersetzt die vorige Slotinstanz.
- Fehler und WebGL-Kontextverlust bleiben sichtbar und bieten eine explizite Wiederherstellungsaktion.
