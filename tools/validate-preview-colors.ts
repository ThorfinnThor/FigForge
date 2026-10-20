import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { previewColorsSchema } from "../src/contracts/preview-colors.js";
import { buildPreviewColors, PREVIEW_COLORS_PATH } from "./lib/preview-colors.js";

const root = process.cwd();
const actual = previewColorsSchema.parse(JSON.parse(await readFile(resolve(root, PREVIEW_COLORS_PATH), "utf8")) as unknown);
assert.deepEqual(actual, await buildPreviewColors(root), "Preview colours are stale; run npm run data:build:preview-colors");
console.log(JSON.stringify({ message: "preview colours valid", mapped: actual.colors.length, unmapped: actual.unmapped.length }));
