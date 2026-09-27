import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import { searchDocumentsSchema, searchTestsetSchema } from "../src/contracts/search-ff21.js";
import type { SearchTestCase } from "../src/contracts/search-ff21.js";
import assortmentJson from "../data/curated/ff03-test-assortment.json" with { type: "json" };

const updatedAt = "2026-09-27T16:30:00Z";
const sourcePolicy = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;
const assortment = testAssortmentSchema.parse(assortmentJson);
const assortmentRaw = await readFile(resolve(process.cwd(), "data/curated/ff03-test-assortment.json"));
const assortmentSha256 = createHash("sha256").update(assortmentRaw).digest("hex");
const outputDir = resolve(process.cwd(), "data/curated");

const tokens = (value: string): string[] => [...new Set(value
  .toLocaleLowerCase("en-US")
  .replaceAll("[", " ")
  .replaceAll("]", " ")
  .replaceAll(",", " ")
  .replaceAll("/", " ")
  .split(/\s+/u)
  .map((token) => token.trim())
  .filter((token) => token.length > 2))];

const documents = assortment.components.map((component) => {
  const colorName = component.colorEvidence[0]?.colorName ?? "unknown";
  const englishText = `${component.name}. ${component.rebrickableCategoryName}. ${colorName}.`;
  return {
    id: `searchdoc:${component.id}`,
    componentId: component.id,
    rebrickablePartNum: component.rebrickablePartNum,
    originalName: component.name,
    categoryName: component.rebrickableCategoryName,
    categoryRole: component.role,
    colorName,
    catalogEvidenceIds: component.catalogEvidenceIds,
    englishText,
    annotation: {
      status: "catalog-derived" as const,
      terms: tokens(`${component.name} ${component.rebrickableCategoryName} ${colorName}`),
      note: "Terms are copied or normalized from the Rebrickable catalog name, category, and locked color row; no shape, fit, or MOC claim is added.",
    },
  };
});

const documentsArtifact = searchDocumentsSchema.parse({
  schemaVersion: 1,
  ticket: "FF-21",
  updatedAt,
  sourcePolicy,
  sourceAssortmentSha256: assortmentSha256,
  normalizerVersion: "de-en-domain-v1",
  documentSchemaVersion: "catalog-name-category-color-v1",
  reviewStatus: "catalog-fields-verified; annotations-human-review-pending",
  documents,
});
const documentsContent = `${JSON.stringify(documentsArtifact, null, 2)}\n`;
const documentsSha256 = createHash("sha256").update(documentsContent, "utf8").digest("hex");

const base = (id: string, sourceForms: string[], targetTerms: string[], categoryRole: "head" | "headwear" | "torsoAssembly" | "legsAssembly" | "handAccessory" | null = null) => ({
  id,
  sourceForms,
  targetTerms,
  relatedTerms: [],
  kind: "term" as const,
  categoryRole,
  colorName: null,
  warning: null,
});

const lexicon = {
  schemaVersion: 1 as const,
  ticket: "FF-21" as const,
  normalizerVersion: "de-en-domain-v1" as const,
  updatedAt,
  sourcePolicy,
  baseLexiconPath: "data/curated/ff17-search-lexicon.json" as const,
  baseLexiconSha256: createHash("sha256").update(await readFile(resolve(process.cwd(), "data/curated/ff17-search-lexicon.json"))).digest("hex"),
  reviewStatus: "proposed; human-review-pending" as const,
  entries: [
    base("term:schlicht", ["schlicht", "schlichte"], ["plain"]),
    base("term:grinsen", ["grinsen", "grinsend"], ["grin", "smile"], "head"),
    base("term:augenbrauen", ["augenbrauen"], ["eyebrows"], "head"),
    base("term:pony", ["pony", "pferdeschwanz"], ["ponytail"], "headwear"),
    base("term:glatt", ["glatt", "glatte"], ["smooth"], "headwear"),
    base("term:kurz", ["kurz", "kurze"], ["short"]),
    base("term:seitenpartie", ["seitenpartie"], ["side part"], "headwear"),
    base("term:torso", ["torso", "oberkörper", "oberkoerper"], ["torso"], "torsoAssembly"),
    base("term:arme", ["arme", "arm"], ["arms"], "torsoAssembly"),
    base("term:beine", ["beine", "bein"], ["legs"], "legsAssembly"),
    base("term:spitzhacke", ["spitzhacke", "hacke"], ["pickaxe"], "handAccessory"),
    base("term:gezackt", ["gezackt", "gezacktes"], ["jagged"], "handAccessory"),
  ],
};

type Role = "head" | "headwear" | "torsoAssembly" | "legsAssembly" | "handAccessory";
type Theme = "everyday" | "fantasy" | "space";
const roles: Role[] = ["head", "headwear", "torsoAssembly", "legsAssembly", "handAccessory"];
const themes: Theme[] = ["everyday", "fantasy", "space"];
const byPart = new Map(assortment.components.map((component) => [component.rebrickablePartNum, component]));
const roleFor = (partNum: string): Role => {
  const role = byPart.get(partNum)?.role;
  if (!role || !roles.includes(role)) throw new Error(`Unknown FF-21 role for ${partNum}`);
  return role;
};
const intent = (partNum: string, reason: string) => {
  const component = byPart.get(partNum);
  if (!component) throw new Error(`Unknown FF-21 component ${partNum}`);
  return { componentId: component.id, reason };
};

const germanPlans: Array<[string, string, string, string]> = [
  ["schlichter schwarzer Kopf", "3626c", "de-head-plain", "plain head"],
  ["einfacher schwarzer Kopf", "3626c", "de-head-plain", "plain head"],
  ["gelber Kopf mit Standardgrinsen", "3626cpr0001", "de-head-grin", "grinning head"],
  ["gelbes Grinsegesicht", "3626cpr0001", "de-head-grin", "grinning head"],
  ["Kopf mit braunen Augenbrauen", "3626cpr0387", "de-head-brows", "printed head"],
  ["erschrockener gelber Kopf", "3626cpr0495", "de-head-scared", "printed head"],
  ["zerzaustes mittellanges Haar", "10048", "de-hair-tousled", "tousled hair"],
  ["welliges Haar mit Pferdeschwanz", "25405", "de-hair-pony", "ponytail hair"],
  ["gelbes Haar mit Seitenpartie", "25409", "de-hair-side", "side-part hair"],
  ["kurzer Bob mit Seitenpartie", "36268", "de-hair-bob", "bob hair"],
  ["glattes schwarzes Haar", "3901", "de-hair-smooth", "smooth hair"],
  ["schlichter schwarzer Torso", "3814", "de-torso-plain", "plain torso"],
  ["Torso mit gelben Armen", "973c01h01", "de-torso-arms", "yellow-arm torso"],
  ["graue Beine mit gelben Hüften", "970c01", "de-legs-plain", "plain legs"],
  ["schwarze bedruckte Beine", "970c01pr0001", "de-legs-printed", "printed legs"],
  ["kleines silbernes Schwert", "10053", "de-sword-small", "small sword"],
  ["gezacktes Schwert", "11439", "de-sword-jagged", "jagged sword"],
  ["goldene Spitzhacke", "3841", "de-pickaxe", "pickaxe"],
  ["schwarzer Kopf ohne Druck", "3626c", "de-head-plain", "plain head"],
  ["gelber Kopf mit dünnem Grinsen", "3626cpr0387", "de-head-brows", "printed head"],
  ["braunes zerzaustes Haar", "10048", "de-hair-tousled", "tousled hair"],
  ["glattes Haar in Schwarz", "3901", "de-hair-smooth", "smooth hair"],
  ["schlichter Oberkörper", "3814", "de-torso-plain", "plain torso"],
  ["Oberkörper mit gelben Händen", "973c01h01", "de-torso-arms", "yellow-arm torso"],
  ["ungeprintete Beine", "970c01", "de-legs-plain", "plain legs"],
  ["Beine mit schwarzer Markierung", "970c01pr0001", "de-legs-printed", "printed legs"],
  ["kleines Schwert für die Hand", "10053", "de-sword-small", "small sword"],
  ["Schwert mit gezackten Kanten", "11439", "de-sword-jagged", "jagged sword"],
  ["Spitzhacke in Perl Gold", "3841", "de-pickaxe", "pickaxe"],
  ["gelber Kopf mit offenem Lächeln", "3626cpr0008", "de-head-smile", "printed head"],
];
const englishPlans: Array<[string, string, string, string]> = [
  ["plain black minifig head", "3626c", "en-head-plain", "plain head"],
  ["unprinted black head", "3626c", "en-head-plain", "plain head"],
  ["standard grin yellow head", "3626cpr0001", "en-head-grin", "grinning head"],
  ["yellow head with open smile", "3626cpr0008", "en-head-smile", "printed head"],
  ["tousled mid-length hair", "10048", "en-hair-tousled", "tousled hair"],
  ["wavy ponytail hair", "25405", "en-hair-pony", "ponytail hair"],
  ["short bob side part hair", "36268", "en-hair-bob", "bob hair"],
  ["smooth black hair", "3901", "en-hair-smooth", "smooth hair"],
  ["plain black torso", "3814", "en-torso-plain", "plain torso"],
  ["torso with yellow arms and hands", "973c01h01", "en-torso-arms", "yellow-arm torso"],
  ["plain legs", "970c01", "en-legs-plain", "plain legs"],
  ["printed black legs", "970c01pr0001", "en-legs-printed", "printed legs"],
  ["small silver sword", "10053", "en-sword-small", "small sword"],
  ["jagged edge sword", "11439", "en-sword-jagged", "jagged sword"],
  ["pearl gold pickaxe", "3841", "en-pickaxe", "pickaxe"],
  ["head with brown eyebrows", "3626cpr0387", "en-head-brows", "printed head"],
  ["scared smiling head", "3626cpr0495", "en-head-scared", "printed head"],
  ["hair with side part", "25409", "en-hair-side", "side-part hair"],
  ["yellow marked legs", "970c01pr0001", "en-legs-printed", "printed legs"],
  ["short weapon sword", "10053", "en-sword-small", "small sword"],
];
const typoPlans: Array<[string, string, string]> = [
  ["ogerkopf", "3626c", "typo-ogre-head"],
  ["langesschwert", "10053", "typo-long-sword"],
  ["glatthaar", "3901", "typo-smooth-hair"],
  ["pferdeschwanzhaar", "25405", "typo-ponytail"],
  ["spitzhacke", "3841", "typo-pickaxe"],
  ["zackenschwert", "11439", "typo-jagged-sword"],
  ["schwartzer kopf", "3626c", "typo-black-head"],
  ["gelbarmtorso", "973c01h01", "typo-yellow-arm-torso"],
  ["haareseitenpartie", "25409", "typo-side-part"],
  ["kleinesschwert", "10053", "typo-small-sword"],
];
const ambiguityPlans: Array<[string, string, string]> = [
  ["ohne Helm", "3626c", "negation-no-helmet"],
  ["Schild", "3841", "ambiguity-shield"],
  ["ohne schwarze Haare", "3901", "negation-no-black-hair"],
  ["Schild ohne Schwert", "11439", "ambiguity-shield-sword"],
  ["Kopf aber kein Helm", "3626cpr0001", "negation-head-no-helmet"],
  ["not a helmet, find head", "3626c", "negation-head-not-helmet"],
  ["shield sign or hand shield", "3841", "ambiguity-shield-en"],
  ["without sword", "10053", "negation-no-sword"],
  ["no black hair", "3901", "negation-no-black-hair-en"],
  ["plain head not helmet", "3626c", "ambiguity-head-helmet"],
];
const unfulfillablePlans: Array<[string, string]> = [
  ["purple dragon wing", "unfulfillable-dragon"],
  ["transparent astronaut cape", "unfulfillable-cape"],
  ["wooden minifig beard", "unfulfillable-beard"],
  ["glowing crystal tail", "unfulfillable-tail"],
  ["red laser blast effect", "unfulfillable-laser"],
  ["blue alien tentacle head", "unfulfillable-alien"],
  ["golden wizard robe", "unfulfillable-robe"],
  ["invisible shield", "unfulfillable-invisible-shield"],
  ["mechanical robot wing", "unfulfillable-robot-wing"],
  ["rainbow dinosaur helmet", "unfulfillable-dinosaur"],
];

const holdoutReplacements: ReadonlyArray<readonly [RegExp, string]> = [
  [/schlichter/giu, "unverzierter"],
  [/schlichte/giu, "unverzierte"],
  [/schwarzer/giu, "dunkler"],
  [/schwarzes/giu, "dunkles"],
  [/schwarze/giu, "dunkle"],
  [/gelber/giu, "hellgelber"],
  [/gelbes/giu, "hellgelbes"],
  [/gelben/giu, "hellgelben"],
  [/Kopf/gu, "Minifigurenkopf"],
  [/Haare/gu, "Frisur"],
  [/Haar/gu, "Frisur"],
  [/Torso/gu, "Oberkörper"],
  [/Beine/gu, "Beinbaugruppe"],
  [/Schwert/gu, "Klinge"],
  [/Spitzhacke/gu, "Pickelwerkzeug"],
  [/plain/giu, "unprinted"],
  [/black/giu, "dark"],
  [/yellow/giu, "bright yellow"],
  [/head/giu, "minifig face piece"],
  [/hair/giu, "hairstyle"],
  [/torso/giu, "upper body"],
  [/legs/giu, "lower body"],
  [/sword/giu, "blade weapon"],
  [/pickaxe/giu, "mining tool"],
  [/shield/giu, "protective sign"],
  [/helmet/giu, "head protection"],
  [/dragon/giu, "wyvern"],
  [/astronaut/giu, "space explorer"],
  [/wizard/giu, "mage"],
  [/robot/giu, "android"],
  [/dinosaur/giu, "prehistoric creature"],
];

const holdoutQuery = (query: string, index: number): string => {
  let result = query;
  for (const [pattern, replacement] of holdoutReplacements) result = result.replace(pattern, replacement);
  return result === query ? `${query} Variante ${index + 1}` : result;
};

const makeCase = (split: "development" | "holdout", stratum: "german" | "english" | "typo-compound" | "ambiguity-negation" | "unfulfillable", index: number, query: string, group: string, partNum: string | null, language: "de" | "en" | "mixed", reason: string): SearchTestCase => {
  const role = partNum ? roleFor(partNum) : roles[index % roles.length] as Role;
  return {
    id: `ff21-${split === "development" ? "dev" : "holdout"}-${stratum}-${String(index + 1).padStart(2, "0")}`,
    split,
    stratum,
    language,
    domain: role,
    theme: themes[index % themes.length] as Theme,
    query: split === "holdout" ? holdoutQuery(query, index) : query,
    paraphraseGroup: `paraphrase:${split}:${group}`,
    proposedIntent: partNum ? intent(partNum, reason) : null,
    reviewStatus: "pending-human-relevance-review" as const,
  };
};

const buildCases = (split: "development" | "holdout") => {
  const cases = [];
  for (let i = 0; i < germanPlans.length; i += 1) {
    const [query, part, group, reason] = germanPlans[i]!;
    cases.push(makeCase(split, "german", i, query, group, part, "de", reason));
  }
  for (let i = 0; i < englishPlans.length; i += 1) {
    const [query, part, group, reason] = englishPlans[i]!;
    cases.push(makeCase(split, "english", i, query, group, part, "en", reason));
  }
  for (let i = 0; i < typoPlans.length; i += 1) {
    const [query, part, group] = typoPlans[i]!;
    cases.push(makeCase(split, "typo-compound", i, query, group, part, i % 2 === 0 ? "de" : "mixed", "Candidate intent is a draft for human review; spelling and compound behavior must be judged."));
  }
  for (let i = 0; i < ambiguityPlans.length; i += 1) {
    const [query, part, group] = ambiguityPlans[i]!;
    cases.push(makeCase(split, "ambiguity-negation", i, query, group, part, i < 5 ? "de" : "en", "Ambiguous or negated intent is deliberately not converted into an automatic relevance label."));
  }
  for (let i = 0; i < unfulfillablePlans.length; i += 1) {
    const [query, group] = unfulfillablePlans[i]!;
    cases.push(makeCase(split, "unfulfillable", i, query, group, null, i % 2 === 0 ? "en" : "de", "Expected to be unfulfillable, but a human must confirm that no catalog candidate satisfies the request."));
  }
  return cases;
};

const cases = [...buildCases("development"), ...buildCases("holdout")];
const testsetArtifact = searchTestsetSchema.parse({
  schemaVersion: 1,
  ticket: "FF-21",
  updatedAt,
  sourcePolicy,
  sourceDocumentsPath: "data/curated/ff21-search-documents.json",
  sourceDocumentsSha256: documentsSha256,
  holdoutPolicy: "Holdout bleibt bis zur Profilentscheidung unangetastet.",
  relevanceDefinition: "Menschliche Relevanzstufen 0/1/2; keine E5-Proxylabels.",
  cases,
});

const writeJson = async (fileName: string, value: unknown): Promise<void> => {
  await mkdir(dirname(resolve(outputDir, fileName)), { recursive: true });
  await writeFile(resolve(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

await writeJson("ff21-search-documents.json", documentsArtifact);
await writeJson("ff21-search-lexicon.json", lexicon);
await writeJson("ff21-search-testset.json", testsetArtifact);
console.log(JSON.stringify({ message: "FF-21 search artifacts generated", documentCount: documents.length, testCaseCount: cases.length, developmentCount: 80, holdoutCount: 80 }));
