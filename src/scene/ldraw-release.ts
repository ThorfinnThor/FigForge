import ldrawSourceLock from "../../data/ldraw-source.lock.json" with { type: "json" };

// "2026-08" becomes "2608"; the published official library folder is named after the locked release.
export function ldrawReleaseSlug(release: string): string {
  const match = /^20(\d{2})-(0[1-9]|1[0-2])$/u.exec(release);
  if (!match) throw new Error(`Unsupported LDraw release: ${release}`);
  return `${match[1]}${match[2]}`;
}

export const LDRAW_RELEASE = ldrawSourceLock.release;
export const OFFICIAL_LDRAW_PUBLIC_PATH = `/assets/ldraw/official-${ldrawReleaseSlug(LDRAW_RELEASE)}/`;
