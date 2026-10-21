export type InlinePart = { text: string; href?: string };

/** Splits "text [label](href) text" into plain and linked parts. Hrefs starting with "/" are internal pages. */
export const splitInline = (text: string): InlinePart[] => {
  const parts: InlinePart[] = [];
  let rest = text;
  for (;;) {
    const match = /\[([^\]]+)\]\(([^)\s]+)\)/u.exec(rest);
    if (!match) break;
    if (match.index > 0) parts.push({ text: rest.slice(0, match.index) });
    parts.push({ text: match[1]!, href: match[2]! });
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest) parts.push({ text: rest });
  return parts;
};
