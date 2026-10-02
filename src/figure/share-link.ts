import { FIGURE_DOCUMENT_MAX_BYTES, figureDocumentSchema, type FigureDocument } from "../contracts/figure-document.js";
import { parseFigureDocument, serializeFigureDocument } from "./figure-document.js";

export const FIGURE_SHARE_LINK_VERSION = "v1";
export const FIGURE_SHARE_LINK_PREFIX = "figforge";
export const FIGURE_SHARE_LINK_MAX_CHARS = 8 * 1024;

const SHARE_HASH_PATTERN = /^figforge=(v1)\.([A-Za-z0-9_-]+)$/u;

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const base64UrlToBytes = (encoded: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) throw new Error("Ungültige Share-Link-Daten.");
  const padded = encoded.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - encoded.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const hashForDocument = (document: FigureDocument): string => {
  const content = serializeFigureDocument(figureDocumentSchema.parse(document));
  const payload = bytesToBase64Url(new TextEncoder().encode(content));
  return `${FIGURE_SHARE_LINK_PREFIX}=${FIGURE_SHARE_LINK_VERSION}.${payload}`;
};

/** Create a self-contained link. The document stays in the URL fragment and is never sent to a server. */
export const createFigureShareLink = (document: FigureDocument, currentUrl: string): string => {
  const url = new URL(currentUrl);
  url.hash = hashForDocument(document);
  const link = url.toString();
  if (link.length > FIGURE_SHARE_LINK_MAX_CHARS) throw new Error("Der Share-Link überschreitet das Größenlimit.");
  return link;
};

/** Decode and strictly validate a FigForge share link. */
export const parseFigureShareLink = (value: string): FigureDocument => {
  if (value.length > FIGURE_SHARE_LINK_MAX_CHARS) throw new Error("Der Share-Link überschreitet das Größenlimit.");
  const url = new URL(value, "https://figforge.invalid/");
  const match = SHARE_HASH_PATTERN.exec(url.hash.slice(1));
  if (!match || match[1] !== FIGURE_SHARE_LINK_VERSION) throw new Error("Ungültiger oder veralteter Share-Link.");
  const payload = match[2];
  if (!payload) throw new Error("Ungültige Share-Link-Daten.");
  const bytes = base64UrlToBytes(payload);
  if (bytes.byteLength > FIGURE_DOCUMENT_MAX_BYTES) throw new Error("Der Share-Link überschreitet das Größenlimit.");
  const content = new TextDecoder().decode(bytes);
  return parseFigureDocument(content);
};

export const hasFigureShareLink = (value: string): boolean => {
  try {
    const url = new URL(value, "https://figforge.invalid/");
    return url.hash.startsWith(`#${FIGURE_SHARE_LINK_PREFIX}=`);
  } catch {
    return false;
  }
};
