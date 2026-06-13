import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import * as tar from "tar";
import { scaffold, defaultIO } from "../src/scaffold.js";
import { extractTarball } from "../src/template.js";

async function buildFixtureTarball(work: string): Promise<string> {
  const top = join(work, "sso-kit-fixture");
  await mkdir(join(top, "apps", "auth"), { recursive: true });
  await mkdir(join(top, "packages", "backend"), { recursive: true });
  await writeFile(join(top, "package.json"), JSON.stringify({ name: "sso-kit-poc", private: true }, null, 2) + "\n");
  await writeFile(join(top, "SETUP.md"), "# First-time setup — {{PROJECT_NAME}}\nGuide for {{PROJECT_NAME}}.\n");
  await writeFile(join(top, "AGENTS.md"), "<!-- convex-ai-start -->\nx\n<!-- convex-ai-end -->\n\n## First-time setup\nFollow SETUP.md.\n");
  await writeFile(join(top, "apps", "auth", ".env.example"), "NEXT_PUBLIC_CONVEX_URL=...\n");
  await writeFile(join(top, "README.md"), "# SSO Kit\n");
  const tgz = join(work, "fixture.tar.gz");
  await tar.c({ gzip: true, file: tgz, cwd: work }, ["sso-kit-fixture"]);
  return tgz;
}

test("scaffold: customizes name + token, fresh git, no install/.env.local", async () => {
  const work = await mkdtemp(join(tmpdir(), "scaffold-"));
  try {
    const tgz = await buildFixtureTarball(work);
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    const result = await scaffold(
      { dir: "my-app", pkgName: "my-app" },
      { ref: "vfix" },
      cwd,
      { fetchTemplate: (_ref, dest) => extractTarball(tgz, dest), initGit: defaultIO.initGit },
    );
    const dir = result.dir;

    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "my-app");

    const setup = await readFile(join(dir, "SETUP.md"), "utf8");
    assert.ok(setup.includes("my-app"));
    assert.ok(!setup.includes("{{PROJECT_NAME}}"));

    // runbook pointer survived the copy
    assert.ok((await readFile(join(dir, "AGENTS.md"), "utf8")).includes("First-time setup"));

    // fresh git: exactly one commit on main
    assert.equal(result.gitInitialized, true);
    await stat(join(dir, ".git"));
    assert.equal(execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: dir }).toString().trim(), "1");
    assert.equal(execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir }).toString().trim(), "main");

    // CLI installed nothing and wrote no env
    await assert.rejects(stat(join(dir, "node_modules")));
    await assert.rejects(stat(join(dir, "apps", "auth", ".env.local")));
    await stat(join(dir, "apps", "auth", ".env.example")); // example preserved
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("scaffold: refuses a non-empty existing target dir", async () => {
  const work = await mkdtemp(join(tmpdir(), "scaffold-"));
  try {
    const cwd = join(work, "cwd");
    await mkdir(join(cwd, "taken"), { recursive: true });
    await writeFile(join(cwd, "taken", "x"), "1");
    await assert.rejects(
      scaffold({ dir: "taken", pkgName: "taken" }, { ref: "vfix" }, cwd, {
        fetchTemplate: async () => {},
        initGit: () => {},
      }),
      /not empty|already exists/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
