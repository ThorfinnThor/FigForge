import { GUIDE_SLUGS, type GuideSlugId } from "../app/routing.js";
import type { Language } from "../i18n.js";

export type GuideId = GuideSlugId;

export type GuideSection = {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  /** Render the items as a numbered list (steps) instead of bullets. */
  ordered?: boolean;
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
  anatomy: { published: "2026-10-22", modified: "2026-10-22" },
  bricklink: { published: "2026-10-22", modified: "2026-10-22" },
  "pick-a-brick": { published: "2026-10-22", modified: "2026-10-22" },
  profession: { published: "2026-10-22", modified: "2026-10-22" },
  colors: { published: "2026-10-22", modified: "2026-10-22" },
};

export const GUIDE_SECTIONS: Record<GuideId, Record<Language, readonly GuideSection[]>> = {
  order: {
    de: [
      {
        heading: "Die Teileliste aus Create Your Minifig",
        paragraphs: [
          "Öffne im Builder „Teile kaufen“. Bei Teilen, die es in mehreren Farben gibt, wählst du dort die gewünschte Farbe. Danach lädst du die Liste für den Kaufweg deiner Wahl herunter. Create Your Minifig zeigt dir, wie viele Teile pro Weg enthalten sind.",
          "Teile ohne belegte Zuordnung stehen nicht in der Liste, sondern unter „Warum fehlen manche Teile?“. Create Your Minifig rät keine Nummern: Eine falsche Zuordnung hieße am Ende ein falsches Teil im Paket.",
        ],
      },
      {
        heading: "Weg 1: Rebrickable-Teileliste",
        paragraphs: [
          "Du importierst die CSV in deine Teilelisten bei Rebrickable und kaufst von dort über BrickLink oder Brick Owl. In Create Your Minifig ist das der empfohlene Weg, weil er ältere und bedruckte Minifiguren-Teile am besten abdeckt.",
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
          "So geht der Import: Klicke in Create Your Minifig auf „XML kopieren“, öffne bei BrickLink die Seite „Upload to Wanted List“, wechsle zum Tab „Upload BrickLink XML format“ und füge den Text dort ein. Der andere Tab, „Upload a file from your computer“, nimmt nur BrickStock-, LDraw-, Digital-Designer- und Studio-Dateien an, kein XML.",
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
          "Farbe: Stimmt sie mit deiner Auswahl in Create Your Minifig überein?",
          "Teilenummer und Aufdruck: Vergleiche sie mit dem Foto im Shop. Wie die Nummern aufgebaut sind, erklärt der Ratgeber „Teilenummern verstehen“.",
          "Preis, Versand, Lieferzeit und Verfügbarkeit zeigt nur der Shop. Create Your Minifig verkauft nichts und nennt keine Preise.",
        ],
        closing: [
          "Die 3D-Vorschau prüft die Passung digital. Sie ist keine Garantie, dass die Teile in echt zusammenhalten.",
        ],
      },
    ],
    en: [
      {
        heading: "The parts list from Create Your Minifig",
        paragraphs: [
          "Open “Buy parts” in the Builder. For parts that exist in several colors, choose the color you want there. Then download the list for the way of buying you prefer. Create Your Minifig shows how many parts each list contains.",
          "Parts without a documented mapping are not in the list; they appear under “Why are some parts missing?”. Create Your Minifig does not guess numbers: a wrong mapping would mean a wrong part in your parcel.",
        ],
      },
      {
        heading: "Option 1: Rebrickable parts list",
        paragraphs: [
          "You import the CSV into your part lists at Rebrickable and buy from there through BrickLink or Brick Owl. Create Your Minifig recommends this route because it covers older and printed minifigure parts best.",
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
          "This is how the import works: click “Copy XML” in Create Your Minifig, open the “Upload to Wanted List” page at BrickLink, switch to the “Upload BrickLink XML format” tab and paste the text there. The other tab, “Upload a file from your computer”, only accepts BrickStock, LDraw, Digital Designer and Studio files, not XML.",
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
          "Color: does it match your choice in Create Your Minifig?",
          "Part number and print: compare them with the photo in the shop. The guide “Understand part numbers” explains how the numbers are built.",
          "Price, shipping, delivery time and availability are shown only by the shop. Create Your Minifig sells nothing and quotes no prices.",
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
          "Rebrickable, BrickLink und LDraw, die Bibliothek der 3D-Modelle, nummerieren nicht überall gleich. Create Your Minifig zeigt im Builder die Rebrickable-Nummer und auf den Themenseiten die LDraw-Nummer. Für BrickLink ordnet Create Your Minifig nur zu, wenn die Zuordnung belegt ist; sonst bleibt das Teil für diese Liste gesperrt.",
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
          "Rebrickable, BrickLink and LDraw, the library of the 3D models, do not number everything alike. Create Your Minifig shows the Rebrickable number in the Builder and the LDraw number on the theme pages. For BrickLink, Create Your Minifig only maps a part when the mapping is documented; otherwise the part stays blocked for that list.",
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
  anatomy: {
    de: [
      {
        heading: "Fünf Plätze für fünf Teile",
        paragraphs: [
          "In Create Your Minifig hat jede Figur fünf Plätze: Kopf, Kopfbedeckung, Oberkörper, Beine und Handzubehör. Du tauschst jeden Platz einzeln aus, die anderen bleiben unverändert.",
        ],
        items: [
          "Kopf: Er sitzt oben auf dem Oberkörper. Sehr viele Köpfe tragen einen Aufdruck, etwa ein Gesicht, einen Bart oder eine Augenklappe.",
          "Kopfbedeckung: Hut, Helm, Mütze oder Haare. Sie wird auf den Kopf gesteckt und ist ein eigenes Teil. Manche Figuren haben keine.",
          "Oberkörper: der Torso mit Aufdruck. Im Katalog steht er meist samt Armen und Händen als eine Baugruppe.",
          "Beine: Hüfte und Beine in einem Eintrag, oft mit Aufdruck.",
          "Handzubehör: das, was die Figur in der Hand hält, zum Beispiel ein Säbel, ein Fernrohr oder ein Werkzeug.",
        ],
      },
      {
        heading: "Ein Beispiel: der Piratenkapitän",
        paragraphs: [
          "Die Vorlage „Piratenkapitän“ besteht aus diesen fünf Teilen. Die Namen sind die Katalognamen von Rebrickable, die Nummern die LDraw-Nummern, wie sie auch auf der Themenseite Piraten stehen.",
        ],
        items: [
          "Kopf, 3626bpr0027: Minifig Head Pirate, Eyepatch, Stubble and Reddish-Brown Hair Print",
          "Kopfbedeckung, 2528pr0002: Hat Pirate Bicorne (Admiral) with Gold Captain Print",
          "Oberkörper, 973c01h01pr0030: Torso, Vest, Purple, Anchor Tattoo Print, Yellow Arms and Hands",
          "Beine, 970c01pr0123: Hips and Yellow Legs with Castaway Rags and Patch Print",
          "Handzubehör, 2530: Weapon Sword / Cutlass",
        ],
        closing: [
          "Wie solche Nummern aufgebaut sind, erklärt der Ratgeber „Minifiguren-Teilenummern verstehen“.",
        ],
      },
      {
        heading: "Warum Oberkörper und Beine mehrere Teile in einem sind",
        paragraphs: [
          "Ein Oberkörper besteht in der Praxis aus dem Torso, zwei Armen und zwei Händen, die Beine aus der Hüfte und zwei Beinen. Die Kataloge führen sie oft als eine Baugruppe. Du erkennst sie am „c“ in der Nummer: 973c01h01pr0030 ist ein Torso samt Armen und Händen, 970c01pr0123 eine Hüfte mit Beinen.",
          "In Create Your Minifig tauschst du diese Baugruppen als Ganzes. Welche Farbe Arme und Hände haben, steht im Namen, zum Beispiel „Yellow Arms and Hands“.",
        ],
      },
      {
        heading: "Wie die Teile zusammenpassen",
        paragraphs: [
          "Der Kopf steckt oben auf dem Oberkörper, die Kopfbedeckung auf dem Kopf, der Oberkörper sitzt auf der Hüfte, und das Zubehör kommt in die Hand. Create Your Minifig prüft diese Verbindungen digital mit geprüften Anschlussprofilen. Teile, für die kein Profil belegt ist, bleiben gesperrt.",
        ],
        closing: [
          "Die 3D-Vorschau ist eine digitale Prüfung und keine Garantie für die Passform im echten Bausatz.",
        ],
      },
      {
        heading: "So tauschst du ein Teil im Builder",
        items: [
          "Wähle den Bereich: Köpfe, Kopfbedeckung, Oberkörper, Beine oder Zubehör.",
          "Suche mit einem Wort oder nutze die Filter.",
          "Klicke bei einem Teil auf „Einsetzen“. Es erscheint sofort in der 3D-Vorschau.",
          "Unter „Deine Figur“ siehst du alle fünf Plätze mit ihren Nummern.",
        ],
        closing: [
          "Ist die Figur fertig, erklärt der Ratgeber „Minifiguren-Teile bestellen“, wie du an die echten Teile kommst.",
        ],
      },
    ],
    en: [
      {
        heading: "Five slots for five parts",
        paragraphs: [
          "In Create Your Minifig every figure has five slots: head, headwear, torso, legs and hand accessory. You swap each slot on its own; the others stay as they are.",
        ],
        items: [
          "Head: It sits on top of the torso. Very many heads carry a print, such as a face, a beard or an eyepatch.",
          "Headwear: a hat, helmet, cap or hair. It is pushed onto the head and is a part of its own. Some figures have none.",
          "Torso: the torso with its print. In the catalog it is usually listed together with arms and hands as one assembly.",
          "Legs: hips and legs in one entry, often with a print.",
          "Hand accessory: whatever the figure holds, for example a sword, a spyglass or a tool.",
        ],
      },
      {
        heading: "An example: the pirate captain",
        paragraphs: [
          "The “Pirate captain” template is made of these five parts. The names are the Rebrickable catalog names; the numbers are the LDraw numbers, as shown on the pirates theme page.",
        ],
        items: [
          "Head, 3626bpr0027: Minifig Head Pirate, Eyepatch, Stubble and Reddish-Brown Hair Print",
          "Headwear, 2528pr0002: Hat Pirate Bicorne (Admiral) with Gold Captain Print",
          "Torso, 973c01h01pr0030: Torso, Vest, Purple, Anchor Tattoo Print, Yellow Arms and Hands",
          "Legs, 970c01pr0123: Hips and Yellow Legs with Castaway Rags and Patch Print",
          "Hand accessory, 2530: Weapon Sword / Cutlass",
        ],
        closing: [
          "How such numbers are built is explained in the guide “Understand minifigure part numbers”.",
        ],
      },
      {
        heading: "Why torso and legs are several parts in one",
        paragraphs: [
          "In practice a torso consists of the torso itself, two arms and two hands, and the legs of the hips and two legs. Catalogs often list them as one assembly. You recognize them by the “c” in the number: 973c01h01pr0030 is a torso with arms and hands, 970c01pr0123 is hips with legs.",
          "In Create Your Minifig you swap these assemblies as a whole. The color of arms and hands is part of the name, for example “Yellow Arms and Hands”.",
        ],
      },
      {
        heading: "How the parts fit together",
        paragraphs: [
          "The head sits on top of the torso, the headwear on the head, the torso on the hips, and the accessory goes into the hand. Create Your Minifig checks these connections digitally with verified connection profiles. Parts without a documented profile stay locked.",
        ],
        closing: [
          "The 3D preview is a digital check, not a guarantee that the parts fit in a real set.",
        ],
      },
      {
        heading: "How to swap a part in the Builder",
        items: [
          "Choose the area: heads, headwear, torsos, legs or accessories.",
          "Search with a word or use the filters.",
          "Click “Insert” on a part. It appears in the 3D preview right away.",
          "Under “Your figure” you see all five slots with their numbers.",
        ],
        closing: [
          "Once the figure is done, the guide “Order minifigure parts” explains how to get the real parts.",
        ],
      },
    ],
  },
  bricklink: {
    de: [
      {
        heading: "Was du brauchst",
        items: [
          "Eine fertige Figur in Create Your Minifig, bei der unter „Farben bestätigen“ für alle Teile eine Farbe gewählt ist.",
          "Ein BrickLink-Konto. Die Wanted List legst du nur angemeldet an.",
        ],
      },
      {
        heading: "Schritt für Schritt",
        ordered: true,
        items: [
          "Öffne in Create Your Minifig „Teile kaufen“ und suche den Kaufweg „BrickLink-Wanted-List“.",
          "Klicke auf „XML kopieren“. Die Teileliste liegt jetzt als Text in deiner Zwischenablage.",
          "Öffne mit „BrickLink-Upload öffnen“ die Seite bei BrickLink. Das ist die Seite „Upload to Wanted List“.",
          "Wechsle dort zum Tab „Upload BrickLink XML format“ und füge den Text in das Feld ein.",
          "Schicke den Import ab und prüfe die Wanted List: Stimmen Teilenummer, Farbe und Menge mit deiner Figur überein?",
        ],
      },
      {
        heading: "Warum der Datei-Upload nicht funktioniert",
        paragraphs: [
          "Der Tab „Upload a file from your computer“ nimmt nur Dateien von BrickStock, LDraw, Digital Designer und Studio an, also keine XML-Datei. Das ist die häufigste Fehlerquelle. Die XML von Create Your Minifig gehört in den Tab „Upload BrickLink XML format“.",
        ],
      },
      {
        heading: "Fehlermeldung „Content is not allowed in prolog“",
        paragraphs: [
          "Die Meldung heißt, dass BrickLink am Anfang des Textes kein gültiges XML findet. Typisch ist Text, den du aus der Anzeige einer XML-Datei im Browser kopiert hast: Der Browser zeigt nur den Inhalt, die Tags fehlen. Der Text muss mit <INVENTORY> beginnen.",
        ],
        items: [
          "Nimm den Button „XML kopieren“ in Create Your Minifig. Er übergibt den rohen Text mit allen Tags.",
          "Hast du die Datei geladen, öffne sie in einem Texteditor und nicht im Browser und kopiere den gesamten Text.",
          "Achte darauf, dass vor <INVENTORY> nichts steht, auch keine Anführungszeichen.",
        ],
      },
      {
        heading: "Was in der Liste steht",
        paragraphs: [
          "Jede Zeile enthält eine BrickLink-Teilenummer, eine BrickLink-Farbnummer und die Menge. Die Farben stammen aus deiner Auswahl in Create Your Minifig. Ein Teil in Reddish Brown trägt zum Beispiel die BrickLink-Farbnummer 88, bei Rebrickable heißt dieselbe Farbe 70. Warum das so ist, erklärt der Ratgeber „Farbnamen und Farbnummern“.",
          "Teile ohne belegte BrickLink-Zuordnung stehen nicht in der Liste. Create Your Minifig nennt sie unter „Warum fehlen manche Teile?“, statt Nummern zu raten.",
        ],
      },
      {
        heading: "Danach",
        items: [
          "Vergleiche Teilenummer und Farbe in der Wanted List mit deiner Figur in der Vorschau.",
          "Preise, Verfügbarkeit und Versand zeigt nur BrickLink. Create Your Minifig nennt keine Preise.",
          "Führt kein Shop alle Teile, besteht die Figur am Ende aus mehreren Bestellungen mit je eigenen Versandkosten.",
        ],
      },
    ],
    en: [
      {
        heading: "What you need",
        items: [
          "A finished figure in Create Your Minifig with a color chosen for every part under “Confirm colors”.",
          "A BrickLink account. You can only create a wanted list while signed in.",
        ],
      },
      {
        heading: "Step by step",
        ordered: true,
        items: [
          "Open “Buy parts” in Create Your Minifig and find the buying option “BrickLink Wanted List”.",
          "Click “Copy XML”. The parts list is now in your clipboard as text.",
          "Use “Open BrickLink upload” to open the page at BrickLink. It is the “Upload to Wanted List” page.",
          "Switch to the “Upload BrickLink XML format” tab and paste the text into the field.",
          "Submit the import and check the wanted list: do part number, color and quantity match your figure?",
        ],
      },
      {
        heading: "Why the file upload does not work",
        paragraphs: [
          "The “Upload a file from your computer” tab only accepts BrickStock, LDraw, Digital Designer and Studio files, so no XML file. This is the most common pitfall. The XML from Create Your Minifig belongs in the “Upload BrickLink XML format” tab.",
        ],
      },
      {
        heading: "The error “Content is not allowed in prolog”",
        paragraphs: [
          "The message means BrickLink finds no valid XML at the start of the text. Typical cause: text copied from how the browser displays an XML file. The browser shows only the content, the tags are missing. The text has to start with <INVENTORY>.",
        ],
        items: [
          "Use the “Copy XML” button in Create Your Minifig. It passes the raw text with all tags.",
          "If you downloaded the file, open it in a text editor, not in the browser, and copy all of the text.",
          "Make sure nothing comes before <INVENTORY>, not even quotation marks.",
        ],
      },
      {
        heading: "What is in the list",
        paragraphs: [
          "Each line holds a BrickLink part number, a BrickLink color number and the quantity. The colors come from your choice in Create Your Minifig. A part in Reddish Brown, for example, carries the BrickLink color number 88, while Rebrickable calls the same color 70. The guide “Color names and color numbers” explains why.",
          "Parts without a documented BrickLink mapping are not in the list. Create Your Minifig names them under “Why are some parts missing?” instead of guessing numbers.",
        ],
      },
      {
        heading: "Afterwards",
        items: [
          "Compare part number and color in the wanted list with your figure in the preview.",
          "Only BrickLink shows price, availability and shipping. Create Your Minifig quotes no prices.",
          "If no single store has every part, the figure ends up as several orders, each with its own shipping cost.",
        ],
      },
    ],
  },
  "pick-a-brick": {
    de: [
      {
        heading: "Was die CSV enthält",
        paragraphs: [
          "Die Datei von Create Your Minifig hat zwei Spalten: elementId und quantity. Die Element-ID ist die Nummer, unter der LEGO ein Teil in einer bestimmten Farbe führt. Dasselbe Teil in einer anderen Farbe hat eine andere Element-ID. Die Spalten entsprechen der Vorlage, die LEGO bei Pick a Brick vorgibt.",
        ],
      },
      {
        heading: "Schritt für Schritt",
        ordered: true,
        items: [
          "Setze die Figur im Builder zusammen und öffne „Teile kaufen“.",
          "Wähle unter „Farben bestätigen“ für jedes Teil mit mehreren Farben die gewünschte Farbe.",
          "Klicke beim Kaufweg „Pick a Brick“ auf „Pick-a-Brick-Liste laden“. Du erhältst eine CSV-Datei.",
          "Öffne mit „Pick a Brick öffnen“ die Seite bei LEGO, wähle „Upload List“ und die Datei.",
          "Teile, die LEGO dort nicht führt, meldet die Seite als „Unavailable Pieces“.",
        ],
      },
      {
        heading: "Grenzen",
        items: [
          "Eine Liste darf bis zu 200 verschiedene Teile enthalten und höchstens 5 MB groß sein. Eine Minifigur liegt weit darunter.",
          "LEGO nimmt CSV, JSON und LXFML an. Create Your Minifig erzeugt die CSV.",
          "Es zählen nur Teile, die LEGO aktuell dort führt.",
        ],
      },
      {
        heading: "Warum manche Teile fehlen",
        paragraphs: [
          "Pick a Brick führt nur einen Teil der aktuellen Elemente. Ältere und viele bedruckte Minifiguren-Teile gibt es dort oft nicht. Außerdem hat nicht jedes Teil im Katalog eine belegte Element-ID. Create Your Minifig nimmt nur Teile mit belegter Element-ID in die CSV auf und nennt die übrigen unter „Warum fehlen manche Teile?“.",
          "Ein Beispiel vom 20.10.2026: Bei der Vorlage Piratenkapitän ließ sich nur ein Teil per Pick a Brick exportieren, vier hatten keine Element-ID. Bei Figuren mit bedruckten Teilen ist das häufig.",
        ],
      },
      {
        heading: "Was du bei fehlenden Teilen tust",
        items: [
          "Nimm die Rebrickable-Liste. Sie deckt ältere und bedruckte Teile am besten ab. Gekauft wird dann bei BrickLink oder Brick Owl.",
          "Oder nimm die BrickLink-Wanted-List, wenn du die Shops selbst vergleichen willst.",
          "Du kannst auch mischen: die Teile, die LEGO führt, bei LEGO, den Rest bei einem Marktplatz.",
        ],
      },
      {
        heading: "Vor dem Absenden",
        items: [
          "Preis, Verfügbarkeit und Versand zeigt nur LEGO. Create Your Minifig nennt keine Preise.",
          "Vergleiche Farbe und Aufdruck bei LEGO mit der Vorschau in Create Your Minifig.",
        ],
      },
    ],
    en: [
      {
        heading: "What the CSV contains",
        paragraphs: [
          "The file from Create Your Minifig has two columns: elementId and quantity. The element ID is the number under which LEGO lists a part in a specific color. The same part in another color has another element ID. The columns match the template LEGO provides at Pick a Brick.",
        ],
      },
      {
        heading: "Step by step",
        ordered: true,
        items: [
          "Assemble the figure in the Builder and open “Buy parts”.",
          "Under “Confirm colors”, choose the color for every part that comes in several.",
          "At the “Pick a Brick” option, click “Download Pick a Brick list”. You get a CSV file.",
          "Use “Open Pick a Brick” to open the page at LEGO, choose “Upload List” and the file.",
          "Parts LEGO does not carry there are reported as “Unavailable Pieces”.",
        ],
      },
      {
        heading: "Limits",
        items: [
          "A list can hold up to 200 different parts and be at most 5 MB. A minifigure is far below that.",
          "LEGO accepts CSV, JSON and LXFML. Create Your Minifig creates the CSV.",
          "Only parts LEGO currently carries there count.",
        ],
      },
      {
        heading: "Why some parts are missing",
        paragraphs: [
          "Pick a Brick carries only some of the current elements. Older and many printed minifigure parts are often not available. Also, not every part in the catalog has a documented element ID. Create Your Minifig puts only parts with a documented element ID into the CSV and names the rest under “Why are some parts missing?”.",
          "An example from 20 October 2026: with the Pirate captain template only one part could be exported to Pick a Brick, four had no element ID. This is common for figures with printed parts.",
        ],
      },
      {
        heading: "What to do about missing parts",
        items: [
          "Use the Rebrickable list. It covers older and printed parts best. You then buy at BrickLink or Brick Owl.",
          "Or use the BrickLink wanted list if you want to compare stores yourself.",
          "You can also mix: the parts LEGO carries from LEGO, the rest from a marketplace.",
        ],
      },
      {
        heading: "Before you submit",
        items: [
          "Only LEGO shows price, availability and shipping. Create Your Minifig quotes no prices.",
          "Compare color and print at LEGO with the preview in Create Your Minifig.",
        ],
      },
    ],
  },
  profession: {
    de: [
      {
        heading: "So gehst du vor",
        items: [
          "Überlege, woran man die Person erkennt: an der Kopfbedeckung (Helm, Mütze, Hut), am Oberkörper (Uniform, Kittel, Anzug) oder am Zubehör (Werkzeug, Instrument, Kamera).",
          "Wähle ein bis zwei dieser Merkmale. Mehr wirkt schnell überladen.",
          "Der Rest darf schlicht bleiben, zum Beispiel ein Kopf mit einem Lächeln.",
        ],
      },
      {
        heading: "Suchwörter, die im Builder funktionieren",
        paragraphs: [
          "Das Suchmodell von Create Your Minifig versteht Englisch am besten. Für deutsche Wörter gibt es ein eingebautes Wörterbuch. Diese Wörter stehen darin:",
        ],
        items: [
          "Berufe: Koch, Köchin, Arzt, Ärztin, Feuerwehrmann, Feuerwehrfrau, Bauarbeiter, Astronaut, Astronautin, Kapitän, König, Königin.",
          "Kopfbedeckung: Kochmütze, Feuerwehrhelm, Astronautenhelm, Kapitänshut, Hexenhut, Krone, Helm, Hut, Kappe.",
          "Zubehör: Gitarre, Kamera, Fernglas, Fernrohr, Fackel, Axt, Dolch, Buch, Koffer, Flagge.",
          "Aussehen: Brille, Bart, Augenbrauen, Glatze, Augenklappe.",
        ],
        closing: [
          "Andere deutsche Wörter finden nichts. Probiere dann das englische Wort, zum Beispiel „chef“ oder „police“.",
        ],
      },
      {
        heading: "Ideen nach Themenwelt",
        paragraphs: [
          "Die Themenwelten im Bereich Ideen liefern fertige Vorlagen, die du Teil für Teil änderst:",
        ],
        items: [
          "Piraten: Piratenkapitän, Piraten-Decksmann und Piraten-Ausguck, für Segler und Abenteurer.",
          "Burg: Burgritter, Königliche Burgwache und Waldläufer, für Fans von Mittelalter und Fantasy.",
          "Weltraum: Classic-Space-Entdecker, Weltraumpilot und Roboter-Techniker, für Technikfans.",
          "Feuerwehr und Rettung: Feuerwehrfigur, Einsatzleiter und Rettungsspezialist, für Einsatzkräfte und alle, die Feuerwehr lieben.",
        ],
      },
      {
        heading: "Persönlicher machen",
        items: [
          "Gib der Figur im Builder einen Namen. Er steht in deiner Sammlung.",
          "Tausche nur ein Teil gegen ein Zubehör, das zum Hobby passt. Die Vorlage bleibt sonst erkennbar.",
          "Gibt es ein Teil in mehreren Farben, wähle beim Bestätigen der Farben die Lieblingsfarbe der Person.",
        ],
      },
      {
        heading: "Danach",
        paragraphs: [
          "Wie du von der Figur zu den echten Teilen kommst, steht im Ratgeber „Minifiguren-Teile bestellen“. Verpackung und Sicherheit behandelt der Ratgeber „Eine Minifigur verschenken“.",
        ],
        closing: [
          "Minifiguren und ihre Teile sind Kleinteile und nicht für Kinder unter drei Jahren geeignet.",
        ],
      },
    ],
    en: [
      {
        heading: "How to go about it",
        items: [
          "Think about what identifies the person: the headwear (helmet, cap, hat), the torso (uniform, coat, suit) or the accessory (tool, instrument, camera).",
          "Pick one or two of these traits. More quickly looks overloaded.",
          "The rest can stay simple, for example a head with a smile.",
        ],
      },
      {
        heading: "Search words that work in the Builder",
        paragraphs: [
          "Create Your Minifig's search model understands English best, so these English words work well:",
        ],
        items: [
          "Professions: chef, doctor, firefighter, construction worker, astronaut, captain, king, queen.",
          "Headwear: chef hat, fire helmet, space helmet, captain hat, witch hat, crown, helmet, hat, cap.",
          "Accessories: guitar, camera, binoculars, spyglass, torch, axe, dagger, book, suitcase, flag.",
          "Looks: glasses, beard, eyebrows, bald, eyepatch.",
        ],
        closing: [
          "Search words in English work best. The German dictionary only covers a limited list, so if a German word finds nothing, try the English one.",
        ],
      },
      {
        heading: "Ideas by theme world",
        paragraphs: [
          "The theme worlds in the Ideas section provide finished templates that you change part by part:",
        ],
        items: [
          "Pirates: Pirate captain, Pirate deckhand and Pirate lookout, for sailors and adventurers.",
          "Castle: Castle knight, Royal castle guard and Forest scout, for fans of the Middle Ages and fantasy.",
          "Space: Classic Space explorer, Space pilot and Robot engineer, for tech fans.",
          "Fire and rescue: Firefighter, Fire chief and Rescue specialist, for first responders and everyone who loves fire trucks.",
        ],
      },
      {
        heading: "Making it more personal",
        items: [
          "Give the figure a name in the Builder. It appears in your collection.",
          "Swap only one part for an accessory that fits the hobby. The template stays recognizable that way.",
          "If a part comes in several colors, choose the person's favorite color when you confirm the colors.",
        ],
      },
      {
        heading: "Afterwards",
        paragraphs: [
          "How to get from the figure to the real parts is explained in the guide “Order minifigure parts”. Packaging and safety are covered in the guide “Give a minifigure as a gift”.",
        ],
        closing: [
          "Minifigures and their parts are small parts and not suitable for children under three years.",
        ],
      },
    ],
  },
  colors: {
    de: [
      {
        heading: "Warum die Farbe zur Einkaufsliste gehört",
        paragraphs: [
          "Eine Teilenummer allein reicht beim Kaufen nicht. Ein Oberkörper oder ein Kopf kann in mehreren Farben existieren, und jede Farbe ist ein eigener Artikel mit eigener Nummer. Eine Einkaufsliste besteht deshalb aus Teil, Farbe und Menge.",
        ],
      },
      {
        heading: "Dieselbe Farbe, verschiedene Nummern",
        paragraphs: [
          "Rebrickable und BrickLink nummerieren Farben unterschiedlich. Bei LEGO Pick a Brick steckt die Farbe in der Element-ID, die Teil und Farbe zusammen bezeichnet. Beispiele aus den Katalogdaten von Create Your Minifig:",
        ],
        items: [
          "Black: bei Rebrickable 0, bei BrickLink 11",
          "Brown: bei Rebrickable 6, bei BrickLink 8",
          "Reddish Brown: bei Rebrickable 70, bei BrickLink 88",
          "Light Gray: bei Rebrickable 7, bei BrickLink 9",
          "Light Bluish Gray: bei Rebrickable 71, bei BrickLink 86",
          "Dark Bluish Gray: bei Rebrickable 72, bei BrickLink 85",
        ],
        closing: [
          "Create Your Minifig verwendet die Rebrickable-Farbnamen und rechnet für die BrickLink-XML auf die BrickLink-Farbnummer um. Du musst keine Nummern übersetzen.",
        ],
      },
      {
        heading: "Farben, die man verwechselt",
        paragraphs: [
          "Brown und Reddish Brown sind zwei verschiedene Farben mit eigenen Nummern. Nach den Farbwerten der LDraw-Bibliothek, die Create Your Minifig für die 3D-Vorschau nutzt, ist Reddish Brown (#5F3109) deutlich satter als Brown (#543324).",
          "Auch Light Gray und Light Bluish Gray sind zwei getrennte Farben. Wer ältere und neuere Teile mischt, sollte darauf achten, nicht beide Grautöne zu verwechseln.",
        ],
      },
      {
        heading: "So bestätigst du die Farben in Create Your Minifig",
        items: [
          "Öffne „Teile kaufen“. Unter „Farben bestätigen“ stehen die Teile, für die es mehrere Farben gibt.",
          "Wähle bei jedem dieser Teile die Farbe. Create Your Minifig zeigt „Offene Farbauswahlen“, bis alle gewählt sind.",
          "Ist die Farbe für alle Teile eindeutig, übernimmt Create Your Minifig sie selbst.",
          "Die 3D-Vorschau zeigt die gewählte Farbe als Hauptfarbe des Teils. Feste Farben wie Aufdrucke bleiben, und für einzelne Farben gibt es keine Vorschau.",
        ],
      },
      {
        heading: "Vor dem Kauf prüfen",
        items: [
          "Vergleiche die Farbe im Shop mit dem englischen Namen in Create Your Minifig.",
          "Prüfe bei BrickLink in der Wanted List die Farbe jeder Zeile.",
          "Bei Pick a Brick bestimmt die Element-ID die Farbe. Prüfe das Foto.",
        ],
      },
    ],
    en: [
      {
        heading: "Why the color belongs in the shopping list",
        paragraphs: [
          "A part number alone is not enough when you buy. A torso or a head can exist in several colors, and every color is its own item with its own number. A shopping list therefore consists of part, color and quantity.",
        ],
      },
      {
        heading: "The same color, different numbers",
        paragraphs: [
          "Rebrickable and BrickLink number colors differently. At LEGO Pick a Brick the color is part of the element ID, which identifies part and color together. Examples from Create Your Minifig's catalog data:",
        ],
        items: [
          "Black: 0 at Rebrickable, 11 at BrickLink",
          "Brown: 6 at Rebrickable, 8 at BrickLink",
          "Reddish Brown: 70 at Rebrickable, 88 at BrickLink",
          "Light Gray: 7 at Rebrickable, 9 at BrickLink",
          "Light Bluish Gray: 71 at Rebrickable, 86 at BrickLink",
          "Dark Bluish Gray: 72 at Rebrickable, 85 at BrickLink",
        ],
        closing: [
          "Create Your Minifig uses the Rebrickable color names and converts to the BrickLink color number for the BrickLink XML. You do not have to translate numbers.",
        ],
      },
      {
        heading: "Colors that are easily confused",
        paragraphs: [
          "Brown and Reddish Brown are two different colors with their own numbers. According to the color values of the LDraw library, which Create Your Minifig uses for the 3D preview, Reddish Brown (#5F3109) is clearly richer than Brown (#543324).",
          "Light Gray and Light Bluish Gray are also two separate colors. If you mix older and newer parts, take care not to confuse the two grays.",
        ],
      },
      {
        heading: "How to confirm colors in Create Your Minifig",
        items: [
          "Open “Buy parts”. Under “Confirm colors” you find the parts that exist in several colors.",
          "Choose the color for each of these parts. Create Your Minifig shows “Color choices remaining” until all are chosen.",
          "If the color is clear for every part, Create Your Minifig takes it on its own.",
          "The 3D preview shows the chosen color as the part's main color. Fixed colors such as prints stay, and a few colors have no preview.",
        ],
      },
      {
        heading: "Check before you buy",
        items: [
          "Compare the color in the shop with the English name in Create Your Minifig.",
          "At BrickLink, check the color of every line in the wanted list.",
          "At Pick a Brick the element ID decides the color. Check the photo.",
        ],
      },
    ],
  },
};
