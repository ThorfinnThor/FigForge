import { describe, expect, it } from "vitest";
import { germanPath, languageFromPath, localizedPath, switchLanguageUrl } from "../../src/app/routing.js";

describe("language-aware routing", () => {
  it("takes the language from the /en prefix only", () => {
    expect(languageFromPath("/")).toBe("de");
    expect(languageFromPath("/ideas/pirates")).toBe("de");
    expect(languageFromPath("/en")).toBe("en");
    expect(languageFromPath("/en/")).toBe("en");
    expect(languageFromPath("/en/ideas/pirates/")).toBe("en");
    expect(languageFromPath("/english")).toBe("de");
  });

  it("maps every page between its German and English path", () => {
    for (const path of ["/", "/builder", "/ideas", "/ideas/fire-rescue", "/sets", "/privacy", "/methodology", "/collection"]) {
      const english = localizedPath(path, "en");
      expect(english.startsWith("/en"), path).toBe(true);
      expect(germanPath(english), path).toBe(path);
      expect(localizedPath(path, "de")).toBe(path);
    }
    expect(localizedPath("/", "en")).toBe("/en/");
    expect(localizedPath("/builder", "en")).toBe("/en/builder");
  });

  it("switches the language of the current URL and keeps query and hash", () => {
    expect(switchLanguageUrl({ pathname: "/builder", search: "?template=pirate-captain", hash: "" }, "en"))
      .toBe("/en/builder?template=pirate-captain");
    expect(switchLanguageUrl({ pathname: "/en/", search: "", hash: "#figforge=v2.x" }, "de")).toBe("/#figforge=v2.x");
    expect(switchLanguageUrl({ pathname: "/en/ideas/space/", search: "", hash: "" }, "de")).toBe("/ideas/space");
  });
});
