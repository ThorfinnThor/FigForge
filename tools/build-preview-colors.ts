import { writePreviewColors } from "./lib/preview-colors.js";

console.log(JSON.stringify({ message: "preview colours built", ...await writePreviewColors(process.cwd()) }));
