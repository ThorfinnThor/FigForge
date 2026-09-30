import { writeLDrawRuntimePackages } from "./lib/ldraw-runtime-packages.js";

const result = await writeLDrawRuntimePackages(process.cwd());
console.log(JSON.stringify({ message: "LDraw runtime packages built", ...result }));
