import { comparePartsByPopularity } from "./part-popularity.js";

type SelectablePart = { rebrickablePartNum: string; setCount?: number | undefined };

/** Keys use the builder's "<role>:<lowercase part number>" form. */
export const pinnedCatalogKeys = (
  documents: ReadonlyArray<{ selections: ReadonlyArray<{ componentId: string }> }>,
): ReadonlySet<string> => new Set(documents.flatMap(({ selections }) =>
  selections.flatMap(({ componentId }) => {
    const [prefix, role, partNum] = componentId.split(":");
    return prefix === "catalog" && role && partNum ? [`${role}:${partNum.toLowerCase()}`] : [];
  })));

/**
 * Picks the parts of one role that belong in its core package: every pinned part, plus the
 * `popularCount` most popular other parts. Only parts with a runtime entry qualify, so the
 * core list is exactly the head of the full, popularity-ordered builder list.
 */
export const selectCorePartNums = (input: {
  role: string;
  parts: readonly SelectablePart[];
  runtimePartNums: ReadonlySet<string>;
  pinnedKeys: ReadonlySet<string>;
  popularCount: number;
}): ReadonlySet<string> => {
  const builderReady = input.parts.filter((part) => input.runtimePartNums.has(part.rebrickablePartNum.toLowerCase()));
  const isPinned = (part: SelectablePart): boolean =>
    input.pinnedKeys.has(`${input.role}:${part.rebrickablePartNum.toLowerCase()}`);
  const pinned = builderReady.filter(isPinned);
  const popular = builderReady.filter((part) => !isPinned(part))
    .sort(comparePartsByPopularity)
    .slice(0, input.popularCount);
  return new Set([...pinned, ...popular].map(({ rebrickablePartNum }) => rebrickablePartNum.toLowerCase()));
};
