const firstMeaningfulLine = (source: string): string =>
  source.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? "";

export function isCompleteMinifigLegsAssembly(source: string): boolean {
  if (!/^0\s+!LDRAW_ORG\s+(?:Part|Shortcut)\b/mu.test(source)) return false;

  const title = firstMeaningfulLine(source);
  return /^0\s+Minifig Hips\b.*\bLegs\b/iu.test(title);
}
