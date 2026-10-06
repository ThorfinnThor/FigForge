import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

async function readProjectFile(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), "utf8");
}

describe("repository delivery policy", () => {
  it("contains syntactically valid GitHub workflow YAML", async () => {
    const workflows = await Promise.all([
      readProjectFile(".github/workflows/ci.yml"),
      readProjectFile(".github/workflows/refresh-catalog.yml"),
    ]);

    for (const workflow of workflows) {
      const document = parseDocument(workflow);
      expect(document.errors).toHaveLength(0);
    }
  });

  it("keeps deployment out of GitHub Actions", async () => {
    const workflows = await Promise.all([
      readProjectFile(".github/workflows/ci.yml"),
      readProjectFile(".github/workflows/refresh-catalog.yml"),
    ]);
    const combined = workflows.join("\n").toLowerCase();

    expect(combined).not.toContain("wrangler deploy");
    expect(combined).not.toContain("cloudflare_api_token");
    expect(combined).not.toContain("cloudflare_account_id");
  });

  it("detects newly generated catalog files before opening the data PR", async () => {
    const workflow = await readProjectFile(".github/workflows/refresh-catalog.yml");

    expect(workflow).toContain("git status --porcelain --untracked-files=all -- data");
    expect(workflow).not.toContain("git diff --quiet -- data");
  });

  it("does not mistake a merged automation PR for an open review PR", async () => {
    const workflow = await readProjectFile(".github/workflows/refresh-catalog.yml");

    expect(workflow).toContain("gh pr list --state open");
    expect(workflow).toContain('--head "$branch"');
    expect(workflow).not.toContain('gh pr view "$branch"');
  });

  it("dispatches the required verification for action-created catalog PRs", async () => {
    const [ciWorkflow, catalogWorkflow] = await Promise.all([
      readProjectFile(".github/workflows/ci.yml"),
      readProjectFile(".github/workflows/refresh-catalog.yml"),
    ]);

    expect(ciWorkflow).toContain("workflow_dispatch:");
    expect(catalogWorkflow).toContain("actions: write");
    expect(catalogWorkflow).toContain('gh workflow run ci.yml --ref "$branch"');
  });

  it("keeps Cloudflare branch previews explicitly configured", async () => {
    const wrangler = JSON.parse(await readProjectFile("wrangler.jsonc")) as {
      previews?: Record<string, unknown>;
    };

    expect(wrangler.previews).toEqual({});
  });

  it("pins GitHub-authored actions to immutable commit SHAs", async () => {
    const workflows = await Promise.all([
      readProjectFile(".github/workflows/ci.yml"),
      readProjectFile(".github/workflows/refresh-catalog.yml"),
    ]);
    const actionReferences = workflows
      .flatMap((workflow) => workflow.match(/actions\/[a-z-]+@[a-f0-9]{40}/gu) ?? []);

    expect(actionReferences).toHaveLength(4);
  });

  it("documents the immutable catalog boundary", async () => {
    const agents = await readProjectFile("AGENTS.md");
    const sourceRegister = await readProjectFile("docs/source-register.md");

    expect(agents).toContain("Nur Rebrickable Catalog Downloads/CSV");
    expect(sourceRegister).toContain("keine MOC-Dateien");
    expect(sourceRegister).toContain("Rebrickable API");
  });
});
