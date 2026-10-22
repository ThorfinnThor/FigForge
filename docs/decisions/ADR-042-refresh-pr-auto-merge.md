# ADR-042: Refresh-Pull-Requests mergen sich nach grüner Prüfung selbst

**Status:** akzeptiert (ausdrückliche Entscheidung des Eigentümers, 2026-10-22)  
**Datum:** 2026-10-22

## Kontext

Der wöchentliche Katalog-Refresh (`refresh-catalog.yml`) legte bisher einen
Review-Pull-Request an, den der Eigentümer von Hand mergen musste. Der
Eigentümer hält das für unnötig: Der Lauf prüft die Daten selbst, und
`main` verlangt ein grünes `verify` mit aktuellem Branch. Die ursprüngliche
Betriebsentscheidung in `docs/implementation-plan.md` (Review-Pull-Request, kein
ungeprüfter Direktimport) wird dadurch in einem Punkt gelockert: Der Review
durch einen Menschen entfällt, die Pflichtprüfungen bleiben.

## Entscheidung

- Nach dem Anlegen oder Aktualisieren des Pull-Requests schaltet der Workflow
  Auto-Merge ein (`gh pr merge --auto --merge`), **nur wenn** `npm run verify`
  im Lauf erfolgreich war und `REFRESH_PR_TOKEN` gesetzt ist.
- Gemergt wird erst, wenn die Pflichtprüfungen des Branchschutzes auf dem
  Pull-Request grün sind (`verify`, Branch aktuell). Der Branchschutz bleibt
  unverändert und gilt weiter auch für Administratoren.
- Ein fehlgeschlagener Lauf legt wie bisher einen **Entwurf** an und ruft kein
  Auto-Merge auf. War der bestehende Pull-Request ein Entwurf und der neue Lauf
  ist grün, wird er zur Prüfung freigegeben und dann zum Auto-Merge vorgemerkt.
- Das Deployment bleibt bei Cloudflare Workers Builds nach dem Merge. Es gibt
  keinen Produktionszugang in GitHub Actions.
- Voraussetzung im Repository: Einstellung „Allow auto-merge“ ist an.

## Folgen

- Neue Katalogdaten erreichen Produktion ohne menschliche Durchsicht. Die
  Absicherung sind die Validatoren in `verify` (Schema, Hashes, Quellenregel,
  Namensabgleich, Abdeckung, Crosswalk) und die Browser-Regressionen.
- Wenn `main` zwischen Lauf und Ende der Prüfung weiterzieht, steht der
  Pull-Request als „veraltet“ und merged nicht. Dann `gh pr update-branch <nr>`
  oder den nächsten Lauf abwarten (er baut auf aktuellem `main` neu).
- Zum Zurücknehmen den Schritt „Merge the review pull request automatically“ im
  Workflow entfernen.
