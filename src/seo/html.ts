export type Messages = Record<string, string>;

export const escapeHtml = (value: string): string => value
  .replace(/&/gu, "&amp;")
  .replace(/</gu, "&lt;")
  .replace(/>/gu, "&gt;")
  .replace(/"/gu, "&quot;");

export const requireMessage = (messages: Messages, key: string): string => {
  const value = messages[key];
  if (!value) throw new Error(`Missing German message for SEO key "${key}".`);
  return value;
};
