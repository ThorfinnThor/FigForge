// The complete official archive carries one release note per update (ldraw/models/NoteYYMMCA.txt); the newest names the release.
export function releaseFromArchiveEntries(entries: readonly string[]): string {
  const releases = entries.flatMap((entry) => {
    const match = /^ldraw\/models\/Note(\d{2})(0[1-9]|1[0-2])CA\.txt$/iu.exec(entry.trim());
    return match ? [`20${match[1]}-${match[2]}`] : [];
  });
  const newest = releases.sort().at(-1);
  if (!newest) throw new Error("LDraw archive contains no release note");
  return newest;
}

export type LDrawLockDecision =
  | { action: "unchanged" }
  | { action: "update"; release: string; archiveSha256: string };

// A new archive is only accepted as a newer release; a changed hash for the same or an older release is refused.
export function decideLDrawLockUpdate(
  locked: { release: string; archiveSha256: string },
  downloaded: { release: string; archiveSha256: string },
): LDrawLockDecision {
  if (!/^[a-f0-9]{64}$/u.test(downloaded.archiveSha256)) throw new Error("Invalid LDraw archive SHA-256");
  if (downloaded.archiveSha256 === locked.archiveSha256) return { action: "unchanged" };
  if (downloaded.release <= locked.release) {
    throw new Error(`LDraw archive changed without a newer release (${downloaded.release}, locked ${locked.release})`);
  }
  return { action: "update", release: downloaded.release, archiveSha256: downloaded.archiveSha256 };
}
