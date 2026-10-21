import type { Language } from "../i18n.js";

export type PrivacySection = {
  id: string;
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  /** Paragraphs shown after the list. */
  closing?: readonly string[];
};

/** Last change of the notice; shown at the end and in the prerendered HTML. */
export const PRIVACY_UPDATED = { de: "21. Oktober 2026", en: "21 October 2026" } as const;

/**
 * Sections are written in "[label](href)" form for links; hrefs starting with "/" are pages of this
 * site (German path). The "summary" and "cookies" sections describe the current state without any
 * cookie-setting service and have to change together when one is added (see docs/legal).
 */
export const PRIVACY_SECTIONS: Record<Language, readonly PrivacySection[]> = {
  de: [
    {
      id: "controller",
      heading: "1. Verantwortlicher",
      paragraphs: [
        "Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser Website ist:",
        "SeitenHafen361 (Einzelunternehmen), Inhaber: Schayan Yousefian, Freienwalder Str. 34, 13359 Berlin, Deutschland. E-Mail: contact@createyourminifig.com",
        "Alle Anfragen zum Datenschutz richtest du an diese Adresse. Weitere Angaben stehen im [Impressum](/impressum).",
      ],
    },
    {
      id: "summary",
      heading: "2. Das Wichtigste in Kürze",
      paragraphs: [
        "FigForge kommt ohne Benutzerkonten aus. Es gibt keine Registrierung, keine Cookies, keine Werbe- oder Analysedienste und keine Schriften, Skripte oder Bilder von fremden Servern. Die Figuren, die du zusammenstellst, bleiben in deinem Browser. Personenbezogene Daten fallen nur beim Aufruf der Seite (technische Zugriffsdaten beim Hoster) und, wenn du uns schreibst, durch deine E-Mail an.",
      ],
    },
    {
      id: "hosting",
      heading: "3. Hosting und Zugriffsdaten",
      paragraphs: [
        "Die Website wird bei Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA gehostet (Cloudflare Workers mit statischen Dateien). Wenn du die Seite aufrufst, verarbeitet Cloudflare technisch notwendige Zugriffsdaten, um die Seite auszuliefern und abzusichern. Dazu gehören insbesondere:",
      ],
      items: [
        "deine IP-Adresse,",
        "Datum und Uhrzeit des Abrufs,",
        "die aufgerufene Adresse (URL) und die Antwort des Servers,",
        "Browser- und Systeminformationen (User-Agent),",
        "gegebenenfalls die Seite, von der du kommst (Referrer).",
      ],
      closing: [
        "Zweck und Rechtsgrundlage: Auslieferung, Stabilität und Sicherheit der Website. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und zuverlässigen Betrieb).",
        "Auftragsverarbeitung: Cloudflare stellt einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO bereit (Data Processing Addendum). Nach Cloudflares Angaben gilt er für Kunden mit einem Self-Serve- oder Enterprise-Vertrag und ist Teil dieses Vertrags. Er enthält Standardvertragsklauseln der EU und nimmt auf das EU-US Data Privacy Framework Bezug.",
        "Speicherdauer: FigForge selbst speichert diese Zugriffsdaten nicht. Wie lange Cloudflare sie vorhält, steht in der [Datenschutzerklärung von Cloudflare](https://www.cloudflare.com/privacypolicy/).",
        "Drittlandübermittlung: Cloudflare ist ein US-Unternehmen. Eine Übermittlung personenbezogener Daten in die USA kann nicht ausgeschlossen werden, auch wenn Anfragen über Server in Europa laufen. Sie stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework, an dem Cloudflare nach eigenen Angaben teilnimmt, und zusätzlich auf Standardvertragsklauseln.",
      ],
    },
    {
      id: "cookies",
      heading: "4. Cookies und Dienste von Dritten",
      paragraphs: [
        "FigForge setzt derzeit keine Cookies. Wir verwenden keine Tracking- oder Analysedienste und laden keine Inhalte von fremden Servern nach: Schriften, Bilder, Skripte und das Suchmodell kommen von unserer eigenen Domain. Deshalb gibt es derzeit keinen Cookie-Banner.",
        "Sollten wir künftig Dienste einbinden, die Cookies setzen oder Daten an Dritte senden, zum Beispiel von Google, holen wir vorher deine Einwilligung ein und ergänzen diese Erklärung, bevor der Dienst aktiv wird. Ohne deine Einwilligung wird dann nichts geladen.",
      ],
    },
    {
      id: "local",
      heading: "5. Speicherung in deinem Browser",
      paragraphs: [
        "Damit der Builder funktioniert, speichert FigForge Daten ausschließlich lokal in deinem Browser (IndexedDB und Browser-Zwischenspeicher):",
      ],
      items: [
        "dein aktueller Entwurf, gespeicherte Figuren und die Anordnung auf der Bühne,",
        "Teilelisten, die du selbst importierst (zum Beispiel was du schon besitzt),",
        "die Dateien des Such-Modells, damit die Suche beim nächsten Besuch nicht neu laden muss.",
      ],
      closing: [
        "Diese Daten verlassen dein Gerät nicht. Wir haben keinen Zugriff darauf und können sie nicht einsehen. Die Suche mit eigenen Worten läuft vollständig in deinem Browser; deine Suchbegriffe werden nicht an uns oder Dritte gesendet. Ein Link, mit dem du eine Figur teilst, enthält die Figur im Teil nach dem „#“; dieser Teil wird vom Browser nicht an den Server gesendet.",
        "Rechtsgrundlage: Die Speicherung auf deinem Endgerät ist technisch erforderlich, damit der von dir gewünschte Dienst funktioniert (§ 25 Abs. 2 Nr. 2 TDDDG). Eine Einwilligung ist dafür nicht nötig.",
        "Löschen: In der Sammlung kannst du lokale Entwürfe und gespeicherte Figuren löschen. Außerdem kannst du in den Einstellungen deines Browsers die Website-Daten für createyourminifig.com entfernen.",
      ],
    },
    {
      id: "email",
      heading: "6. Kontakt per E-Mail",
      paragraphs: [
        "Die Adresse contact@createyourminifig.com wird bei Purelymail betrieben. Purelymail ist ein US-Unternehmen (eingetragen in Delaware); die Server stehen nach Purelymails Angaben bei Amazon Web Services in der Region US-East-1 in Nord-Virginia. Wenn du uns schreibst, werden deine Nachricht und deine E-Mail-Adresse dort gespeichert. Das ist eine Übermittlung in die USA.",
        "Wir verarbeiten deine E-Mail-Adresse, den Inhalt deiner Nachricht und die Metadaten der E-Mail, um deine Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen), bei vertragsnahen Anfragen Art. 6 Abs. 1 lit. b DSGVO. Wir löschen die Nachrichten, sobald die Anfrage erledigt ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Purelymail löscht nach eigenen Angaben Diagnoseprotokolle nach 30 Tagen.",
      ],
    },
    {
      id: "external",
      heading: "7. Externe Links und Partnerlinks",
      paragraphs: [
        "FigForge verlinkt auf Websites Dritter, zum Beispiel LEGO, Amazon, BrickLink, Rebrickable, Brick Owl und Pick a Brick. Mit dem Klick verlässt du FigForge. Ab dann gelten die Datenschutzbestimmungen des jeweiligen Anbieters; dort können Cookies gesetzt und Daten verarbeitet werden, auf die wir keinen Einfluss haben.",
        "Einige Links zu Produkten bei Amazon sind Partnerlinks (Amazon-Partnerprogramm) und als Anzeige gekennzeichnet. Wenn du über so einen Link bei Amazon einkaufst, erhalten wir eine Vergütung. Amazon verarbeitet dabei Daten nach seiner eigenen Datenschutzerklärung. Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.",
        "FigForge speichert keine Preise oder Verfügbarkeiten; prüfe beides auf der geöffneten Produktseite.",
        "Die Teilelisten, die du herunterlädst oder kopierst, enthalten nur Teilenummern, Farben und Mengen, keine personenbezogenen Daten. Wenn du sie bei einem Dienst hochlädst, gelten dessen Bedingungen.",
      ],
    },
    {
      id: "rights",
      heading: "8. Deine Rechte",
      paragraphs: ["Du hast gegenüber uns das Recht auf"],
      items: [
        "Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO),",
        "Berichtigung unrichtiger Daten (Art. 16),",
        "Löschung (Art. 17),",
        "Einschränkung der Verarbeitung (Art. 18),",
        "Datenübertragbarkeit (Art. 20),",
        "Widerspruch gegen die Verarbeitung auf Grundlage berechtigter Interessen (Art. 21).",
      ],
      closing: [
        "Wende dich dafür an contact@createyourminifig.com. Eine erteilte Einwilligung kannst du jederzeit widerrufen; FigForge arbeitet derzeit ohne Einwilligungen.",
      ],
    },
    {
      id: "complaint",
      heading: "9. Beschwerderecht",
      paragraphs: [
        "Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig für unseren Sitz in Berlin ist die Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59-61, 10555 Berlin, E-Mail: mailbox@datenschutz-berlin.de, Website: [datenschutz-berlin.de](https://www.datenschutz-berlin.de).",
      ],
    },
    {
      id: "automated",
      heading: "10. Keine automatisierten Entscheidungen",
      paragraphs: ["Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling nach Art. 22 DSGVO statt."],
    },
    {
      id: "changes",
      heading: "11. Änderungen",
      paragraphs: [
        "Wenn sich die Seite ändert, zum Beispiel durch neue Dienste, passen wir diese Erklärung an. Stand: 21. Oktober 2026.",
      ],
    },
  ],
  en: [
    {
      id: "controller",
      heading: "1. Controller",
      paragraphs: [
        "The party responsible for processing personal data on this website is:",
        "SeitenHafen361 (sole proprietorship), owner: Schayan Yousefian, Freienwalder Str. 34, 13359 Berlin, Germany. E-mail: contact@createyourminifig.com",
        "Send all data protection requests to this address. Further details are in the [imprint](/impressum).",
      ],
    },
    {
      id: "summary",
      heading: "2. In short",
      paragraphs: [
        "FigForge works without user accounts. There is no registration, no cookies, no advertising or analytics services and no fonts, scripts or images from third-party servers. The figures you assemble stay in your browser. Personal data arises only when you open the site (technical access data at the host) and when you write to us by e-mail.",
      ],
    },
    {
      id: "hosting",
      heading: "3. Hosting and access data",
      paragraphs: [
        "The website is hosted by Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA (Cloudflare Workers with static files). When you open the site, Cloudflare processes technically necessary access data to deliver and protect the site. This includes in particular:",
      ],
      items: [
        "your IP address,",
        "date and time of the request,",
        "the requested address (URL) and the server's response,",
        "browser and system information (user agent),",
        "where applicable, the page you came from (referrer).",
      ],
      closing: [
        "Purpose and legal basis: delivery, stability and security of the website. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in secure and reliable operation).",
        "Processing on our behalf: Cloudflare provides a data processing agreement under Art. 28 GDPR (Data Processing Addendum). According to Cloudflare it applies to customers with a Self-Serve or Enterprise agreement and forms part of that agreement. It contains EU Standard Contractual Clauses and refers to the EU-US Data Privacy Framework.",
        "Retention: FigForge itself does not store this access data. How long Cloudflare keeps it is stated in [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/).",
        "Transfers to third countries: Cloudflare is a US company. A transfer of personal data to the USA cannot be ruled out, even if requests are served from servers in Europe. It relies on the adequacy decision for the EU-US Data Privacy Framework, in which Cloudflare participates according to its own statements, and additionally on Standard Contractual Clauses.",
      ],
    },
    {
      id: "cookies",
      heading: "4. Cookies and third-party services",
      paragraphs: [
        "FigForge currently sets no cookies. We use no tracking or analytics services and load no content from third-party servers: fonts, images, scripts and the search model come from our own domain. This is why there is currently no cookie banner.",
        "If we add services in the future that set cookies or send data to third parties, for example from Google, we will ask for your consent first and update this notice before the service becomes active. Without your consent, nothing of the kind will be loaded.",
      ],
    },
    {
      id: "local",
      heading: "5. Storage in your browser",
      paragraphs: [
        "For the Builder to work, FigForge stores data exclusively locally in your browser (IndexedDB and browser cache):",
      ],
      items: [
        "your current draft, saved figures and the arrangement on the stage,",
        "parts lists you import yourself (for example what you already own),",
        "the files of the search model, so that search does not have to reload on your next visit.",
      ],
      closing: [
        "This data does not leave your device. We have no access to it and cannot see it. Search in your own words runs entirely in your browser; your search terms are not sent to us or to third parties. A link you use to share a figure contains the figure in the part after the “#”; the browser does not send that part to the server.",
        "Legal basis: storing data on your device is technically necessary for the service you requested to work (Section 25(2) no. 2 TDDDG). No consent is needed for this.",
        "Deleting: in the collection you can delete local drafts and saved figures. You can also remove the site data for createyourminifig.com in your browser settings.",
      ],
    },
    {
      id: "email",
      heading: "6. Contact by e-mail",
      paragraphs: [
        "The address contact@createyourminifig.com is operated by Purelymail. Purelymail is a US company (incorporated in Delaware); according to Purelymail its servers are at Amazon Web Services in the US-East-1 region in northern Virginia. When you write to us, your message and your e-mail address are stored there. This is a transfer to the USA.",
        "We process your e-mail address, the content of your message and the e-mail's metadata to answer your request. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in answering requests) and, for contract-related requests, Art. 6(1)(b) GDPR. We delete messages once the request is dealt with and no statutory retention duty applies. According to Purelymail, diagnostic logs are deleted after 30 days.",
      ],
    },
    {
      id: "external",
      heading: "7. External links and affiliate links",
      paragraphs: [
        "FigForge links to third-party websites, for example LEGO, Amazon, BrickLink, Rebrickable, Brick Owl and Pick a Brick. By clicking you leave FigForge. From then on the provider's privacy terms apply; cookies may be set there and data processed over which we have no influence.",
        "Some links to products at Amazon are affiliate links (Amazon Associates programme) and are marked as ads. If you buy at Amazon through such a link, we receive a commission. Amazon processes data in line with its own privacy policy. As an Amazon Associate I earn from qualifying purchases.",
        "FigForge does not store prices or availability; check both on the product page you open.",
        "The parts lists you download or copy contain only part numbers, colors and quantities, no personal data. If you upload them to a service, that service's terms apply.",
      ],
    },
    {
      id: "rights",
      heading: "8. Your rights",
      paragraphs: ["You have the right towards us to"],
      items: [
        "access to the data stored about you (Art. 15 GDPR),",
        "rectification of inaccurate data (Art. 16),",
        "erasure (Art. 17),",
        "restriction of processing (Art. 18),",
        "data portability (Art. 20),",
        "object to processing based on legitimate interests (Art. 21).",
      ],
      closing: [
        "Contact contact@createyourminifig.com for this. You can withdraw any consent at any time; FigForge currently works without consents.",
      ],
    },
    {
      id: "complaint",
      heading: "9. Right to lodge a complaint",
      paragraphs: [
        "You can complain to a data protection supervisory authority. The authority responsible for our seat in Berlin is the Berlin Commissioner for Data Protection and Freedom of Information (Berliner Beauftragte für Datenschutz und Informationsfreiheit), Alt-Moabit 59-61, 10555 Berlin, e-mail: mailbox@datenschutz-berlin.de, website: [datenschutz-berlin.de](https://www.datenschutz-berlin.de).",
      ],
    },
    {
      id: "automated",
      heading: "10. No automated decisions",
      paragraphs: ["There is no automated decision-making, including profiling, under Art. 22 GDPR."],
    },
    {
      id: "changes",
      heading: "11. Changes",
      paragraphs: [
        "If the site changes, for example through new services, we will update this notice. Last updated: 21 October 2026.",
      ],
    },
  ],
};

const PRIVACY_ANALYTICS: Record<Language, {
  summary: string;
  cookies: readonly string[];
  section: PrivacySection;
  localExtra: string;
  rightsClosing: string;
}> = {
  de: {
    summary: "FigForge kommt ohne Benutzerkonten aus. Es gibt keine Registrierung, keine Werbedienste und keine Schriften, Skripte oder Bilder von fremden Servern. Cookies und die Statistik von Google Analytics gibt es nur, wenn du ausdrücklich zustimmst. Die Figuren, die du zusammenstellst, bleiben in deinem Browser. Personenbezogene Daten fallen sonst nur beim Aufruf der Seite (technische Zugriffsdaten beim Hoster) und, wenn du uns schreibst, durch deine E-Mail an.",
    cookies: [
      "Ohne deine Zustimmung setzt FigForge keine Cookies und lädt nichts von Dritten nach: Schriften, Bilder, Skripte und das Suchmodell kommen von unserer eigenen Domain. Beim ersten Besuch fragt ein Hinweis, ob Google Analytics messen darf. „Erlauben“ und „Ablehnen“ sind gleichwertig; ohne Erlaubnis wird nichts von Google geladen.",
      "Deine Entscheidung kannst du jederzeit unter „Cookie-Einstellungen“ im Menü „Mehr“ ändern. Bei einem Widerruf stoppt die Messung sofort, und wir entfernen die Cookies von Google Analytics.",
    ],
    section: {
      id: "analytics",
      heading: "Google Analytics",
      paragraphs: [
        "Wenn du zustimmst, nutzen wir Google Analytics 4, einen Webanalysedienst der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (in Verbindung mit Google LLC, USA). Google Analytics setzt Cookies (_ga und _ga_ mit unserer Mess-ID, Laufzeit bis zu zwei Jahre) und verarbeitet Daten über deine Nutzung, zum Beispiel aufgerufene Seiten, ungefähre Herkunft, Gerät und Browser. Nach Googles Angaben protokolliert und speichert Google Analytics 4 keine IP-Adressen.",
        "Wir nutzen die Auswertung, um die Seite zu verbessern. Werbefunktionen, Google-Signale und Werbepersonalisierung nutzen wir nicht.",
        "Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit über „Cookie-Einstellungen“ im Menü „Mehr“ widerrufen; die Verarbeitung bis dahin bleibt rechtmäßig.",
        "Daten können in die USA übermittelt werden. Das stützt sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework und auf Standardvertragsklauseln. Google stellt dafür Datenverarbeitungsbedingungen bereit (Auftragsverarbeitung nach Art. 28 DSGVO). Die Speicherdauer der Ereignisdaten richtet sich nach den Einstellungen in unserem Analytics-Konto und beträgt höchstens 14 Monate.",
      ],
    },
    localExtra: "Deine Entscheidung zu Google Analytics (erlaubt oder abgelehnt, mit Datum) wird ebenfalls nur lokal gespeichert, damit wir dich nicht bei jedem Besuch erneut fragen. Nach einem Jahr fragen wir wieder.",
    rightsClosing: "Wende dich dafür an contact@createyourminifig.com. Eine Einwilligung zu Google Analytics kannst du jederzeit über „Cookie-Einstellungen“ im Menü „Mehr“ widerrufen.",
  },
  en: {
    summary: "FigForge works without user accounts. There is no registration, no advertising services and no fonts, scripts or images from third-party servers. Cookies and Google Analytics statistics exist only if you explicitly agree. The figures you assemble stay in your browser. Otherwise personal data arises only when you open the site (technical access data at the host) and when you write to us by e-mail.",
    cookies: [
      "Without your consent FigForge sets no cookies and loads nothing from third parties: fonts, images, scripts and the search model come from our own domain. On your first visit a notice asks whether Google Analytics may measure. “Allow” and “Decline” are equal; without permission nothing is loaded from Google.",
      "You can change your decision at any time under “Cookie settings” in the “More” menu. If you withdraw, measuring stops immediately and we remove the Google Analytics cookies.",
    ],
    section: {
      id: "analytics",
      heading: "Google Analytics",
      paragraphs: [
        "If you consent, we use Google Analytics 4, a web analytics service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (together with Google LLC, USA). Google Analytics sets cookies (_ga and _ga_ with our measurement ID, lifetime up to two years) and processes data about your use, for example pages viewed, approximate origin, device and browser. According to Google, Google Analytics 4 does not log or store IP addresses.",
        "We use the analysis to improve the site. We do not use advertising features, Google signals or ad personalization.",
        "The legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). You can withdraw it at any time through “Cookie settings” in the “More” menu; processing until then remains lawful.",
        "Data may be transferred to the USA. This relies on the adequacy decision for the EU-US Data Privacy Framework and on Standard Contractual Clauses. Google provides data processing terms for this (processing on our behalf under Art. 28 GDPR). The retention of event data follows the settings in our Analytics account and is at most 14 months.",
      ],
    },
    localExtra: "Your decision about Google Analytics (allowed or declined, with the date) is also stored only locally, so we do not ask you again on every visit. We ask again after one year.",
    rightsClosing: "Contact contact@createyourminifig.com for this. You can withdraw your consent to Google Analytics at any time through “Cookie settings” in the “More” menu.",
  },
};

const renumber = (sections: readonly PrivacySection[]): PrivacySection[] =>
  sections.map((section, index) => ({ ...section, heading: `${index + 1}. ${section.heading.replace(/^\d+\.\s*/u, "")}` }));

/**
 * The notice that matches the site: the base text while no cookie-setting service is active, and the
 * text with Google Analytics once the site has a measurement ID. Headings are numbered in order.
 */
export const privacySections = (language: Language, analytics: boolean): readonly PrivacySection[] => {
  const base = PRIVACY_SECTIONS[language];
  if (!analytics) return renumber(base);
  const extra = PRIVACY_ANALYTICS[language];
  const adapted = base.flatMap((section): PrivacySection[] => {
    if (section.id === "summary") return [{ ...section, paragraphs: [extra.summary] }];
    if (section.id === "cookies") {
      return [{ ...section, paragraphs: extra.cookies }, extra.section];
    }
    if (section.id === "local") return [{ ...section, closing: [...(section.closing ?? []), extra.localExtra] }];
    if (section.id === "rights") return [{ ...section, closing: [extra.rightsClosing] }];
    return [section];
  });
  return renumber(adapted);
};
