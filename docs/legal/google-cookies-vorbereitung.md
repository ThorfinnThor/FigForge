# Google Analytics: Stand und Aktivierung

**Stand 2026-10-21: gebaut (ADR-041), aber ausgeschaltet.** Banner, Widerruf, Laden nach Einwilligung, Sicherheitsrichtlinie, Datenschutztext und Tests sind fertig und bleiben aus, solange `DEFAULT_MEASUREMENT_ID` in `src/consent/measurement-id.ts` leer ist. Mit einer Mess-ID schaltet alles gemeinsam um. Die folgenden Abschnitte beschreiben, was dafür gebaut wurde und was der Eigentümer vorher tun muss (Abschnitt 6).

Ursprünglicher Plan (Stand 2026-10-21 vor dem Bau): Die Datenschutzerklärung (`/privacy`) sagt heute: keine Cookies, nichts von Dritten, und im Abschnitt „4. Cookies und Dienste von Dritten“ versprechen wir, vor einem solchen Dienst die Einwilligung einzuholen und die Erklärung zu ergänzen. Dieses Dokument legt fest, was dafür gebaut werden muss. **Gebaut ist davon noch nichts.**

## 1. Erst entscheiden: welcher Google-Dienst?

| Dienst | Was er tut | Folgen |
| --- | --- | --- |
| **Google Analytics 4** | Reichweitenmessung, setzt Cookies | Einwilligung nötig. Der häufigste Fall und der Rahmen dieses Dokuments. |
| **Google Tag Manager** | lädt andere Skripte nach | Für sich allein kein Cookie, aber er lädt nach der Einwilligung die eigentlichen Dienste; eine Einwilligungsverwaltung (siehe 2) wird zwingend. |
| **Google AdSense / Ads** | Werbung | Aufwändiger: Für Besucher im EWR verlangt Google eine zertifizierte Einwilligungsverwaltung (IAB TCF) und weitere Hinweise. Eigene Entscheidung. |
| **Search Console** | Auswertung in Googles Suche | **Kein Code auf der Seite**, keine Cookies, kein Eintrag nötig (nur Sitemap und Eigentümernachweis). |

## 2. Was gebaut werden muss

1. **Einwilligung vor dem Laden.** Kein Google-Skript, kein Cookie, keine Anfrage an Google, bevor der Besucher aktiv zugestimmt hat (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Ablehnen muss genauso leicht sein wie Zustimmen.
2. **Einwilligungsbanner** mit Auswahl je Zweck, ohne vorausgewählte Häkchen und mit gleichwertigen Schaltflächen „Alles akzeptieren“ und „Nur Notwendiges“.
3. **Widerruf jederzeit:** dauerhafter Link „Cookie-Einstellungen“ (zum Beispiel im Menü „Mehr“ und im Impressum-Bereich), der das Banner wieder öffnet.
4. **Speichern der Entscheidung:** Das ist selbst eine lokale Speicherung. Sie ist technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und gehört in Abschnitt 5 der Erklärung.
5. **Consent Mode v2:** Google-Dienste im EWR erwarten die Einwilligungssignale (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`). Standard bis zur Zustimmung: alle „denied“.
6. **Content-Security-Policy anpassen** (`public/_headers`). Sie erlaubt heute nur `'self'`. Für Google Analytics kommen Skript-, Verbindungs- und Bildquellen von Google dazu; die genauen Hosts stehen in Googles Dokumentation und gehören vor der Änderung dort nachgelesen. Die Quellen dürfen nur im geladenen Zustand wirken: die Skripte selbst erst nach der Zustimmung nachladen, nicht fest in `index.html` eintragen.
7. **Vorab erzeugtes HTML bleibt ohne Google-Code.** Banner und Skripte laufen erst im Browser.
8. **Tests:** Vor der Zustimmung darf keine Anfrage an Google gehen und kein Cookie entstehen (Browser-Test mit Netzwerkprüfung); nach Ablehnung ebenfalls nicht; nach Widerruf werden die Cookies entfernt.
9. **ADR** (Architekturänderung nach `AGENTS.md`): Einwilligungsverwaltung, Ladeverhalten und Sicherheitsrichtlinie.

## 3. Was in der Datenschutzerklärung zu ändern ist

Die Texte stehen in `src/privacy/privacy-content.ts`. Zu ändern:

- **Abschnitt 2 „Das Wichtigste in Kürze“:** Der Satz „keine Cookies, keine Werbe- oder Analysedienste“ ist dann falsch und muss umformuliert werden.
- **Abschnitt 4 „Cookies und Dienste von Dritten“:** ersetzen durch die Beschreibung des Banners, der Zwecke und des Widerrufs.
- **Neuer Abschnitt „Google Analytics“** (Baustein unten), nach Abschnitt 4 einfügen und die Nummern der folgenden Abschnitte anpassen.
- **Abschnitt 5 „Speicherung in deinem Browser“:** die gespeicherte Einwilligungsentscheidung ergänzen.
- **Abschnitt 8 „Deine Rechte“:** den Satz „arbeitet derzeit ohne Einwilligungen“ streichen.
- **Abschnitt 11 „Änderungen“:** Stand-Datum (`PRIVACY_UPDATED`) und Satz.
- **Test `privacy-content.test.ts`:** Die Prüfung „setzt derzeit keine Cookies“ an den neuen Stand anpassen, nicht weglassen.

## 4. Baustein: Google Analytics 4 (zum Einsetzen, wenn es so kommt)

> Alle Google-Angaben vor der Veröffentlichung gegen die aktuelle Google-Dokumentation und die Einstellungen im eigenen Analytics-Konto abgleichen: Speicherdauer, Datenverarbeitungsbedingungen, Teilnahme am Data Privacy Framework, ob personalisierte Werbung/Google-Signale aus sind.

**Deutsch**

*Google Analytics*
Wenn du zustimmst, nutzen wir Google Analytics 4, einen Webanalysedienst der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (in Verbindung mit Google LLC, USA). Google Analytics setzt Cookies und verarbeitet Daten über deine Nutzung der Website, zum Beispiel aufgerufene Seiten, ungefähre Herkunft, Gerät und Browser. Wir nutzen die Auswertung, um die Seite zu verbessern. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit über „Cookie-Einstellungen“ widerrufen; die Verarbeitung bis dahin bleibt rechtmäßig. Daten können in die USA übermittelt werden; das stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework und Standardvertragsklauseln. Mit Google besteht eine Vereinbarung zur Auftragsverarbeitung. Speicherdauer der Ereignisdaten: [2 / 14] Monate.

**English**

*Google Analytics*
If you consent, we use Google Analytics 4, a web analytics service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (together with Google LLC, USA). Google Analytics sets cookies and processes data about your use of the website, for example pages viewed, approximate origin, device and browser. We use the analysis to improve the site. The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). You can withdraw it at any time through “Cookie settings”; processing until then remains lawful. Data may be transferred to the USA; this relies on the adequacy decision for the EU-US Data Privacy Framework and Standard Contractual Clauses. A data processing agreement exists with Google. Retention of event data: [2 / 14] months.

## 5. Vor der Aktivierung klären (Eigentümer)

1. Welcher Google-Dienst genau (Tabelle oben).
2. Ob die **Datenverarbeitungsbedingungen** im Google-Konto akzeptiert sind; erst dann darf der Satz „Mit Google besteht eine Vereinbarung zur Auftragsverarbeitung“ stehen.
3. Speicherdauer im Konto einstellen (2 oder 14 Monate) und im Text eintragen; Google-Signale und personalisierte Werbung deaktiviert lassen, solange nichts anderes beschlossen ist.
4. Rechtliche Prüfung des Banners und des Textes.

## 6. Aktivieren (Schritte für den Eigentümer)

1. In Google Analytics (https://analytics.google.com) ein **Property** anlegen und einen **Web-Datenstream** für `https://createyourminifig.com` erstellen. Die Mess-ID hat die Form `G-XXXXXXXXXX`.
2. Im Konto die **Datenverarbeitungsbedingungen** akzeptieren (Verwaltung → Konto → Einstellungen). Erst dann ist der Satz „Google stellt Datenverarbeitungsbedingungen bereit“ in der Erklärung gedeckt.
3. **Speicherdauer** der Ereignisdaten auf 2 oder 14 Monate stellen (Verwaltung → Property → Datenerhebung und -änderung → Datenaufbewahrung). Der Text sagt „höchstens 14 Monate“.
4. **Google-Signale** und personalisierte Werbung ausgeschaltet lassen (Datenerhebung). Der Code schaltet sie im Tag ebenfalls ab; der Text sagt, dass wir sie nicht nutzen.
5. Die Mess-ID an den Entwickler geben. Eintrag in `src/consent/measurement-id.ts`, Merge, danach den Banner und Datenschutztext auf der Live-Seite ansehen.
6. Nach der Aktivierung: auf der Live-Seite „Erlauben“ wählen und in Analytics unter „Echtzeit“ prüfen, dass ein Besuch ankommt; „Ablehnen“ und „Cookie-Einstellungen“ ausprobieren.
7. Rechtliche Prüfung von Banner und Text (und des Satzes zu Googles Datenverarbeitungsbedingungen).

Die Aussagen zu Google im Text (keine IP-Adressen gespeichert, Cookies `_ga` und `_ga_<ID>` bis zu zwei Jahre, Data Privacy Framework) stammen aus Googles Dokumentation und sind vor der Aktivierung dort gegenzulesen.
