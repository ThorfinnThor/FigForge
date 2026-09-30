export type ParsedAssemblyPartNum =
  | { kind: "torso"; armCode: string; handCode: string; printed: boolean }
  | { kind: "legs"; legCode: string; printed: boolean };

export type AssemblyColorCodeTable = {
  codes: Map<string, string>;
  evidence: Map<string, string[]>;
  unresolved: Map<string, { colorNames: string[]; reason: "conflicting-names" | "unknown-color" }>;
};

export type ConfirmedAssemblyColors =
  | { kind: "torso"; armColorName: string; handColorName: string }
  | { kind: "legs"; legColorName: string };

const escapeRegExp = (value: string): string => value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export function parseAssemblyPartNum(partNum: string): ParsedAssemblyPartNum | null {
  const torso = /^973c(\d{2})h(\d{2})(pr\d+)?$/iu.exec(partNum.trim());
  if (torso) return { kind: "torso", armCode: torso[1]!, handCode: torso[2]!, printed: Boolean(torso[3]) };
  const legs = /^970c(\d{2})(pr\d+)?$/iu.exec(partNum.trim());
  if (legs) return { kind: "legs", legCode: legs[1]!, printed: Boolean(legs[2]) };
  return null;
}

// Only unprinted base assemblies define the code table. Their names follow one fixed grammar.
function plainAssemblyColorNames(partNum: string, name: string): Array<[code: string, colorName: string]> | null {
  const parsed = parseAssemblyPartNum(partNum);
  if (!parsed || parsed.printed) return null;
  if (parsed.kind === "torso") {
    const same = /^Torso, ([A-Z][A-Za-z -]*?) Arms and Hands(?: \[(?:Plain|PLAIN)\])?$/u.exec(name);
    if (same) return [[parsed.armCode, same[1]!], [parsed.handCode, same[1]!]];
    const split = /^Torso, ([A-Z][A-Za-z -]*?) Arms, ([A-Z][A-Za-z -]*?) Hands(?: \[(?:Plain|PLAIN)\])?$/u.exec(name);
    if (split) return [[parsed.armCode, split[1]!], [parsed.handCode, split[2]!]];
    return null;
  }
  const legs = /^Hips and ([A-Z][A-Za-z -]*?) Legs(?: \[(?:Plain|PLAIN)\])?$/u.exec(name);
  return legs ? [[parsed.legCode, legs[1]!]] : null;
}

export function deriveAssemblyColorCodeTable(
  parts: ReadonlyArray<{ partNum: string; name: string }>,
  knownColorNames: ReadonlySet<string>,
): AssemblyColorCodeTable {
  const namesByCode = new Map<string, Set<string>>();
  const evidence = new Map<string, Set<string>>();
  for (const { partNum, name } of parts) {
    for (const [code, colorName] of plainAssemblyColorNames(partNum, name) ?? []) {
      namesByCode.set(code, (namesByCode.get(code) ?? new Set()).add(colorName));
      evidence.set(code, (evidence.get(code) ?? new Set()).add(partNum));
    }
  }
  const codes = new Map<string, string>();
  const unresolved: AssemblyColorCodeTable["unresolved"] = new Map();
  for (const [code, names] of [...namesByCode].sort(([left], [right]) => left.localeCompare(right))) {
    const sortedNames = [...names].sort();
    if (sortedNames.length !== 1) {
      unresolved.set(code, { colorNames: sortedNames, reason: "conflicting-names" });
      continue;
    }
    if (!knownColorNames.has(sortedNames[0]!)) {
      unresolved.set(code, { colorNames: sortedNames, reason: "unknown-color" });
      continue;
    }
    codes.set(code, sortedNames[0]!);
  }
  return {
    codes,
    evidence: new Map([...evidence].map(([code, partNums]) => [code, [...partNums].sort()])),
    unresolved,
  };
}

// Each entry must state the coded colours itself; one contradicting "... Arms"/"... Legs" phrase blocks it.
export function confirmAssemblyColors(
  partNum: string,
  name: string,
  table: AssemblyColorCodeTable,
): ConfirmedAssemblyColors | null {
  const parsed = parseAssemblyPartNum(partNum);
  if (!parsed) return null;
  if (parsed.kind === "torso") {
    const arm = table.codes.get(parsed.armCode);
    const hand = table.codes.get(parsed.handCode);
    if (!arm || !hand) return null;
    if ((name.match(/(?:^|, )[^,]+? Arms\b/gu) ?? []).length !== 1) return null;
    const armPattern = escapeRegExp(arm);
    const handPattern = escapeRegExp(hand);
    const confirmed = arm === hand
      ? new RegExp(`(?:^|, )${armPattern} Arms(?: and|, ${handPattern}) Hands\\b`, "u").test(name)
      : new RegExp(`(?:^|, )${armPattern} Arms, ${handPattern} Hands\\b`, "u").test(name);
    return confirmed ? { kind: "torso", armColorName: arm, handColorName: hand } : null;
  }
  const leg = table.codes.get(parsed.legCode);
  if (!leg) return null;
  if ((name.match(/\bLegs\b/gu) ?? []).length !== 1) return null;
  return new RegExp(`^Hips and ${escapeRegExp(leg)} Legs\\b`, "u").test(name)
    ? { kind: "legs", legColorName: leg }
    : null;
}

export type ReferenceLine = { component: string; transform: number[] };

export type ReferenceAssembly = {
  lines: ReferenceLine[];
  shortcutCount: number;
  agreeingShortcutCount: number;
};

const componentClass = (reference: string, classes: readonly string[]): string | null =>
  classes.find((prefix) => reference.toLowerCase().startsWith(prefix)) ?? null;

// Picks the placement shared by the official shortcuts of one family; refuses when there is no clear majority.
export function deriveReferenceAssembly(
  shortcutSources: readonly string[],
  componentClasses: readonly string[],
  minimumAgreement = 0.9,
): ReferenceAssembly {
  const signatures = new Map<string, { lines: ReferenceLine[]; count: number }>();
  let shortcutCount = 0;
  for (const source of shortcutSources) {
    const lines: ReferenceLine[] = [];
    let valid = true;
    for (const line of source.split(/\r?\n/u)) {
      if (!line.startsWith("1 ")) continue;
      const fields = line.trim().split(/\s+/u);
      const component = componentClass(fields.at(-1)!, componentClasses);
      if (!component) {
        valid = false;
        break;
      }
      lines.push({ component, transform: fields.slice(2, 14).map(Number) });
    }
    if (!valid || lines.length === 0 || lines.some(({ transform }) => transform.length !== 12 || !transform.every(Number.isFinite))) continue;
    shortcutCount += 1;
    lines.sort((left, right) => left.component.localeCompare(right.component) || left.transform[0]! - right.transform[0]!);
    const key = JSON.stringify(lines);
    const existing = signatures.get(key);
    signatures.set(key, { lines, count: (existing?.count ?? 0) + 1 });
  }
  const best = [...signatures.values()].sort((left, right) => right.count - left.count)[0];
  if (!best || shortcutCount === 0 || best.count / shortcutCount < minimumAgreement) {
    throw new Error("Official shortcuts do not agree on one reference assembly");
  }
  return { lines: best.lines, shortcutCount, agreeingShortcutCount: best.count };
}
