const referenceName = (line: string): string | null => {
  if (!line.startsWith("1 ")) return null;
  return line.trim().split(/\s+/u).at(-1)?.replaceAll("\\", "/").toLowerCase() ?? null;
};

export function isCompleteStandardTorsoAssembly(source: string): boolean {
  if (!/^0\s+!LDRAW_ORG\s+Shortcut\b/mu.test(source)) return false;

  const references = source.split(/\r?\n/u).flatMap((line) => {
    const reference = referenceName(line);
    return reference ? [reference] : [];
  });

  const hasTorso = references.some((reference) => /^973[a-z0-9-]*\.dat$/u.test(reference));
  const hasLeftArm = references.some((reference) => /^3818[a-z0-9-]*\.dat$/u.test(reference));
  const hasRightArm = references.some((reference) => /^3819[a-z0-9-]*\.dat$/u.test(reference));
  const handCount = references.filter((reference) => /^3820[a-z0-9-]*\.dat$/u.test(reference)).length;

  return hasTorso && hasLeftArm && hasRightArm && handCount >= 2;
}
