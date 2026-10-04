import type { CatalogSetIndex } from "../contracts/catalog-set-index.js";

export type CatalogSetEntry = CatalogSetIndex["sets"][number];

const normalize = (value: string): string => value
  .normalize("NFKD")
  .replace(/\p{Diacritic}/gu, "")
  .toLocaleLowerCase("en-US")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

export function findCatalogSets(
  index: CatalogSetIndex,
  input: string,
  limit = 8,
): CatalogSetEntry[] {
  const query = normalize(input);
  if (limit <= 0) return [];

  if (!query) {
    return [...index.sets]
      .sort((left, right) => right.year - left.year
        || right.setNum.localeCompare(left.setNum, "en", { numeric: true }))
      .slice(0, limit);
  }

  return index.sets
    .flatMap((set) => {
      const setNum = normalize(set.setNum);
      const name = normalize(set.name);
      let score = 0;
      if (setNum === query) score = 100;
      else if (setNum.startsWith(query)) score = 80;
      else if (name === query) score = 70;
      else if (name.startsWith(query)) score = 60;
      else if (setNum.includes(query)) score = 40;
      else if (name.includes(query)) score = 30;
      return score > 0 ? [{ set, score }] : [];
    })
    .sort((left, right) => right.score - left.score
      || right.set.year - left.set.year
      || left.set.setNum.localeCompare(right.set.setNum, "en", { numeric: true }))
    .slice(0, limit)
    .map(({ set }) => set);
}

export function partNumbersForCatalogSet(
  index: CatalogSetIndex,
  set: CatalogSetEntry,
): string[] {
  return set.partIndexes.map((partIndex) => {
    const partNum = index.parts[partIndex];
    if (!partNum) throw new Error(`Set ${set.setNum} references missing part index ${partIndex}`);
    return partNum;
  });
}
