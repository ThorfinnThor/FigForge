import { writeCorePackages } from "./lib/core-packages.js";

const result = await writeCorePackages(process.cwd());
console.log(JSON.stringify({ message: "core packages built", ...result }));
