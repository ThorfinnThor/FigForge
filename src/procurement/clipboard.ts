type ClipboardLike = { writeText: (text: string) => Promise<void> } | undefined;

/** Copies text to the clipboard; false when the browser refuses or has no clipboard API. */
export const copyTextToClipboard = async (
  text: string,
  clipboard: ClipboardLike = globalThis.navigator?.clipboard,
): Promise<boolean> => {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
