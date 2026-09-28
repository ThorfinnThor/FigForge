import { basename } from "node:path";

export function embeddedLdrawName(path: string): string {
  if (path.startsWith("parts/s/") || path.startsWith("p/48/")) return path;
  if (path.startsWith("p/8/")) return path.slice("p/".length);
  return basename(path);
}

export function browserReferencePath(path: string): string {
  if (path.startsWith("parts/s/")) return path.slice("parts/".length);
  if (path.startsWith("parts/")) return path.slice("parts/".length);
  if (path.startsWith("p/")) return `../${path}`;
  throw new Error(`Unsupported official LDraw dependency path: ${path}`);
}
