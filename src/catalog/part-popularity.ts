/** Most sets first; ties and parts without any set fall back to natural part-number order. */
export const comparePartsByPopularity = (
  left: { rebrickablePartNum: string; setCount?: number | undefined },
  right: { rebrickablePartNum: string; setCount?: number | undefined },
): number => (
  (right.setCount ?? 0) - (left.setCount ?? 0)
  || left.rebrickablePartNum.localeCompare(right.rebrickablePartNum, "en", { numeric: true })
);

export type SetCountSource = {
  parts: readonly string[];
  sets: ReadonlyArray<{ partIndexes: readonly number[] }>;
};

/** Number of distinct sets (including their minifigures) that contain each part number. */
export const setCountsByPartNum = (index: SetCountSource): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const { partIndexes } of index.sets) {
    for (const partIndex of new Set(partIndexes)) {
      const partNum = index.parts[partIndex];
      if (partNum === undefined) throw new Error(`Set index references unknown part index ${partIndex}`);
      counts.set(partNum, (counts.get(partNum) ?? 0) + 1);
    }
  }
  return counts;
};
