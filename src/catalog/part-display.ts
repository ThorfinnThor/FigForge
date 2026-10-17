export type PartDisplay = {
  /** Catalog name without the category prefix, the trailing "Print"/"Pattern" and bracket notes. */
  title: string;
  /** True for parts the catalog marks "[Plain]" (no print). */
  plain: boolean;
  /** Remaining bracket notes such as "Blocked Open Stud"; shown only as detail. */
  notes: readonly string[];
};

const CATEGORY_PREFIX = /^Minifig(?:ure)?\s+(?:Head(?:wear)?(?:\s+Accessor(?:y|ies))?|Upper Body|Lower Body)\s+/iu;
const TRAILING_PRINT_WORD = /\s+(?:Print|Pattern)$/iu;
const BRACKET_NOTE = /\s*\[([^\]]*)\]/gu;

const capitalise = (value: string): string => value.charAt(0).toLocaleUpperCase("en-US") + value.slice(1);

/**
 * Presentation only: the catalog name stays the searchable source of truth. Names are
 * not translated, because partial translation produces mixed-language labels.
 */
export const partDisplay = (catalogName: string): PartDisplay => {
  const notes: string[] = [];
  const withoutNotes = catalogName.replace(BRACKET_NOTE, (_match, note: string) => {
    notes.push(note.trim());
    return "";
  }).trim();
  const plain = notes.some((note) => note.toLocaleLowerCase("en-US") === "plain");
  const stripped = withoutNotes
    .replace(CATEGORY_PREFIX, "")
    .replace(TRAILING_PRINT_WORD, "")
    .replace(/^(?:Print|Pattern)$/iu, "")
    .trim();
  return {
    title: capitalise(stripped.length > 0 ? stripped : withoutNotes),
    plain,
    notes: notes.filter((note) => note.toLocaleLowerCase("en-US") !== "plain" && note.length > 0),
  };
};
