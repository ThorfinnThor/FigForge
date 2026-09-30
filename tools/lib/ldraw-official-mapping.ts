export type OfficialMappingCandidate = {
  file: string;
  matchType: string;
};

const normalizedFile = (value: string): string => value.replaceAll("\\", "/").toLowerCase();

const topLevelReference = (
  reference: string,
  fileIndex: ReadonlyMap<string, string>,
): string | null => {
  const normalized = normalizedFile(reference);
  const candidates = normalized.startsWith("parts/")
    ? [normalized]
    : [`parts/${normalized}`, normalized];
  return candidates.map((candidate) => fileIndex.get(candidate)).find(Boolean) ?? null;
};

const directRedirect = (
  file: string,
  source: string,
  fileIndex: ReadonlyMap<string, string>,
): string | null => {
  const lines = source.split(/\r?\n/u);
  const movedTarget = /^0\s+~Moved to\s+(\S+)/iu.exec(lines[0] ?? "")?.[1];
  if (movedTarget) {
    return topLevelReference(movedTarget.toLowerCase().endsWith(".dat") ? movedTarget : `${movedTarget}.dat`, fileIndex);
  }

  const isAlias = /^0\s+=/u.test(lines[0] ?? "")
    || lines.some((line) => /^0\s+!LDRAW_ORG\s+\S+\s+Alias\b/iu.test(line));
  if (!isAlias) return null;
  const references = lines
    .filter((line) => line.startsWith("1 "))
    .map((line) => line.trim().split(/\s+/u).at(-1))
    .filter((reference): reference is string => Boolean(reference));
  if (references.length !== 1) return null;
  const target = topLevelReference(references[0]!, fileIndex);
  return target === file ? null : target;
};

export function canonicalOfficialLDrawFile(
  file: string,
  sourceByFile: ReadonlyMap<string, string>,
  fileIndex: ReadonlyMap<string, string>,
): string {
  const visited = new Set<string>();
  let current = file;
  while (!visited.has(current)) {
    visited.add(current);
    const source = sourceByFile.get(current);
    if (!source) return current;
    const redirect = directRedirect(current, source, fileIndex);
    if (!redirect) return current;
    current = redirect;
  }
  return current;
}

/**
 * LDraw's explicit `!KEYWORDS Rebrickable <id>` mapping wins over an accidental
 * filename collision. Alias and `~Moved to` wrappers are reduced to their
 * official target before uniqueness is assessed. Several genuinely different
 * keyword targets remain unresolved.
 */
export function resolveOfficialLDrawMappingFile(
  candidates: readonly OfficialMappingCandidate[],
  sourceByFile: ReadonlyMap<string, string>,
  fileIndex: ReadonlyMap<string, string>,
): string | null {
  const files = [...new Set(candidates.map(({ file }) => file))];
  if (files.length <= 1) return files[0] ?? null;

  const explicitFiles = [...new Set(candidates
    .filter(({ matchType }) => matchType === "explicit-keyword")
    .map(({ file }) => canonicalOfficialLDrawFile(file, sourceByFile, fileIndex)))];
  return explicitFiles.length === 1 ? explicitFiles[0]! : null;
}
