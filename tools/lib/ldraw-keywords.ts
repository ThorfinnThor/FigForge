// Reads every "Rebrickable <id>" entry of an LDraw !KEYWORDS line, including the first entry after the meta command.
export function rebrickableKeywordIds(line: string): string[] {
  const keywords = /^0\s+!KEYWORDS\b(.*)$/iu.exec(line)?.[1];
  if (keywords === undefined) return [];
  return keywords
    .split(",")
    .flatMap((keyword) => /^\s*Rebrickable\s+(\S+)\s*$/iu.exec(keyword)?.[1] ?? []);
}
