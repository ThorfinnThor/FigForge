import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { catalogPackageSchema, type CatalogPackagePart, type CatalogRole } from "../../src/contracts/catalog-package.js";
import { rebrickableKeywordIds } from "./ldraw-keywords.js";
import { resolveOfficialLDrawMappingFile } from "./ldraw-official-mapping.js";

const SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien." as const;

const packages = [
  ["head", "head.json"],
  ["headwear", "headwear.json"],
  ["torsoAssembly", "torso-assembly.json"],
  ["legsAssembly", "legs-assembly.json"],
  ["handAccessory", "hand-accessory.json"],
] as const satisfies ReadonlyArray<readonly [CatalogRole, string]>;

type MatchType = "exact-filename" | "explicit-keyword" | "rebrickable-print-parent";
type RemainingClassification =
  | "builder-blocked"
  | "render-failed"
  | "placement-profile-required"
  | "ambiguous-official-mapping"
  | "no-official-mapping";

type LDrawCandidate = {
  file: string;
  matchType: MatchType;
};

export type LDrawCatalogCoverageEntry = {
  catalogId: string;
  role: CatalogRole;
  rebrickablePartNum: string;
  name: string;
  classification: RemainingClassification;
  ldrawFiles: string[];
  mappingEvidence: MatchType[];
  reason: string | null;
};

type ClassificationCounts = Record<RemainingClassification, number>;

export type LDrawCatalogCoverageReport = {
  schemaVersion: 1;
  generatedAt: "2026-09-28";
  sourcePolicy: typeof SOURCE_POLICY;
  sources: {
    catalogSourceLockSha256: string;
    ldrawLibrary: string;
    ldrawRelease: string;
    ldrawArchiveSha256: string;
    officialTopLevelPartFiles: number;
    mocFilesUsed: 0;
  };
  methodology: string[];
  classificationDefinitions: Record<RemainingClassification, string>;
  summary: {
    catalogPartCount: number;
    visualizedPartCount: number;
    builderReadyPartCount: number;
    remainingCatalogPartCount: number;
    remainingWithoutVisualizationCount: number;
    uniqueOfficialMappingCount: number;
    ambiguousOfficialMappingCount: number;
    noOfficialMappingCount: number;
    remainingClassifications: ClassificationCounts;
  };
  roles: Record<CatalogRole, {
    catalogPartCount: number;
    builderReadyPartCount: number;
    remainingCatalogPartCount: number;
    remainingClassifications: ClassificationCounts;
  }>;
  remainingEntries: LDrawCatalogCoverageEntry[];
};

const normalize = (value: string): string => value.trim().toLowerCase();
const catalogKey = (role: CatalogRole, partNum: string): string => `${role}:${normalize(partNum)}`;

const emptyCounts = (): ClassificationCounts => ({
  "builder-blocked": 0,
  "render-failed": 0,
  "placement-profile-required": 0,
  "ambiguous-official-mapping": 0,
  "no-official-mapping": 0,
});

const addCandidate = (
  index: Map<string, LDrawCandidate[]>,
  rebrickablePartNum: string,
  candidate: LDrawCandidate,
): void => {
  const key = normalize(rebrickablePartNum);
  const existing = index.get(key) ?? [];
  if (!existing.some(({ file, matchType }) => file === candidate.file && matchType === candidate.matchType)) {
    existing.push(candidate);
    index.set(key, existing);
  }
};

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

export async function buildLDrawCatalogCoverage(
  root: string,
  libraryRoot: string,
): Promise<LDrawCatalogCoverageReport> {
  const ldrawLock = await readJson<{
    sourcePolicy: string;
    library: string;
    release: string;
    archiveSha256: string;
  }>(resolve(root, "data/ldraw-source.lock.json"));
  if (ldrawLock.sourcePolicy !== SOURCE_POLICY) throw new Error("LDraw source policy mismatch");

  const catalogManifest = await readJson<{
    sourcePolicy: string;
    sourceLockSha256: string;
    includedPartCount: number;
  }>(resolve(root, "data/generated/catalog-packages/manifest.json"));
  if (catalogManifest.sourcePolicy !== SOURCE_POLICY) throw new Error("Catalog source policy mismatch");

  const curatedAssortment = await readJson<{
    components: Array<{ id: string; role: CatalogRole; rebrickablePartNum: string }>;
  }>(resolve(root, "data/curated/ff03-test-assortment.json"));
  const curatedByComponentId = new Map(curatedAssortment.components.map((component) => [component.id, component]));

  const connectivity = await readJson<{
    entries: Array<{
      componentId: string;
      role: CatalogRole;
      status: "digitally-supported" | "blocked";
      reasonCode?: string;
      note?: string;
    }>;
  }>(resolve(root, "data/generated/ldraw-digital-connectivity.json"));
  const builderReadyKeys = new Set<string>();
  const blockedByKey = new Map<string, string>();
  for (const entry of connectivity.entries) {
    const component = curatedByComponentId.get(entry.componentId);
    if (!component) throw new Error(`Unknown curated connectivity component: ${entry.componentId}`);
    const key = catalogKey(component.role, component.rebrickablePartNum);
    if (entry.status === "digitally-supported") builderReadyKeys.add(key);
    else blockedByKey.set(key, [entry.reasonCode, entry.note].filter(Boolean).join(": "));
  }

  const expandedCatalog = await readJson<{
    entries: Array<{ role: CatalogRole; rebrickablePartNum: string }>;
    renderFailures: Array<{ rebrickablePartNum: string; ldrawFile: string; reason: string }>;
  }>(resolve(root, "data/generated/ldraw-expanded-catalog.json"));
  for (const entry of expandedCatalog.entries) {
    const key = catalogKey(entry.role, entry.rebrickablePartNum);
    if (builderReadyKeys.has(key)) throw new Error(`Duplicate builder-ready catalog key: ${key}`);
    builderReadyKeys.add(key);
  }
  const renderFailuresByPartNum = new Map<string, Array<{ ldrawFile: string; reason: string }>>();
  for (const failure of expandedCatalog.renderFailures) {
    const key = normalize(failure.rebrickablePartNum);
    const failures = renderFailuresByPartNum.get(key) ?? [];
    failures.push(failure);
    renderFailuresByPartNum.set(key, failures);
  }

  const thumbnailIndex = await readJson<{
    entries: Array<{ status: "verified" | "blocked" }>;
  }>(resolve(root, "data/generated/ldraw-catalog-thumbnails.json"));
  const visualizedPartCount = expandedCatalog.entries.length
    + thumbnailIndex.entries.filter(({ status }) => status === "verified").length;

  const partsDirectory = resolve(libraryRoot, "parts");
  const directoryEntries = await readdir(partsDirectory, { withFileTypes: true });
  const officialPartFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".dat"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const candidateIndex = new Map<string, LDrawCandidate[]>();
  const sourceByFile = new Map<string, string>();
  const fileIndex = new Map(officialPartFiles.map((fileName) => [`parts/${fileName.toLowerCase()}`, `parts/${fileName}`]));
  for (const fileName of officialPartFiles) {
    const file = `parts/${fileName}`;
    addCandidate(candidateIndex, basename(fileName, ".dat"), { file, matchType: "exact-filename" });
    const source = await readFile(resolve(partsDirectory, fileName), "utf8");
    sourceByFile.set(file, source);
    for (const line of source.split(/\r?\n/u)) {
      for (const partNum of rebrickableKeywordIds(line)) addCandidate(candidateIndex, partNum, { file, matchType: "explicit-keyword" });
    }
  }

  const roleSummary = Object.fromEntries(packages.map(([role]) => [role, {
    catalogPartCount: 0,
    builderReadyPartCount: 0,
    remainingCatalogPartCount: 0,
    remainingClassifications: emptyCounts(),
  }])) as LDrawCatalogCoverageReport["roles"];
  const remainingEntries: LDrawCatalogCoverageEntry[] = [];
  const allCatalogKeys = new Set<string>();
  let uniqueOfficialMappingCount = 0;
  let ambiguousOfficialMappingCount = 0;

  const classifyRemaining = (
    part: CatalogPackagePart,
    uniqueFiles: string[],
  ): { classification: RemainingClassification; reason: string | null } => {
    const key = catalogKey(part.role, part.rebrickablePartNum);
    const blockedReason = blockedByKey.get(key);
    if (blockedReason) return { classification: "builder-blocked", reason: blockedReason };
    const renderFailures = renderFailuresByPartNum.get(normalize(part.rebrickablePartNum)) ?? [];
    if (renderFailures.length > 0) {
      return { classification: "render-failed", reason: [...new Set(renderFailures.map(({ reason }) => reason))].join("; ") };
    }
    if (uniqueFiles.length === 1) {
      return {
        classification: "placement-profile-required",
        reason: null,
      };
    }
    if (uniqueFiles.length > 1) {
      return {
        classification: "ambiguous-official-mapping",
        reason: null,
      };
    }
    return {
      classification: "no-official-mapping",
      reason: null,
    };
  };

  for (const [role, fileName] of packages) {
    const packageSource = await readFile(resolve(root, "data/generated/catalog-packages", fileName), "utf8");
    const catalogPackage = catalogPackageSchema.parse(JSON.parse(packageSource));
    for (const part of catalogPackage.parts) {
      const key = catalogKey(role, part.rebrickablePartNum);
      if (allCatalogKeys.has(key)) throw new Error(`Duplicate catalog key: ${key}`);
      allCatalogKeys.add(key);
      roleSummary[role].catalogPartCount += 1;

      const candidates = candidateIndex.get(normalize(part.rebrickablePartNum)) ?? [];
      const rawDirectFiles = [...new Set(candidates.map(({ file }) => file))].sort();
      const resolvedFile = resolveOfficialLDrawMappingFile(candidates, sourceByFile, fileIndex);
      const directFiles = resolvedFile ? [resolvedFile] : rawDirectFiles;
      if (directFiles.length === 1) uniqueOfficialMappingCount += 1;
      if (directFiles.length > 1) ambiguousOfficialMappingCount += 1;

      if (builderReadyKeys.has(key)) {
        roleSummary[role].builderReadyPartCount += 1;
        continue;
      }

      const renderFailures = renderFailuresByPartNum.get(normalize(part.rebrickablePartNum)) ?? [];
      const reportFiles = directFiles.length > 0
        ? directFiles
        : [...new Set(renderFailures.map(({ ldrawFile }) => ldrawFile))].sort();
      const { classification, reason } = classifyRemaining(part, directFiles);
      roleSummary[role].remainingCatalogPartCount += 1;
      roleSummary[role].remainingClassifications[classification] += 1;
      remainingEntries.push({
        catalogId: part.id,
        role,
        rebrickablePartNum: part.rebrickablePartNum,
        name: part.name,
        classification,
        ldrawFiles: reportFiles,
        mappingEvidence: directFiles.length > 0
          ? [...new Set(candidates.map(({ matchType }) => matchType))].sort()
          : renderFailures.length > 0 ? ["rebrickable-print-parent"] : [],
        reason,
      });
    }
  }

  remainingEntries.sort((left, right) => {
    const roleOrder = packages.findIndex(([role]) => role === left.role)
      - packages.findIndex(([role]) => role === right.role);
    return roleOrder || left.rebrickablePartNum.localeCompare(right.rebrickablePartNum, "en", { numeric: true });
  });

  const remainingClassifications = emptyCounts();
  for (const entry of remainingEntries) remainingClassifications[entry.classification] += 1;
  const builderReadyPartCount = builderReadyKeys.size;
  const noOfficialMappingCount = allCatalogKeys.size - uniqueOfficialMappingCount - ambiguousOfficialMappingCount;

  if (allCatalogKeys.size !== catalogManifest.includedPartCount) throw new Error("Catalog manifest count mismatch");
  if (builderReadyPartCount + remainingEntries.length !== allCatalogKeys.size) throw new Error("Coverage partition mismatch");
  if (visualizedPartCount < builderReadyPartCount) throw new Error("Visualized part count is below builder-ready count");

  return {
    schemaVersion: 1,
    generatedAt: "2026-09-28",
    sourcePolicy: SOURCE_POLICY,
    sources: {
      catalogSourceLockSha256: catalogManifest.sourceLockSha256,
      ldrawLibrary: ldrawLock.library,
      ldrawRelease: ldrawLock.release,
      ldrawArchiveSha256: ldrawLock.archiveSha256,
      officialTopLevelPartFiles: officialPartFiles.length,
      mocFilesUsed: 0,
    },
    methodology: [
      "Catalog scope is limited to the five minifigure-relevant packages derived from locked Rebrickable Catalog Downloads/CSV.",
      "Official LDraw matches require either an exact top-level parts/*.dat filename or an explicit !KEYWORDS Rebrickable identifier.",
      "When an LDraw filename collides with an explicit Rebrickable keyword mapping, the explicit mapping wins; official Part Alias and ~Moved to wrappers are reduced to their canonical target before uniqueness is assessed. Genuinely different keyword targets remain ambiguous.",
      "Head, headwear, complete torso-assembly and complete legs-assembly print variants may reuse a unique unprinted parent geometry only when part_relationships.csv explicitly declares the print relationship.",
      "Torso entries become builder-ready only when the official LDraw file is a complete shortcut: either a 973-family torso with both arms and hands, or one of the explicitly recognized complete wing, flipper, pirate-hook, mechanical-arm or short-torso component signatures.",
      "Lower-body entries become builder-ready only when the official top-level LDraw title explicitly declares a complete Minifig Hips and Legs assembly, an allowlisted complete Hips replacement family (Ghost, Skirt, Tentacles, Mermaid Tail or Genie), or an allowlisted complete legs family with a centered torso-compatible stud (Minecraft Enderman or Bionicle).",
      "Rebrickable 973cNNhMM torso, 970cNN legs and 970lNNrMM asymmetric-leg assemblies without a matching official standard assembly file are composed from official standard parts (ADR-008) when the colour code is unanimous across all unprinted base assemblies and the entry's own name states the same colours; this also rejects the obsolete, semantically unrelated LDraw aliases for 970c02 and 970c36. Asymmetric legs additionally require exactly one catalog-backed hip colour, and printed torsos need a unique official torso print part.",
      "No fuzzy name matching, Rebrickable API data, image scraping, LDraw models, or MOC files are used; Rebrickable names are read only through fixed anchored patterns.",
      "An exact printed hand-accessory model may reuse a pinned LDCad hand-grip connector only when locked Rebrickable part_relationships.csv declares exactly one print parent carrying that unique connector; digital collision validation is still required for the printed model itself.",
      "A unique model mapping is not treated as builder-ready until a role-specific placement profile and rendering both succeed.",
    ],
    classificationDefinitions: {
      "builder-blocked": "A visualized official model exists, but the current connectivity registry explicitly blocks builder use.",
      "render-failed": "The official mapping is unique, but deterministic thumbnail/model preparation failed.",
      "placement-profile-required": "The official mapping is unique; a safe role-specific placement/assembly profile is still required.",
      "ambiguous-official-mapping": "Several official LDraw top-level files claim the same Rebrickable identifier; no file is selected automatically.",
      "no-official-mapping": "The pinned official LDraw release contains no exact or explicitly declared mapping.",
    },
    summary: {
      catalogPartCount: allCatalogKeys.size,
      visualizedPartCount,
      builderReadyPartCount,
      remainingCatalogPartCount: remainingEntries.length,
      remainingWithoutVisualizationCount: allCatalogKeys.size - visualizedPartCount,
      uniqueOfficialMappingCount,
      ambiguousOfficialMappingCount,
      noOfficialMappingCount,
      remainingClassifications,
    },
    roles: roleSummary,
    remainingEntries,
  };
}

export function renderLDrawCatalogCoverageMarkdown(report: LDrawCatalogCoverageReport): string {
  const rows = packages.map(([role]) => {
    const item = report.roles[role];
    return `| ${role} | ${item.catalogPartCount.toLocaleString("de-DE")} | ${item.builderReadyPartCount.toLocaleString("de-DE")} | ${item.remainingClassifications["placement-profile-required"].toLocaleString("de-DE")} | ${item.remainingClassifications["builder-blocked"].toLocaleString("de-DE")} | ${item.remainingClassifications["render-failed"].toLocaleString("de-DE")} | ${item.remainingClassifications["ambiguous-official-mapping"].toLocaleString("de-DE")} | ${item.remainingClassifications["no-official-mapping"].toLocaleString("de-DE")} |`;
  });
  const summary = report.summary;
  const directMappingDifference = summary.noOfficialMappingCount
    - summary.remainingClassifications["no-official-mapping"];
  return [
    "# LDraw-Katalogabdeckung",
    "",
    `Stand: ${report.generatedAt}; Rebrickable-Source-Lock \`${report.sources.catalogSourceLockSha256}\`; offizielle LDraw-Bibliothek ${report.sources.ldrawRelease}.`,
    "",
    `**Verbindliche Quellenregel: ${report.sourcePolicy}**`,
    "",
    "## Ergebnis",
    "",
    `- ${summary.catalogPartCount.toLocaleString("de-DE")} minifigurenrelevante Katalogeinträge insgesamt.`,
    `- ${summary.visualizedPartCount.toLocaleString("de-DE")} besitzen bereits ein Modell und Vorschaubild.`,
    `- ${summary.builderReadyPartCount.toLocaleString("de-DE")} sind tatsächlich im Builder auswählbar.`,
    `- ${summary.remainingCatalogPartCount.toLocaleString("de-DE")} sind noch nicht builderbereit; davon fehlen bei ${summary.remainingWithoutVisualizationCount.toLocaleString("de-DE")} auch Modell/Vorschaubild.`,
    `- ${summary.uniqueOfficialMappingCount.toLocaleString("de-DE")} Katalogeinträge haben insgesamt eine eindeutige direkte LDraw-Zuordnung, ${summary.ambiguousOfficialMappingCount.toLocaleString("de-DE")} sind mehrdeutig und ${summary.noOfficialMappingCount.toLocaleString("de-DE")} haben keine direkte offizielle Zuordnung.`,
    "",
    "| Rolle | Katalog | Builderbereit | Platzierung fehlt | Gesperrt | Renderfehler | Mehrdeutig | Keine Zuordnung |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    `Die Resttabelle weist ${directMappingDifference.toLocaleString("de-DE")} Einträge weniger unter „Keine Zuordnung“ aus als die rohe direkte Mappingbilanz. Diese Einträge verwenden entweder eine in Rebrickable deklarierte Druckeltern-Grundgeometrie, sind als zugehöriger Renderfehler klassifiziert oder – im Fall \`3814\` – wegen einer kuratierten Modellabbildung gesperrt.`,
    "",
    "## Sichere Arbeitsreihenfolge",
    "",
    `1. Die ${summary.remainingClassifications["render-failed"].toLocaleString("de-DE")} Renderfehler technisch beheben.`,
    `2. Für ${summary.remainingClassifications["placement-profile-required"].toLocaleString("de-DE")} eindeutig zugeordnete Teile reproduzierbare Platzierungs- und Assembly-Profile ableiten und prüfen.`,
    `3. Die ${summary.remainingClassifications["ambiguous-official-mapping"].toLocaleString("de-DE")} mehrdeutigen Zuordnungen über offizielle Metadaten auflösen.`,
    `4. Die ${summary.remainingClassifications["no-official-mapping"].toLocaleString("de-DE")} Einträge ohne direkte offizielle Zuordnung bleiben gesperrt, bis eine spätere offizielle LDraw-Version eine belastbare Zuordnung liefert.`,
    "",
    "Die vollständige maschinenlesbare Liste steht in `data/generated/ldraw-catalog-coverage.json`. Es werden keine unscharfen Namensvergleiche, keine Rebrickable-API, keine gescrapten Bilder, keine LDraw-Modelle und keine MOC-Dateien verwendet.",
    "",
  ].join("\n");
}
