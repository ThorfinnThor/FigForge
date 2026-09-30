import { writeShopExportPackages } from "./lib/shop-export-packages.js";

const result = await writeShopExportPackages(process.cwd());
console.log(JSON.stringify({ message: "Shop export packages built", ...result }));
