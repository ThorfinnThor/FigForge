# ADR-041: Google Analytics nur mit Einwilligung

**Status:** akzeptiert (Mess-ID `G-TVW22LH1SJ` eingetragen; wirksam ab dem Merge)  
**Datum:** 2026-10-21

## Kontext

FigForge setzte keine Cookies und lud nichts von Dritten (Datenschutzerklärung,
Content-Security-Policy `'self'`). Der Eigentümer will Google Analytics 4
einsetzen. Dafür braucht es eine Einwilligung vor jeder Anfrage an Google
(Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG), einen Widerruf zu jeder Zeit,
angepasste Texte und eine geöffnete Sicherheitsrichtlinie.

## Entscheidung

- **Schalter:** `src/consent/measurement-id.ts` hält die Mess-ID (`G-…`).
  Ist sie leer oder ungültig, bleibt alles aus: kein Banner, kein Menüeintrag,
  kein Google-Skript, unveränderter Datenschutztext. `VITE_GA_MEASUREMENT_ID`
  überschreibt sie beim Bauen (nur die Browser-Tests nutzen das).
- **Einwilligung:** Beim ersten Besuch fragt ein Hinweis; „Erlauben“ und
  „Ablehnen“ sind gleichwertig gestaltet, der Hinweis nimmt keinen Fokus. Die
  Entscheidung steht lokal in `localStorage` (`figforge-consent-v1`, mit Datum;
  nach einem Jahr wird neu gefragt). Fehlt der Speicher, wird bei jedem Besuch
  gefragt. Unter „Mehr → Cookie-Einstellungen“ lässt sie sich ändern.
- **Laden:** Vor „Erlauben“ wird nichts von Google angefragt. Danach setzt
  `src/consent/analytics.ts` Consent Mode v2 (alles `denied`, dann nur
  `analytics_storage: granted`), konfiguriert ohne Google-Signale und
  Werbepersonalisierung und fügt das Skript als Element ein (kein Inline-Skript).
- **Widerruf:** Das Messen stoppt sofort (`ga-disable-<ID>`, Einwilligung
  `denied`), die Cookies `_ga`, `_ga_*`, `_gid`, `_gat*` werden entfernt.
- **Sicherheitsrichtlinie** (`public/_headers`): zusätzlich
  `https://*.googletagmanager.com` für Skripte, `https://*.google-analytics.com`,
  `https://*.analytics.google.com` und `https://*.googletagmanager.com` für
  Verbindungen, `https://*.google-analytics.com` und
  `https://*.googletagmanager.com` für Bilder. Kein `unsafe-inline`.
- **Datenschutzerklärung:** `privacySections(language, analytics)` liefert mit
  Mess-ID die Fassung mit Abschnitt „Google Analytics“, geänderter Kurzfassung
  und Cookie-Abschnitt, Hinweis zur lokalen Entscheidung und Widerruf; ohne
  Mess-ID die bisherige Fassung. Der Nachbau liest dieselbe Variable und
  schreibt den passenden Text ins statische HTML.

## Folgen

- Die Sicherheitsrichtlinie ist ab dem Merge geöffnet, auch solange keine
  Mess-ID gesetzt ist; ohne ID lädt aber nichts davon.
- Im Browser-Test sind Anfragen an Google abgefangen und gezählt; er prüft
  Fragen, Ablehnen, Erlauben und Widerruf.
- Vor der Aktivierung muss der Eigentümer im Analytics-Konto die
  Datenverarbeitungsbedingungen akzeptieren und die Speicherdauer einstellen;
  die Schritte stehen in `docs/legal/google-cookies-vorbereitung.md`.
- Der Text nennt eine Speicherdauer von höchstens 14 Monaten; die Einstellung
  im Konto muss dazu passen.
