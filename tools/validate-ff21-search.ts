import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { searchDocumentsSchema, ff21SearchLexiconSchema, searchTestsetSchema } from "../src/contracts/search-ff21.js";
import { testAssortmentSchema } from "../src/contracts/test-assortment.js";
import assortmentJson from "../data/curated/ff03-test-assortment.json" with { type: "json" };
import documentsJson from "../data/curated/ff21-search-documents.json" with { type: "json" };
import lexiconJson from "../data/curated/ff21-search-lexicon.json" with { type: "json" };
import testsetJson from "../data/curated/ff21-search-testset.json" with { type: "json" };

const assortmentPath = resolve(process.cwd(), "data/curated/ff03-test-assortment.json");
const documentsPath = resolve(process.cwd(), "data/curated/ff21-search-documents.json");
const lexiconPath = resolve(process.cwd(), "data/curated/ff21-search-lexicon.json");
const assortmentRaw = await readFile(assortmentPath);
const documentsRaw = await readFile(documentsPath);
const lexiconRaw = await readFile(lexiconPath);
const assortment = testAssortmentSchema.parse(assortmentJson);
const documents = searchDocumentsSchema.parse(documentsJson);
const lexicon = ff21SearchLexiconSchema.parse(lexiconJson);
const testset = searchTestsetSchema.parse(testsetJson);
const assortmentSha256 = createHash("sha256").update(assortmentRaw).digest("hex");
const documentsSha256 = createHash("sha256").update(documentsRaw).digest("hex");
const lexiconSha256 = createHash("sha256").update(lexiconRaw).digest("hex");

if (documents.sourceAssortmentSha256 !== assortmentSha256) throw new Error("FF-21 documents are stale against FF-03");
if (testset.sourceDocumentsSha256 !== documentsSha256) throw new Error("FF-21 testset is stale against search documents");
if (lexicon.baseLexiconSha256 !== createHash("sha256").update(await readFile(resolve(process.cwd(), lexicon.baseLexiconPath))).digest("hex")) throw new Error("FF-21 lexicon base is stale");
if (documents.documents.length !== assortment.components.length) throw new Error("FF-21 must document every FF-03 component");
const componentIds = new Set(assortment.components.map(({ id }) => id));
for (const document of documents.documents) {
  if (!componentIds.has(document.componentId)) throw new Error(`FF-21 document references unknown component ${document.componentId}`);
  if (document.englishText.includes("MOC") || document.englishText.includes("moc")) throw new Error("FF-21 document contains forbidden MOC text");
}
if (testset.cases.some(({ reviewStatus }) => reviewStatus !== "pending-human-relevance-review")) throw new Error("FF-21 cases must remain human-review pending");

console.log(JSON.stringify({
  message: "FF-21 search documents, lexicon and stratified testset valid",
  documentCount: documents.documents.length,
  lexiconEntryCount: lexicon.entries.length,
  testCaseCount: testset.cases.length,
  developmentCount: testset.cases.filter(({ split }) => split === "development").length,
  holdoutCount: testset.cases.filter(({ split }) => split === "holdout").length,
  artifactSha256: { documents: documentsSha256, lexicon: lexiconSha256 },
  humanRelevanceLabelsPresent: false,
  sourcePolicy: documents.sourcePolicy,
}));
