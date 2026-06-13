import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as tar from "tar";
import { DEFAULT_REF } from "../src/args.js";

// Spawns the REAL bin (src/cli.ts via tsx) against a temp cwd — the spec-6
// "run the local bin against a temp dir" check. Offline: the CLI's defaultIO
// honors CREATE_SSO_KIT_TEMPLATE_TGZ and extracts this local fixture instead
// of fetching from GitHub, so the full arg→validate→scaffold→guide glue runs.
const TSX = import.meta.resolve("tsx");
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const LOCAL_TEMPLATE_ENV = "CREATE_SSO_KIT_TEMPLATE_TGZ";

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface RunOpts {
  args?: string[];
  cwd: string;
  tgz?: string;
  /** Extra env; pass { PATH: "" } to make `git` unresolvable. */
  env?: Record<string, string>;
  /** Piped to the child's stdin (for the prompt fallback). */
  input?: string;
}

function runCli({ args = [], cwd, tgz, env = {}, input }: RunOpts): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", TSX, CLI, ...args], {
      cwd,
      env: {
        ...process.env,
        ...(tgz ? { [LOCAL_TEMPLATE_ENV]: tgz } : {}),
        ...env,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function buildFixtureTarball(work: string): Promise<string> {
  const top = join(work, "sso-kit-fixture");
  await mkdir(join(top, "apps", "auth"), { recursive: true });
  await writeFile(
    join(top, "package.json"),
    JSON.stringify({ name: "sso-kit-poc", private: true }, null, 2) + "\n",
  );
  await writeFile(join(top, "SETUP.md"), "# First-time setup — {{PROJECT_NAME}}\nGuide for {{PROJECT_NAME}}.\n");
  await writeFile(join(top, "apps", "auth", ".env.example"), "NEXT_PUBLIC_CONVEX_URL=...\n");
  const tgz = join(work, "fixture.tar.gz");
  await tar.c({ gzip: true, file: tgz, cwd: work }, ["sso-kit-fixture"]);
  return tgz;
}

test("cli bin: scaffolds a temp dir and prints guidance with the chosen pm", async () => {
  const work = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    const tgz = await buildFixtureTarball(work);
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    const r = await runCli({ args: ["my-app", "--pm", "npm"], cwd, tgz });

    assert.equal(r.code, 0, r.stderr);
    assert.ok(
      r.stdout.includes(`Scaffolding my-app from sso-kit@${DEFAULT_REF}`),
      r.stdout,
    );
    assert.match(r.stdout, /✅ Created my-app\./);
    assert.match(r.stdout, /cd my-app && claude/);
    // the --pm hint is wired through to the guidance
    assert.match(r.stdout, /it'll use npm/);

    // the bin actually wrote + customized the project on disk
    const pkg = JSON.parse(await readFile(join(cwd, "my-app", "package.json"), "utf8"));
    assert.equal(pkg.name, "my-app");
    const setup = await readFile(join(cwd, "my-app", "SETUP.md"), "utf8");
    assert.ok(setup.includes("my-app"));
    assert.ok(!setup.includes("{{PROJECT_NAME}}"));
    // fresh git when git is available in this env
    await stat(join(cwd, "my-app", ".git"));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("cli bin: warns (and still succeeds) when git is unavailable", async () => {
  const work = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    const tgz = await buildFixtureTarball(work);
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    // empty PATH → execFileSync("git", …) throws ENOENT → gitInitialized=false branch
    const r = await runCli({ args: ["no-git"], cwd, tgz, env: { PATH: "" } });

    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /✅ Created no-git\./);
    assert.match(r.stdout, /git wasn't initialized/);
    await assert.rejects(stat(join(cwd, "no-git", ".git")));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("cli bin: prompts for a name when the positional is omitted", async () => {
  const work = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    const tgz = await buildFixtureTarball(work);
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    const r = await runCli({ args: [], cwd, tgz, input: "prompted-app\n" });

    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /Project name:/);
    assert.match(r.stdout, /✅ Created prompted-app\./);
    await stat(join(cwd, "prompted-app", "package.json"));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("cli bin: exits 1 with a message on an invalid project name", async () => {
  const work = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    const tgz = await buildFixtureTarball(work);
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    const r = await runCli({ args: ["."], cwd, tgz });

    assert.equal(r.code, 1);
    assert.match(r.stderr, /not a valid project name/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test("cli bin: exits 1 on an invalid --pm value", async () => {
  const work = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    const cwd = join(work, "cwd");
    await mkdir(cwd);

    const r = await runCli({ args: ["my-app", "--pm", "bun"], cwd });

    assert.equal(r.code, 1);
    assert.match(r.stderr, /--pm must be one of/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
