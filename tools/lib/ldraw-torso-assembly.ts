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
  const hasStandardLeftArm = references.some((reference) => /^3818[a-z0-9-]*\.dat$/u.test(reference));
  const hasStandardRightArm = references.some((reference) => /^3819[a-z0-9-]*\.dat$/u.test(reference));
  const hasDualMouldLeftArm = references.some((reference) => /^16000[a-z0-9-]*\.dat$/u.test(reference));
  const hasDualMouldRightArm = references.some((reference) => /^16001[a-z0-9-]*\.dat$/u.test(reference));
  const handCount = references.filter((reference) => /^3820[a-z0-9-]*\.dat$/u.test(reference)).length;

  const hasCompleteArmPair = (hasStandardLeftArm && hasStandardRightArm)
    || (hasDualMouldLeftArm && hasDualMouldRightArm);
  return hasTorso && hasCompleteArmPair && handCount >= 2;
}
