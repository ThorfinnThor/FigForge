// The browser loads one compact package per role on demand. It carries only what listing, selecting and placing
// need; names come from the Rebrickable catalog package and all evidence stays in the full catalog file.
export type LDrawRuntimeEntryTuple = [
  rebrickablePartNum: string,
  ldrawFile: string,
  ldrawUpdate: string,
  modelUrl: string,
  thumbnailUrl: string,
  geometryFallbackKind: string | null,
  placementIndex: number,
];

export type LDrawRuntimePackage = {
  schemaVersion: 1;
  role: string;
  catalogArchiveSha256: string;
  placements: Array<{ placementMode: string; placementTransformLdu: number[] }>;
  entries: LDrawRuntimeEntryTuple[];
};

export const LDRAW_RUNTIME_FILE_BY_ROLE = {
  head: "head.json",
  headwear: "headwear.json",
  torsoAssembly: "torso-assembly.json",
  legsAssembly: "legs-assembly.json",
  handAccessory: "hand-accessory.json",
} as const;

type CatalogEntry = {
  role: string;
  rebrickablePartNum: string;
  ldrawFile: string;
  ldrawUpdate: string;
  modelUrl: string;
  thumbnailUrl: string;
  geometryFallback: { kind: string } | null;
  placementMode: string;
  placementTransformLdu: number[];
};

export function ldrawRuntimePackage(role: string, catalogArchiveSha256: string, entries: readonly CatalogEntry[]): LDrawRuntimePackage {
  const placements: LDrawRuntimePackage["placements"] = [];
  const placementIndexByKey = new Map<string, number>();
  const tuples = entries.filter((entry) => entry.role === role).map((entry): LDrawRuntimeEntryTuple => {
    const key = JSON.stringify([entry.placementMode, entry.placementTransformLdu]);
    let placementIndex = placementIndexByKey.get(key);
    if (placementIndex === undefined) {
      placementIndex = placements.push({ placementMode: entry.placementMode, placementTransformLdu: entry.placementTransformLdu }) - 1;
      placementIndexByKey.set(key, placementIndex);
    }
    return [
      entry.rebrickablePartNum,
      entry.ldrawFile,
      entry.ldrawUpdate,
      entry.modelUrl,
      entry.thumbnailUrl,
      entry.geometryFallback?.kind ?? null,
      placementIndex,
    ];
  });
  return { schemaVersion: 1, role, catalogArchiveSha256, placements, entries: tuples };
}

export function ldrawRuntimePackages(
  catalogArchiveSha256: string,
  entries: readonly CatalogEntry[],
): Array<{ file: string; content: string }> {
  return Object.entries(LDRAW_RUNTIME_FILE_BY_ROLE).map(([role, file]) => ({
    file,
    content: `${JSON.stringify(ldrawRuntimePackage(role, catalogArchiveSha256, entries))}\n`,
  }));
}
