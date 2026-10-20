import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { messages } from "../src/i18n.js";
import { renderRobotsTxt, renderRoutePage, renderSitemapXml } from "../src/seo/render.js";
import { SEO_ROUTES } from "../src/seo/routes.js";

const distDirectory = resolve(process.cwd(), "dist");
const template = await readFile(resolve(distDirectory, "index.html"), "utf8");

for (const route of SEO_ROUTES) {
  const target = route.path === "/"
    ? resolve(distDirectory, "index.html")
    : resolve(distDirectory, `.${route.path}`, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderRoutePage(template, route, messages.de), "utf8");
}

await writeFile(resolve(distDirectory, "robots.txt"), renderRobotsTxt(), "utf8");
await writeFile(resolve(distDirectory, "sitemap.xml"), renderSitemapXml(), "utf8");
console.log(`Prerendered ${SEO_ROUTES.length} routes, robots.txt and sitemap.xml.`);
