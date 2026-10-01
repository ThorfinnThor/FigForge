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

export function isCompleteTorsoAssembly(source: string): boolean {
  if (isCompleteStandardTorsoAssembly(source)) return true;
  const title = source.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? "";
  const isOfficialPart = /^0\s+!LDRAW_ORG\s+Part\b/mu.test(source);
  const isOfficialShortcut = /^0\s+!LDRAW_ORG\s+Shortcut\b/mu.test(source);

  // The original 1975 torso is one physical part with integral arms. It has no
  // child arm/hand references to count, but it is a complete torso-slot body.
  if (isOfficialPart && title === "0 Minifig Torso with Integral Arms") return true;
  if (!isOfficialShortcut) return false;

  const references = source.split(/\r?\n/u).flatMap((line) => {
    const reference = referenceName(line);
    return reference ? [reference] : [];
  });
  const count = (pattern: RegExp): number => references.filter((reference) => pattern.test(reference)).length;
  const has = (pattern: RegExp): boolean => references.some((reference) => pattern.test(reference));

  const hasStandardTorso = has(/^973[a-z0-9-]*\.dat$/u);
  const hasShortTorso = has(/^98127[a-z0-9-]*\.dat$/u);
  const hasBrickSuitTorso = has(/^37191[a-z0-9-]*\.dat$/u);
  const hasStandardArmPair = has(/^3818[a-z0-9-]*\.dat$/u) && has(/^3819[a-z0-9-]*\.dat$/u);
  const hasDualMouldArmPair = has(/^16000[a-z0-9-]*\.dat$/u) && has(/^16001[a-z0-9-]*\.dat$/u);
  const handCount = count(/^3820[a-z0-9-]*\.dat$/u);

  const hasCreatureWingPair = has(/^6954p01\.dat$/u) && has(/^6954p02\.dat$/u);
  const hasBirdWingPair = count(/^11263[a-z0-9-]*\.dat$/u) === 2;
  const hasFlipperPair = count(/^24074[a-z0-9-]*\.dat$/u) === 2;
  const hasPirateHook = count(/^2531[a-z0-9-]*\.dat$/u) === 1;
  const hasMechanicalArm = count(/^62691[a-z0-9-]*\.dat$/u) === 1;

  return (hasStandardTorso && hasCreatureWingPair && handCount === 2)
    || (hasStandardTorso && hasBirdWingPair)
    || (hasStandardTorso && hasFlipperPair)
    || (hasStandardTorso && hasStandardArmPair && handCount === 1 && hasPirateHook)
    || (hasStandardTorso && has(/^3819[a-z0-9-]*\.dat$/u) && handCount === 1 && hasMechanicalArm)
    || (hasShortTorso && hasDualMouldArmPair && handCount === 2)
    || (hasBrickSuitTorso && hasStandardArmPair && handCount === 2);
}
