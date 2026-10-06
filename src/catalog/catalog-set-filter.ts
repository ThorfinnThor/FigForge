import type { CatalogSetIndex } from "../contracts/catalog-set-index.js";

export type CatalogSetEntry = CatalogSetIndex["sets"][number];
export type CatalogSetSearchEntry = CatalogSetEntry & {
  groupSize?: number;
};

// Rebrickable models regular CMF releases as individual sets. The family numbers below
// are the corresponding `*-0` Series rows from sets.csv; parts remain the union of the
// individual, catalog-backed sets already present in the compact index.
const REGULAR_CMF_SERIES = [
  ["8683", 1],
  ["8684", 2],
  ["8803", 3],
  ["8804", 4],
  ["8805", 5],
  ["8827", 6],
  ["8831", 7],
  ["8833", 8],
  ["71000", 9],
  ["71001", 10],
  ["71002", 11],
  ["71007", 12],
  ["71008", 13],
  ["71010", 14],
  ["71011", 15],
  ["71013", 16],
  ["71018", 17],
  ["71021", 18],
  ["71025", 19],
  ["71027", 20],
  ["71029", 21],
  ["71032", 22],
  ["71034", 23],
  ["71037", 24],
  ["71045", 25],
  ["71046", 26],
  ["71048", 27],
  ["71051", 28],
  ["71052", 29],
] as const;

const cmfGroupsByIndex = new WeakMap<CatalogSetIndex, CatalogSetSearchEntry[]>();

const cmfGroupsForIndex = (index: CatalogSetIndex): CatalogSetSearchEntry[] => {
  const cached = cmfGroupsByIndex.get(index);
  if (cached) return cached;

  const groups = REGULAR_CMF_SERIES.flatMap(([setFamily, series]) => {
    const members = index.sets.filter(({ setNum }) => setNum.startsWith(`${setFamily}-`));
    if (members.length === 0) return [];
    return [{
      setNum: setFamily,
      name: `Collectible Minifigures Series ${series} (CMF)`,
      year: Math.max(...members.map(({ year }) => year)),
      partIndexes: [...new Set(members.flatMap(({ partIndexes }) => partIndexes))]
        .sort((left, right) => left - right),
      groupSize: members.length,
    } satisfies CatalogSetSearchEntry];
  });
  cmfGroupsByIndex.set(index, groups);
  return groups;
};

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
): CatalogSetSearchEntry[] {
  const query = normalize(input);
  if (limit <= 0) return [];

  const groups = cmfGroupsForIndex(index);
  const candidates: CatalogSetSearchEntry[] = [...index.sets, ...groups];

  if (!query) {
    return candidates
      .sort((left, right) => right.year - left.year
        || right.setNum.localeCompare(left.setNum, "en", { numeric: true }))
      .slice(0, limit);
  }

  return candidates
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
