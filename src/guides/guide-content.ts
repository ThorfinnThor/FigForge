import { GUIDE_SLUGS, type GuideSlugId } from "../app/routing.js";
import type { Language } from "../i18n.js";

export type GuideId = GuideSlugId;

export type GuideSection = {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  /** Paragraphs shown after the list. */
  closing?: readonly string[];
};

/** Titles, descriptions and the lede live in the i18n messages (`guide.<id>.*`); this is the body. */
export const GUIDE_IDS = Object.keys(GUIDE_SLUGS) as readonly GuideId[];

/** ISO dates for the article structured data; update `modified` whenever the text changes. */
export const GUIDE_DATES: Record<GuideId, { published: string; modified: string }> = {
  order: { published: "2026-10-20", modified: "2026-10-20" },
  "part-numbers": { published: "2026-10-20", modified: "2026-10-20" },
  gift: { published: "2026-10-20", modified: "2026-10-20" },
};

export const GUIDE_SECTIONS: Record<GuideId, Record<Language, readonly GuideSection[]>> = {
  order: {
    de: [
      {
        heading: "Die Teileliste aus FigForge",
        paragraphs: [
          "Öffne im Builder „Teile kaufen“. Bei Teilen, die es in mehreren Farben gibt, wählst du dort die gewünschte Farbe. Danach lädst du die Liste für den Kaufweg deiner Wahl herunter. FigForge zeigt dir, wie viele Teile pro Weg enthalten sind.",
          "Teile ohne belegte Zuordnung stehen nicht in der Liste, sondern unter „Warum fehlen manche Teile?“. FigForge rät keine Nummern: Eine falsche Zuordnung hieße am Ende ein falsches Teil im Paket.",
        ],
      },
      {
        heading: "Weg 1: Rebrickable-Teileliste",
        paragraphs: [
          "Du importierst die CSV in deine Teilelisten bei Rebrickable und kaufst von dort über BrickLink oder Brick Owl. In FigForge ist das der empfohlene Weg, weil er ältere und bedruckte Minifiguren-Teile am besten abdeckt.",
        ],
        items: [
          "Passt, wenn die Figur bedruckte Köpfe oder Oberkörper hat.",
          "Du musst bei Rebrickable angemeldet sein, um Teilelisten zu nutzen.",
          "Gekauft wird bei BrickLink oder Brick Owl, also bei Einzelverkäufern.",
        ],
      },
      {
        heading: "Weg 2: BrickLink-Wanted-List",
        paragraphs: [
          "Du fügst den Inhalt der XML-Datei bei BrickLink als Wanted List ein und suchst danach Shops, die deine Teile führen. BrickLink ist ein Marktplatz mit vielen unabhängigen Verkäufern.",
        ],
        items: [
          "Passt, wenn du Shops selbst vergleichen willst.",
          "So geht der Import: Klicke in FigForge auf „XML kopieren“, öffne bei BrickLink die Seite „Upload to Wanted List“, wechsle zum Tab „Upload BrickLink XML format“ und füge den Text dort ein. Der andere Tab, „Upload a file from your computer“, nimmt nur BrickStock-, LDraw-, Digital-Designer- und Studio-Dateien an, kein XML.",
          "Hast du die XML-Datei geladen, öffne sie in einem Texteditor und kopiere alles. Text, den du aus der Anzeige im Browser kopierst, enthält die Tags nicht; BrickLink lehnt ihn mit „Content is not allowed in prolog“ ab.",
          "Führt kein Shop alle Teile, besteht die Figur am Ende aus mehreren Bestellungen mit je eigenen Versandkosten.",
          "Prüfe Farbe und Teilenummer in der Wanted List, bevor du kaufst.",
        ],
      },
      {
        heading: "Weg 3: Pick a Brick bei LEGO",
        paragraphs: [
          "Du lädst die CSV bei Pick a Brick hoch und kaufst direkt bei LEGO. LEGO führt dort nur einen Teil der aktuellen Elemente. Ältere und viele bedruckte Minifiguren-Teile gibt es dort oft nicht.",
        ],
        items: [
          "Passt, wenn die Teile aktuell im LEGO Sortiment sind und du nur bei einem Anbieter bestellen willst.",
          "So geht der Import: Öffne bei Pick a Brick „Upload List“ und wähle die CSV. Teile, die LEGO dort nicht führt, meldet die Seite als „Unavailable Pieces“ mit dem Hinweis, dass die Element-ID aktuell nicht verfügbar ist. Pro Liste sind bis zu 200 verschiedene Teile möglich.",
          "Fehlt ein Teil, nimm die Rebrickable-Liste.",
        ],
      },
      {
        heading: "Welcher Weg passt?",
        items: [
          "Bedruckte oder ältere Teile: Rebrickable-Liste, danach BrickLink oder Brick Owl.",
          "Du willst Shops selbst vergleichen: BrickLink-Wanted-List.",
          "Aktuelle Standardteile bei einem Anbieter: Pick a Brick, bei fehlenden Teilen die Rebrickable-Liste.",
        ],
      },
      {
        heading: "Vor dem Bestellen prüfen",
        items: [
          "Farbe: Stimmt sie mit deiner Auswahl in FigForge überein?",
          "Teilenummer und Aufdruck: Vergleiche sie mit dem Foto im Shop. Wie die Nummern aufgebaut sind, erklärt der Ratgeber „Teilenummern verstehen“.",
          "Preis, Versand, Lieferzeit und Verfügbarkeit zeigt nur der Shop. FigForge verkauft nichts und nennt keine Preise.",
        ],
        closing: [
          "Die 3D-Vorschau prüft die Passung digital. Sie ist keine Garantie, dass die Teile in echt zusammenhalten.",
        ],
      },
    ],
    en: [
      {
        heading: "The parts list from FigForge",
        paragraphs: [
          "Open “Buy parts” in the Builder. For parts that exist in several colors, choose the color you want there. Then download the list for the way of buying you prefer. FigForge shows how many parts each list contains.",
          "Parts without a documented mapping are not in the list; they appear under “Why are some parts missing?”. FigForge does not guess numbers: a wrong mapping would mean a wrong part in your parcel.",
        ],
      },
      {
        heading: "Option 1: Rebrickable parts list",
        paragraphs: [
          "You import the CSV into your part lists at Rebrickable and buy from there through BrickLink or Brick Owl. FigForge recommends this route because it covers older and printed minifigure parts best.",
        ],
        items: [
          "Fits when the figure has printed heads or torsos.",
          "You need to be signed in at Rebrickable to use part lists.",
          "You buy at BrickLink or Brick Owl, so from individual sellers.",
        ],
      },
      {
        heading: "Option 2: BrickLink wanted list",
        paragraphs: [
          "You paste the contents of the XML file into BrickLink as a wanted list and then look for stores that carry your parts. BrickLink is a marketplace with many independent sellers.",
        ],
        items: [
          "Fits when you want to compare stores yourself.",
          "This is how the import works: click “Copy XML” in FigForge, open the “Upload to Wanted List” page at BrickLink, switch to the “Upload BrickLink XML format” tab and paste the text there. The other tab, “Upload a file from your computer”, only accepts BrickStock, LDraw, Digital Designer and Studio files, not XML.",
          "If you downloaded the XML file, open it in a text editor and copy everything. Text copied from the browser's display of the file lacks the tags; BrickLink rejects it with “Content is not allowed in prolog”.",
          "If no single store has every part, the figure ends up as several orders, each with its own shipping cost.",
          "Check color and part number in the wanted list before you buy.",
        ],
      },
      {
        heading: "Option 3: Pick a Brick at LEGO",
        paragraphs: [
          "You upload the CSV to Pick a Brick and buy directly from LEGO. LEGO carries only some of the current elements there. Older and many printed minifigure parts are often not available.",
        ],
        items: [
          "Fits when the parts are in LEGO's current range and you want to order from a single provider.",
          "This is how the import works: open “Upload List” at Pick a Brick and choose the CSV. Parts LEGO does not carry there are reported as “Unavailable Pieces”, with the note that the element ID is currently unavailable. A list can hold up to 200 different parts.",
          "If a part is missing, use the Rebrickable list.",
        ],
      },
      {
        heading: "Which option fits?",
        items: [
          "Printed or older parts: the Rebrickable list, then BrickLink or Brick Owl.",
          "You want to compare stores yourself: the BrickLink wanted list.",
          "Current standard parts from one provider: Pick a Brick, and the Rebrickable list for anything missing.",
        ],
      },
      {
        heading: "Check before you order",
        items: [
          "Color: does it match your choice in FigForge?",
          "Part number and print: compare them with the photo in the shop. The guide “Understand part numbers” explains how the numbers are built.",
          "Price, shipping, delivery time and availability are shown only by the shop. FigForge sells nothing and quotes no prices.",
        ],
        closing: [
          "The 3D preview checks fit digitally. It is no guarantee that the parts hold together in real life.",
        ],
      },
    ],
  },
  "part-numbers": {
    de: [
      {
        heading: "Die Grundnummer sagt, was für ein Teil es ist",
        items: ["3626 ist ein Kopf.", "973 ist ein Oberkörper (Torso).", "970 ist eine Hüfte mit Beinen."],
        closing: ["Die Zahl am Anfang steht für die Grundform. Alles dahinter beschreibt eine Variante."],
      },
      {
        heading: "Buchstaben direkt hinter der Zahl: die Bauform",
        paragraphs: [
          "Den Kopf 3626 gibt es in drei Bauformen, die sich an der Noppe oben unterscheiden: 3626a mit voller Noppe („Solid Stud“), 3626b mit blockierter, offener Noppe („Blocked Open Stud“) und 3626c mit hohler Noppe („Hollow Stud“). Von außen sind sie kaum zu unterscheiden.",
          "Denselben Aufdruck gibt es oft in mehreren Bauformen, etwa 3626bpr0001 und 3626cpr0001, beide das Standard-Grinsen.",
        ],
      },
      {
        heading: "pr, pb und pat: Aufdruck und Muster",
        items: [
          "pr und eine Zahl: ein Aufdruck. 3626cpr0001 ist ein Kopf der Bauform c mit dem Aufdruck 0001, dem Standard-Grinsen.",
          "pb und eine Zahl: ebenfalls ein Aufdruck, nur anders nummeriert, etwa 973pb0006, ein Oberkörper mit Logo.",
          "pat und eine Zahl: ein Muster, zum Beispiel schwarze Stiefel auf den Beinen (970c01pat03).",
        ],
        closing: ["Fehlt pr, pb oder pat, ist das Teil in der Regel unbedruckt, etwa 3626c als einfarbiger Kopf."],
      },
      {
        heading: "c, h und weitere Ziffern: fertige Baugruppen",
        paragraphs: [
          "Oberkörper und Beine werden als Baugruppen geführt. 970c01 ist Hüfte und Beine in einem Eintrag, 973c01h01 ein Oberkörper samt Armen und Händen. Die Ziffern hinter c und h unterscheiden Varianten, zum Beispiel die Farbe von Armen und Händen. Der Katalogname nennt sie, etwa „Yellow Arms and Hands“.",
        ],
      },
      {
        heading: "Ein Beispiel von vorn bis hinten",
        paragraphs: [
          "973c01h01pr0030 aus der Vorlage Piratenkapitän: 973 ist der Oberkörper, c01h01 die Baugruppe mit Armen und Händen, pr0030 der Aufdruck. Der Katalogname lautet „Torso, Vest, Purple, Anchor Tattoo Print, Yellow Arms and Hands“: ein Oberkörper mit violetter Weste, Anker-Tattoo, gelben Armen und Händen.",
        ],
      },
      {
        heading: "Dieselbe Nummer, verschiedene Systeme",
        paragraphs: [
          "Rebrickable, BrickLink und LDraw, die Bibliothek der 3D-Modelle, nummerieren nicht überall gleich. FigForge zeigt im Builder die Rebrickable-Nummer und auf den Themenseiten die LDraw-Nummer. Für BrickLink ordnet FigForge nur zu, wenn die Zuordnung belegt ist; sonst bleibt das Teil für diese Liste gesperrt.",
          "Vergleiche deshalb vor dem Kauf nicht nur die Nummer, sondern auch Name, Aufdruck und Farbe.",
        ],
      },
    ],
    en: [
      {
        heading: "The base number tells you what kind of part it is",
        items: ["3626 is a head.", "973 is a torso.", "970 is hips with legs."],
        closing: ["The number at the start stands for the basic shape. Everything after it describes a variant."],
      },
      {
        heading: "Letters right after the number: the mold",
        paragraphs: [
          "The head 3626 exists in three molds that differ at the stud on top: 3626a with a solid stud, 3626b with a blocked open stud and 3626c with a hollow stud. From the outside they are hard to tell apart.",
          "The same print often exists in several molds, for example 3626bpr0001 and 3626cpr0001, both the standard grin.",
        ],
      },
      {
        heading: "pr, pb and pat: print and pattern",
        items: [
          "pr and a number: a print. 3626cpr0001 is a head of mold c with print 0001, the standard grin.",
          "pb and a number: also a print, just numbered differently, for example 973pb0006, a torso with a logo.",
          "pat and a number: a pattern, for example black boots on the legs (970c01pat03).",
        ],
        closing: ["Without pr, pb or pat a part is usually unprinted, for example 3626c as a plain head."],
      },
      {
        heading: "c, h and further digits: finished assemblies",
        paragraphs: [
          "Torsos and legs are listed as assemblies. 970c01 is hips and legs in one entry, 973c01h01 a torso including arms and hands. The digits after c and h tell variants apart, for example the color of arms and hands. The catalog name states it, such as “Yellow Arms and Hands”.",
        ],
      },
      {
        heading: "An example from front to back",
        paragraphs: [
          "973c01h01pr0030 from the pirate captain template: 973 is the torso, c01h01 the assembly with arms and hands, pr0030 the print. The catalog name reads “Torso, Vest, Purple, Anchor Tattoo Print, Yellow Arms and Hands”: a torso with a purple vest, an anchor tattoo, yellow arms and hands.",
        ],
      },
      {
        heading: "The same number, different systems",
        paragraphs: [
          "Rebrickable, BrickLink and LDraw, the library of the 3D models, do not number everything alike. FigForge shows the Rebrickable number in the Builder and the LDraw number on the theme pages. For BrickLink, FigForge only maps a part when the mapping is documented; otherwise the part stays blocked for that list.",
          "So before you buy, compare not just the number but also name, print and color.",
        ],
      },
    ],
  },
  gift: {
    de: [
      {
        heading: "Idee: Wer bekommt die Figur?",
        paragraphs: [
          "Überlege, was die Person ausmacht: Beruf, Hobby, Lieblingsfarbe oder Lieblingsthema. Wenn du nicht weiterweißt, starte mit einer der Vorlagen unter Ideen (Piraten, Ritterburg, Weltraum, Feuerwehr) und ändere einzelne Teile.",
        ],
      },
      {
        heading: "Figur zusammenstellen",
        items: [
          "Öffne den Builder und wähle Kopf, Kopfbedeckung, Oberkörper, Beine und Zubehör.",
          "Drehe die Figur in der 3D-Vorschau und prüfe, ob sie so aussieht, wie du sie dir gedacht hast.",
          "Speichere sie in deiner Sammlung, um später weiterzumachen. Gespeichert wird nur in deinem Browser.",
        ],
      },
      {
        heading: "Teile bestellen",
        paragraphs: [
          "Die fertige Figur ist noch kein Paket: Du bestellst die Teile bei einem Shop. Welcher Weg zu deiner Figur passt, steht im Ratgeber „Minifiguren-Teile bestellen“.",
          "Plane Zeit ein. Kommen die Teile aus mehreren Shops, treffen sie nicht gleichzeitig ein.",
        ],
      },
      {
        heading: "Zusammenstecken",
        paragraphs: [
          "Die Teile werden gesteckt: Kopf auf den Oberkörper, Oberkörper auf die Hüfte, Zubehör in die Hand. Die 3D-Vorschau prüft die Passung nur digital. Probiere sie deshalb vor dem Verschenken aus.",
        ],
      },
      {
        heading: "Verpacken und beschenken",
        items: [
          "Verpacke die Figur zusammengesteckt in einer kleinen Schachtel oder einem Beutel.",
          "Lege einen Zettel mit dem Namen bei, den du der Figur im Builder gegeben hast.",
          "Du kannst die Teile auch lose schenken, damit die Person die Figur selbst zusammensteckt.",
        ],
      },
      {
        heading: "Sicherheit",
        paragraphs: ["Minifiguren und ihre Teile sind Kleinteile. Sie sind nichts für Kinder unter drei Jahren."],
      },
    ],
    en: [
      {
        heading: "Idea: who gets the figure?",
        paragraphs: [
          "Think about what makes the person who they are: job, hobby, favorite color or favorite theme. If you are stuck, start with one of the templates under Ideas (pirates, castle, space, fire rescue) and change individual parts.",
        ],
      },
      {
        heading: "Assemble the figure",
        items: [
          "Open the Builder and choose head, headwear, torso, legs and accessory.",
          "Turn the figure in the 3D preview and check that it looks the way you imagined.",
          "Save it to your collection to continue later. It is stored only in your browser.",
        ],
      },
      {
        heading: "Order the parts",
        paragraphs: [
          "The finished figure is not yet a parcel: you order the parts from a shop. Which option fits your figure is explained in the guide “Order minifigure parts”.",
          "Allow some time. If the parts come from several shops, they do not arrive together.",
        ],
      },
      {
        heading: "Snap it together",
        paragraphs: [
          "The parts snap together: head onto the torso, torso onto the hips, accessory into the hand. The 3D preview checks fit only digitally, so try it out before you give it away.",
        ],
      },
      {
        heading: "Wrap and give",
        items: [
          "Pack the figure assembled in a small box or bag.",
          "Add a note with the name you gave the figure in the Builder.",
          "You can also give the parts loose so the person assembles the figure themselves.",
        ],
      },
      {
        heading: "Safety",
        paragraphs: ["Minifigures and their parts are small parts. They are not suitable for children under three years."],
      },
    ],
  },
};
