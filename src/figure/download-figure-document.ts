import type { FigureDocument } from "../contracts/figure-document.js";
import { serializeFigureDocument } from "./figure-document.js";

export const figureDocumentFileName = (name: string): string => {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  return `figforge-${slug || "figure"}.json`;
};

export const downloadFigureDocument = (
  documentToDownload: FigureDocument,
  fileName = figureDocumentFileName(documentToDownload.name),
): void => {
  const content = serializeFigureDocument(documentToDownload);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
