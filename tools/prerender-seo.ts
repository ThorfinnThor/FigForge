import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolveMeasurementId } from "../src/consent/measurement-id.js";
import { messages } from "../src/i18n.js";
import { renderRobotsTxt, renderRoutePage, renderSitemapXml } from "../src/seo/render.js";
import { SEO_LANGUAGES, SEO_ROUTES, routePath } from "../src/seo/routes.js";

const distDirectory = resolve(process.cwd(), "dist");
// The same build variable the app reads, so the prerendered privacy text matches the app.
const analytics = resolveMeasurementId(process.env.VITE_GA_MEASUREMENT_ID) !== null;
const template = await readFile(resolve(distDirectory, "index.html"), "utf8");

for (const language of SEO_LANGUAGES) {
  for (const route of SEO_ROUTES) {
    const path = routePath(route, language);
    const target = path === "/"
      ? resolve(distDirectory, "index.html")
      : resolve(distDirectory, `.${path}`, "index.html");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, renderRoutePage(template, route, messages[language], language, { analytics }), "utf8");
  }
}

await writeFile(resolve(distDirectory, "robots.txt"), renderRobotsTxt(), "utf8");
await writeFile(resolve(distDirectory, "sitemap.xml"), renderSitemapXml(), "utf8");
console.log(`Prerendered ${SEO_ROUTES.length * SEO_LANGUAGES.length} pages, robots.txt and sitemap.xml.`);
