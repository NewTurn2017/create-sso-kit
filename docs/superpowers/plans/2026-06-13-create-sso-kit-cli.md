# create-sso-kit CLI (Component ②) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `create-sso-kit` npm CLI — a thin TypeScript scaffolder that fetches the pinned `sso-kit` tag tarball, extracts it into a new project dir, customizes the root `package.json` name + the `SETUP.md` `{{PROJECT_NAME}}` token, re-inits git with one commit, and prints "cd … && claude" guidance. It installs nothing and touches no env — all of that is delegated to the runbook (Component ①, already shipped in `sso-kit@v0.1.0`).

**Architecture:** Pure, unit-testable modules (`args`, `validate`, `customize`, `template`) composed by a `scaffold` orchestrator that takes an injectable `ScaffoldIO` (so the network fetch + git are stubbed in tests with a local fixture tarball — no network in the test suite). A thin `cli` entry wires arg-parsing → optional one-shot prompt → scaffold → guidance. Compiled with `tsc` to `dist/`; tests run on the TS sources via `tsx`.

**Tech Stack:** Node ≥18 (dev/CI on v22), TypeScript (ESM, `nodenext`), single runtime dep `tar`; built-ins `node:util` `parseArgs`, global `fetch`, `node:readline/promises`, `node:test`. devDeps: `typescript`, `tsx`, `@types/node`.

**Working directory:** All commands run in **`/Users/genie/dev/side/create-sso-kit`** (this repo — currently holds only `.gitignore`, the spec, and these plans). The template it fetches lives at the OTHER repo's published tag `github.com/NewTurn2017/sso-kit@v0.1.0`.

**Spec:** `docs/superpowers/specs/2026-06-13-create-sso-kit-design.md` — this plan implements Component ② (section 4) + distribution (section 5) + the CLI test (section 6).

**Prerequisite (DONE):** `sso-kit@v0.1.0` is tagged and pushed; its tarball at `https://github.com/NewTurn2017/sso-kit/archive/refs/tags/v0.1.0.tar.gz` was verified reachable (HTTP 200). The template's `package.json` name is `sso-kit-poc` and its `SETUP.md` contains the `{{PROJECT_NAME}}` token (the injection contract authored in Plan 1).

**Decisions locked during planning:**
- npm name `create-sso-kit` is AVAILABLE (registry 404) — no fallback needed.
- Extraction via the `tar` package with `strip: 1` (strips GitHub's top-level `sso-kit-<ref>/` dir). Download via global `fetch` → temp file → extract, so the source is injectable for offline tests.
- `@sso-kit/*` workspace package names are LEFT AS-IS (spec 4.3 — renaming risks breakage). Only root `name` + `SETUP.md` token change.
- Project name required; if omitted, ONE `readline` prompt (no prompt library). `dir` = the name as typed (validated single path segment); `pkgName` = a lowercased npm-safe slug of it.
- Default `--ref` = `v0.1.0` (the cut tag).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Create | name `create-sso-kit`, `bin`, `type: module`, `files: ["dist"]`, scripts (build/dev/test/prepublishOnly), dep `tar`. |
| `tsconfig.json` | Create | ESM `nodenext`, `outDir dist`, `rootDir src`, strict, `verbatimModuleSyntax`. |
| `.gitignore` | Modify | ensure `node_modules` and `dist` ignored. |
| `src/args.ts` | Create | `parseCliArgs(argv)` → `Options`; `detectPm`; `DEFAULT_REF`. Pure. |
| `src/validate.ts` | Create | `validateProjectName(name)` → `ResolvedName {dir, pkgName}`. Pure. |
| `src/customize.ts` | Create | `setPackageName`, `injectProjectName`, `PROJECT_NAME_TOKEN`. Pure. |
| `src/template.ts` | Create | `tarballUrl(ref)`, `extractTarball(tgz,dest)`, `downloadAndExtract(url,dest)`. |
| `src/scaffold.ts` | Create | `ScaffoldIO`, `defaultIO`, `scaffold(resolved, opts, cwd, io)` orchestrator. |
| `src/prompt.ts` | Create | `promptProjectName()` — single readline question. |
| `src/cli.ts` | Create | shebang entry: parse → prompt-if-missing → scaffold → `printGuide`. |
| `test/args.test.ts` | Create | parseCliArgs / detectPm. |
| `test/validate.test.ts` | Create | name validation + slug. |
| `test/customize.test.ts` | Create | package name + token injection. |
| `test/template.test.ts` | Create | url builder + `extractTarball` strip:1 (built fixture, offline). |
| `test/scaffold.test.ts` | Create | full scaffold integration with injected fixture fetch (offline). |

---

### Task 1: Project scaffolding (package.json, tsconfig, deps)

**Files:** Create `package.json`, `tsconfig.json`; Modify `.gitignore`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "create-sso-kit",
  "version": "0.1.0",
  "description": "Scaffold a subdomain-SSO starter (Next.js 15 + Convex + Better Auth) and let your AI agent finish setup via SETUP.md.",
  "type": "module",
  "bin": { "create-sso-kit": "dist/cli.js" },
  "files": ["dist"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/cli.ts",
    "test": "node --import tsx --test test/*.test.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["sso", "subdomain", "convex", "better-auth", "nextjs", "scaffold", "create"],
  "license": "MIT",
  "dependencies": { "tar": "^7.4.3" },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": false,
    "sourceMap": false,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Ensure `.gitignore` ignores `node_modules` and `dist`**

Run:
```bash
cd /Users/genie/dev/side/create-sso-kit && grep -qxF node_modules .gitignore || printf 'node_modules\n' >> .gitignore; grep -qxF dist .gitignore || printf 'dist\n' >> .gitignore; cat .gitignore
```
Expected: `.gitignore` contains both `node_modules` and `dist` (no duplicates added if already present).

- [ ] **Step 4: Install dependencies**

Run:
```bash
cd /Users/genie/dev/side/create-sso-kit && pnpm install
```
Expected: installs `tar`, `typescript`, `tsx`, `@types/node`; creates `pnpm-lock.yaml`. No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add package.json tsconfig.json .gitignore pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: scaffold create-sso-kit CLI project (ts, tsx, tar)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `args.ts` — CLI argument parsing

**Files:** Create `src/args.ts`, `test/args.test.ts`.

- [ ] **Step 1: Write the failing test** — `test/args.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCliArgs, detectPm, DEFAULT_REF } from "../src/args.js";

test("defaults: only a project name", () => {
  const o = parseCliArgs(["my-app"]);
  assert.equal(o.projectName, "my-app");
  assert.equal(o.ref, DEFAULT_REF);
  assert.ok(["pnpm", "npm", "yarn"].includes(o.pm));
});

test("--ref overrides the tag", () => {
  assert.equal(parseCliArgs(["my-app", "--ref", "v0.2.0"]).ref, "v0.2.0");
});

test("--pm overrides the package manager", () => {
  assert.equal(parseCliArgs(["my-app", "--pm", "npm"]).pm, "npm");
});

test("missing project name → undefined (cli will prompt)", () => {
  assert.equal(parseCliArgs([]).projectName, undefined);
});

test("detectPm reads the npm_config_user_agent prefix", () => {
  assert.equal(detectPm("yarn/1.22.0 npm/? node/v22"), "yarn");
  assert.equal(detectPm("pnpm/10.0.0"), "pnpm");
  assert.equal(detectPm("npm/10.0.0"), "npm");
  assert.equal(detectPm(""), "pnpm");
});

test("invalid --pm throws", () => {
  assert.throws(() => parseCliArgs(["my-app", "--pm", "bun"]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/args.test.ts`
Expected: FAIL — cannot resolve `../src/args.js` (module not created yet).

- [ ] **Step 3: Write `src/args.ts`**

```ts
import { parseArgs } from "node:util";

export interface Options {
  projectName?: string;
  ref: string;
  pm: "pnpm" | "npm" | "yarn";
}

export const DEFAULT_REF = "v0.1.0";

export function detectPm(userAgent = process.env.npm_config_user_agent ?? ""): Options["pm"] {
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("npm")) return "npm";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  return "pnpm";
}

export function parseCliArgs(argv: string[]): Options {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      ref: { type: "string" },
      pm: { type: "string" },
    },
  });
  const pm = (values.pm ?? detectPm()) as Options["pm"];
  if (!["pnpm", "npm", "yarn"].includes(pm)) {
    throw new Error(`--pm must be one of pnpm|npm|yarn (got "${pm}")`);
  }
  return {
    projectName: positionals[0],
    ref: values.ref ?? DEFAULT_REF,
    pm,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/args.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/args.ts test/args.test.ts
git commit -m "feat: CLI argument parsing (parseCliArgs, detectPm)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `validate.ts` — project-name validation

**Files:** Create `src/validate.ts`, `test/validate.test.ts`.

- [ ] **Step 1: Write the failing test** — `test/validate.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProjectName } from "../src/validate.js";

test("simple valid name", () => {
  const r = validateProjectName("my-app");
  assert.equal(r.dir, "my-app");
  assert.equal(r.pkgName, "my-app");
});

test("uppercase → dir preserved, pkgName lowercased", () => {
  const r = validateProjectName("My-App");
  assert.equal(r.dir, "My-App");
  assert.equal(r.pkgName, "my-app");
});

test("spaces → dashes in pkgName", () => {
  assert.equal(validateProjectName("my cool app").pkgName, "my-cool-app");
});

test("rejects path separators", () => {
  assert.throws(() => validateProjectName("foo/bar"));
  assert.throws(() => validateProjectName("foo\\bar"));
});

test("rejects ., .., and leading dot", () => {
  assert.throws(() => validateProjectName("."));
  assert.throws(() => validateProjectName(".."));
  assert.throws(() => validateProjectName(".hidden"));
});

test("rejects empty / whitespace", () => {
  assert.throws(() => validateProjectName("   "));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/validate.test.ts`
Expected: FAIL — `../src/validate.js` not found.

- [ ] **Step 3: Write `src/validate.ts`**

```ts
export interface ResolvedName {
  /** Directory to create (the name as typed, validated as a single path segment). */
  dir: string;
  /** npm-safe name for the root package.json. */
  pkgName: string;
}

export function validateProjectName(input: string): ResolvedName {
  const name = input.trim();
  if (!name) throw new Error("Project name is required.");
  if (name === "." || name === "..") throw new Error(`"${name}" is not a valid project name.`);
  if (/[\\/]/.test(name)) throw new Error("Project name cannot contain path separators.");
  if (name.startsWith(".")) throw new Error("Project name cannot start with a dot.");

  const pkgName = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-_.]+/, "")
    .replace(/[-_.]+$/, "");
  if (!pkgName) throw new Error(`Cannot derive a valid package name from "${name}".`);
  if (pkgName.length > 214) throw new Error("Project name is too long (npm max 214 chars).");

  return { dir: name, pkgName };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/validate.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/validate.ts test/validate.test.ts
git commit -m "feat: project-name validation + npm slug derivation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `customize.ts` — package name + SETUP.md token injection

**Files:** Create `src/customize.ts`, `test/customize.test.ts`.

- [ ] **Step 1: Write the failing test** — `test/customize.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { setPackageName, injectProjectName, PROJECT_NAME_TOKEN } from "../src/customize.js";

test("setPackageName replaces name, preserves other fields, trailing newline", () => {
  const input = JSON.stringify({ name: "sso-kit-poc", private: true, version: "0.0.0" }, null, 2);
  const out = setPackageName(input, "my-app");
  const parsed = JSON.parse(out);
  assert.equal(parsed.name, "my-app");
  assert.equal(parsed.private, true);
  assert.equal(parsed.version, "0.0.0");
  assert.ok(out.endsWith("\n"));
});

test("injectProjectName replaces ALL token occurrences", () => {
  const md = `# First-time setup — ${PROJECT_NAME_TOKEN}\nHello ${PROJECT_NAME_TOKEN}!`;
  const out = injectProjectName(md, "my-app");
  assert.equal(out, "# First-time setup — my-app\nHello my-app!");
  assert.ok(!out.includes(PROJECT_NAME_TOKEN));
});

test("injectProjectName is a no-op when token absent", () => {
  assert.equal(injectProjectName("no token here", "my-app"), "no token here");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/customize.test.ts`
Expected: FAIL — `../src/customize.js` not found.

- [ ] **Step 3: Write `src/customize.ts`**

```ts
export const PROJECT_NAME_TOKEN = "{{PROJECT_NAME}}";

/** Set the root package.json `name`, preserving every other field. */
export function setPackageName(packageJsonText: string, pkgName: string): string {
  const pkg = JSON.parse(packageJsonText) as Record<string, unknown>;
  pkg.name = pkgName;
  return JSON.stringify(pkg, null, 2) + "\n";
}

/** Replace every {{PROJECT_NAME}} token in the runbook with the project name. */
export function injectProjectName(setupMdText: string, projectName: string): string {
  return setupMdText.split(PROJECT_NAME_TOKEN).join(projectName);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/customize.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/customize.ts test/customize.test.ts
git commit -m "feat: package-name + SETUP.md token customization

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `template.ts` — tarball URL + extraction

**Files:** Create `src/template.ts`, `test/template.test.ts`.

- [ ] **Step 1: Write the failing test** — `test/template.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tar from "tar";
import { tarballUrl, extractTarball } from "../src/template.js";

test("tarballUrl builds the GitHub tag archive URL", () => {
  assert.equal(
    tarballUrl("v0.1.0"),
    "https://github.com/NewTurn2017/sso-kit/archive/refs/tags/v0.1.0.tar.gz",
  );
});

test("extractTarball strips the top-level dir (strip:1)", async () => {
  const work = await mkdtemp(join(tmpdir(), "tmpl-"));
  try {
    const top = join(work, "sso-kit-x");
    await mkdir(join(top, "apps"), { recursive: true });
    await writeFile(join(top, "package.json"), '{"name":"sso-kit-poc"}\n');
    await writeFile(join(top, "apps", "a.txt"), "hi");
    const tgz = join(work, "fix.tar.gz");
    await tar.c({ gzip: true, file: tgz, cwd: work }, ["sso-kit-x"]);

    const dest = join(work, "out");
    await mkdir(dest);
    await extractTarball(tgz, dest);

    // files land directly in dest, not under sso-kit-x/
    assert.equal((await readFile(join(dest, "package.json"), "utf8")).trim(), '{"name":"sso-kit-poc"}');
    await stat(join(dest, "apps", "a.txt"));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/template.test.ts`
Expected: FAIL — `../src/template.js` not found.

- [ ] **Step 3: Write `src/template.ts`**

```ts
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar";

const REPO = "NewTurn2017/sso-kit";

export function tarballUrl(ref: string): string {
  return `https://github.com/${REPO}/archive/refs/tags/${ref}.tar.gz`;
}

/** Extract a local .tar.gz into `dest`, stripping the archive's top-level dir. */
export async function extractTarball(tgzPath: string, dest: string): Promise<void> {
  await tar.x({ file: tgzPath, cwd: dest, strip: 1 });
}

/** Download a .tar.gz from `url` and extract it into `dest`. */
export async function downloadAndExtract(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download template (${res.status} ${res.statusText}): ${url}`);
  }
  const tmp = await mkdtemp(join(tmpdir(), "create-sso-kit-"));
  const tgz = join(tmp, "template.tar.gz");
  try {
    await pipeline(Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(tgz));
    await extractTarball(tgz, dest);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/template.test.ts`
Expected: PASS (2 tests). (`downloadAndExtract`'s network path is not unit-tested here; it is exercised live in Task 8.)

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/template.ts test/template.test.ts
git commit -m "feat: template tarball url + extraction (strip top-level dir)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `scaffold.ts` — orchestrator (integration test)

**Files:** Create `src/scaffold.ts`, `test/scaffold.test.ts`.

- [ ] **Step 1: Write the failing test** — `test/scaffold.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/scaffold.test.ts`
Expected: FAIL — `../src/scaffold.js` not found.

- [ ] **Step 3: Write `src/scaffold.ts`**

```ts
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { tarballUrl, downloadAndExtract } from "./template.js";
import { setPackageName, injectProjectName } from "./customize.js";
import type { ResolvedName } from "./validate.js";

export interface ScaffoldIO {
  fetchTemplate: (ref: string, dest: string) => Promise<void>;
  initGit: (dest: string) => void;
}

export const defaultIO: ScaffoldIO = {
  fetchTemplate: (ref, dest) => downloadAndExtract(tarballUrl(ref), dest),
  initGit: (dest) => {
    rmSync(join(dest, ".git"), { recursive: true, force: true }); // defensive (tarball has none)
    const git = (args: string[]) => execFileSync("git", args, { cwd: dest, stdio: "ignore" });
    git(["init", "-b", "main"]);
    git(["add", "-A"]);
    git([
      "-c", "user.name=create-sso-kit",
      "-c", "user.email=create-sso-kit@users.noreply.github.com",
      "commit", "-m", "Initial commit (scaffolded by create-sso-kit)",
    ]);
  },
};

export interface ScaffoldResult {
  dir: string;
  gitInitialized: boolean;
}

export async function scaffold(
  resolved: ResolvedName,
  opts: { ref: string },
  cwd: string,
  io: ScaffoldIO = defaultIO,
): Promise<ScaffoldResult> {
  const dest = join(cwd, resolved.dir);
  if (existsSync(dest) && (await readdir(dest)).length > 0) {
    throw new Error(`Target directory "${resolved.dir}" already exists and is not empty.`);
  }
  await mkdir(dest, { recursive: true });
  await io.fetchTemplate(opts.ref, dest);
  await customizeRootPackage(dest, resolved.pkgName);
  await customizeSetup(dest, resolved.dir);

  let gitInitialized = false;
  try {
    io.initGit(dest);
    gitInitialized = true;
  } catch {
    // git not available — scaffold still succeeded; cli warns the user.
  }
  return { dir: dest, gitInitialized };
}

async function customizeRootPackage(dest: string, pkgName: string): Promise<void> {
  const p = join(dest, "package.json");
  await writeFile(p, setPackageName(await readFile(p, "utf8"), pkgName));
}

async function customizeSetup(dest: string, projectName: string): Promise<void> {
  const p = join(dest, "SETUP.md");
  if (!existsSync(p)) return;
  await writeFile(p, injectProjectName(await readFile(p, "utf8"), projectName));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/genie/dev/side/create-sso-kit && node --import tsx --test test/scaffold.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the FULL suite**

Run: `cd /Users/genie/dev/side/create-sso-kit && pnpm test`
Expected: all tests across the 5 test files PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/scaffold.ts test/scaffold.test.ts
git commit -m "feat: scaffold orchestrator (extract, customize, fresh git)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `cli.ts` + `prompt.ts` + build

**Files:** Create `src/prompt.ts`, `src/cli.ts`.

- [ ] **Step 1: Write `src/prompt.ts`**

```ts
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function promptProjectName(): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question("Project name: ")).trim();
  } finally {
    rl.close();
  }
}
```

- [ ] **Step 2: Write `src/cli.ts`**

```ts
#!/usr/bin/env node
import { parseCliArgs, type Options } from "./args.js";
import { validateProjectName } from "./validate.js";
import { scaffold } from "./scaffold.js";
import { promptProjectName } from "./prompt.js";

async function main(): Promise<void> {
  const opts = parseCliArgs(process.argv.slice(2));
  const name = opts.projectName ?? (await promptProjectName());
  const resolved = validateProjectName(name);

  console.log(`\nScaffolding ${resolved.dir} from sso-kit@${opts.ref}…`);
  const { gitInitialized } = await scaffold(resolved, { ref: opts.ref }, process.cwd());
  printGuide(resolved.dir, opts.pm, gitInitialized);
}

function printGuide(dir: string, pm: Options["pm"], gitInitialized: boolean): void {
  console.log(`\n✅ Created ${dir}.`);
  console.log(`\nNext: cd ${dir} && claude   (or codex)`);
  console.log(`Your agent will walk you through setup via SETUP.md (it'll use ${pm}).`);
  if (!gitInitialized) {
    console.log(`\nnote: git wasn't initialized — install git and run "git init" in ${dir}.`);
  }
}

main().catch((err: unknown) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 3: Build with `tsc`**

Run: `cd /Users/genie/dev/side/create-sso-kit && pnpm build`
Expected: no type errors; `dist/cli.js`, `dist/args.js`, … emitted. `dist/cli.js` keeps the `#!/usr/bin/env node` shebang on line 1.

- [ ] **Step 4: Smoke-test the built entry (error path, no network)**

Run: `cd /Users/genie/dev/side/create-sso-kit && echo "" | node dist/cli.js --pm bun 2>&1; echo "exit=$?"`
Expected: prints `✖ --pm must be one of pnpm|npm|yarn (got "bun")` and `exit=1`. (Confirms the entry wires parse → error handling without hitting the network.)

- [ ] **Step 5: Commit**

```bash
cd /Users/genie/dev/side/create-sso-kit
git add src/prompt.ts src/cli.ts
git commit -m "feat: cli entry + one-shot prompt + next-step guidance

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Live end-to-end against `sso-kit@v0.1.0` (spec section 6 CLI test)

Runs the built `bin` against a real fetch of the published tag, in a throwaway temp dir, and asserts every CLI acceptance criterion. Requires network.

**Files:** none modified (validation only).

- [ ] **Step 1: Build is current**

Run: `cd /Users/genie/dev/side/create-sso-kit && pnpm build`
Expected: clean build.

- [ ] **Step 2: Scaffold a real project in /tmp**

```bash
rm -rf /tmp/cssk-e2e && mkdir -p /tmp/cssk-e2e
cd /tmp/cssk-e2e && node /Users/genie/dev/side/create-sso-kit/dist/cli.js my-app --ref v0.1.0
```
Expected: prints `Scaffolding my-app from sso-kit@v0.1.0…` then `✅ Created my-app.` and the `cd my-app && claude` guidance. Exit 0.

- [ ] **Step 3: Assert the scaffold matches the spec's CLI criteria**

```bash
cd /tmp/cssk-e2e/my-app
echo "name:"; node -e "console.log(require('./package.json').name)"   # → my-app
echo "token gone + name present in SETUP.md:"; grep -c "{{PROJECT_NAME}}" SETUP.md; grep -c "my-app" SETUP.md
echo "runbook pointer present:"; grep -c "First-time setup" AGENTS.md CLAUDE.md
echo "fresh git, one commit, main:"; git rev-list --count HEAD; git rev-parse --abbrev-ref HEAD
echo "no install / no env writes:"; test -d node_modules && echo "FAIL node_modules" || echo "ok: no node_modules"; ls apps/*/.env.local 2>/dev/null && echo "FAIL .env.local" || echo "ok: no .env.local"
echo "convex auto-block preserved:"; grep -c "convex-ai-start" AGENTS.md CLAUDE.md
```
Expected: name `my-app`; `{{PROJECT_NAME}}` count `0`, `my-app` count ≥1; pointer present in both; commit count `1`, branch `main`; "ok: no node_modules", "ok: no .env.local"; convex block count `1` each.

- [ ] **Step 4: Confirm the scaffolded runbook still triggers a fresh agent (dogfood, ties Plan 1 + Plan 2)**

Dispatch a cold-start subagent (Agent tool, `subagent_type: "general-purpose"`) pointed at `/tmp/cssk-e2e/my-app` with the prompt:
> You've just been opened as a coding agent in the project at `/tmp/cssk-e2e/my-app`. The user says "set this project up." Follow your normal startup (read AGENTS.md/CLAUDE.md), then output the ordered actions you'd take — DO NOT run commands. Confirm: does the project name appear correctly (not a literal `{{PROJECT_NAME}}`)? Do you stop at the Convex login gate?

Confirm the subagent: finds `SETUP.md` via the pointer, sees the injected project name `my-app` (no literal token), and still stops at the Convex human gate. (This re-validates that scaffolding didn't break the Component ① runbook.)

- [ ] **Step 5: Clean up**

Run: `rm -rf /tmp/cssk-e2e`

- [ ] **Step 6: Commit (none) — record the e2e result**

No files changed. Note the e2e + dogfood verdict in the next commit body or the branch-completion summary.

---

### Task 9: Publish (gated — npm + repo)

Both sub-steps are outward-facing; confirm with the user before each. npm name `create-sso-kit` was verified AVAILABLE during planning, but re-check immediately before publishing.

**Files:** none modified.

- [ ] **Step 1: Re-verify npm name availability**

Run: `npm view create-sso-kit version 2>&1 | head -3`
Expected: `404 Not Found` (still available). If it now resolves to a version, STOP — the name was taken; pick a fallback (spec section 7) and update `package.json` `name` + the bin + README before publishing.

- [ ] **Step 2: Inspect the publish payload**

```bash
cd /Users/genie/dev/side/create-sso-kit && pnpm build && npm pack --dry-run
```
Expected: the tarball includes ONLY `dist/**`, `package.json`, `LICENSE`, `README*` (via `files: ["dist"]` + npm defaults) — NOT `src/`, `test/`, `node_modules/`. If `src`/`test` appear, fix `files`.

- [ ] **Step 3: Publish to npm (USER-GATED)**

Confirm with the user, ensure `npm whoami` is the intended account, then:
```bash
cd /Users/genie/dev/side/create-sso-kit && npm publish --access public
```
Expected: `create-sso-kit@0.1.0` published.

- [ ] **Step 4: Verify the published command works end-to-end**

```bash
rm -rf /tmp/cssk-pub && mkdir -p /tmp/cssk-pub && cd /tmp/cssk-pub
pnpm create sso-kit verify-app
test -f verify-app/SETUP.md && grep -qc my-app verify-app/SETUP.md; grep -c "{{PROJECT_NAME}}" verify-app/SETUP.md
rm -rf /tmp/cssk-pub
```
Expected: `pnpm create sso-kit` resolves `create-sso-kit` from the registry, scaffolds `verify-app`, SETUP.md token count `0`.

- [ ] **Step 5: Publish the create-sso-kit repo (USER-GATED, optional dogfood)**

Spec section 5 dogfooding: publish THIS repo to GitHub with the `make-public` skill. This is a separate, user-initiated action — offer it; if the user agrees, invoke the `make-public` skill (it writes the bilingual README, .gitignore, scans for secrets, and pushes a public repo). Do not run it unprompted.

---

## Self-Review

**1. Spec coverage (Component ② = section 4, distribution = 5, CLI test = 6):**
- 4 invocation `pnpm/npm/yarn create sso-kit` → package name `create-sso-kit` + `create-` prefix (Task 1); verified live in Task 9 Step 4. ✓
- 4 tech: Node ≥18, **TypeScript**, minimal deps, single bin, GitHub tag tarball, small tar utility → Task 1 (`tar`, tsconfig, bin) + Task 5 (`tarballUrl`/extract). ✓
- 4.1 resolve dir, prompt-if-omitted, error if non-empty → `cli.ts` prompt (Task 7) + `scaffold` non-empty guard (Task 6, tested). ✓
- 4.2 download pinned `--ref` tag, extract → Task 5 + `defaultIO.fetchTemplate` (Task 6); live in Task 8. ✓
- 4.3 root `name` → project name; inject `SETUP.md` token; leave `@sso-kit/*` as-is → `customize.ts` + scaffold only touches root package.json + SETUP.md (Task 4/6). ✓
- 4.4 remove `.git`, `git init -b main`, initial commit → `defaultIO.initGit` (Task 6, asserts count=1 + branch main). ✓
- 4.5 next-step guidance text → `printGuide` (Task 7), matches spec's "✅ Created … cd … && claude (or codex) … SETUP.md". ✓
- 4 "does NOT" install/env/etc → scaffold never installs or writes `.env.local`; asserted in Task 6 + Task 8 Step 3. ✓
- 4 flags `[project-name]`, `--ref`, `--pm` → `args.ts` (Task 2). ✓
- 5 published to npm; name availability checked → Task 9 Step 1 (verified available in planning). ✓
- 5 dogfood via make-public → Task 9 Step 5. ✓
- 6 CLI test: run bin → expected files, name customized, SETUP.md has name, fresh `.git` one commit, no install/.env.local, no publish needed → Task 6 (offline) + Task 8 (live). ✓
- 7 risk npm-name-taken → Task 9 Step 1 fallback branch. risk template-fetch-needs-tag → prerequisite satisfied (v0.1.0 pushed). ✓

**2. Placeholder scan:** Every source file and test is written out in full; every command has expected output. The only `{{...}}` is the literal `PROJECT_NAME_TOKEN` string the code searches for (defined in `customize.ts`, consumed by `scaffold`/tests) — a real constant, not a plan gap. No "TBD"/"handle errors"/"similar to". ✓

**3. Type / name consistency across tasks:**
- `Options {projectName?, ref, pm}` — defined `args.ts` (T2), consumed `cli.ts` (T7). ✓
- `ResolvedName {dir, pkgName}` — defined `validate.ts` (T3), consumed `scaffold.ts` + tests (T6). ✓
- `PROJECT_NAME_TOKEN` / `setPackageName` / `injectProjectName` — `customize.ts` (T4), used in `scaffold.ts` (T6) and tests (T4/T6). ✓
- `tarballUrl` / `extractTarball` / `downloadAndExtract` — `template.ts` (T5), used in `scaffold.ts` defaultIO (T6) + tests (T5/T6). ✓
- `ScaffoldIO {fetchTemplate, initGit}`, `scaffold(resolved, {ref}, cwd, io)`, `ScaffoldResult {dir, gitInitialized}` — identical signature in `scaffold.ts`, `cli.ts` call site, and `scaffold.test.ts`. ✓
- `DEFAULT_REF = "v0.1.0"` matches the cut tag and the bin's default. ✓
- Relative imports use `.js` extensions throughout (nodenext ESM) — args/validate/customize/template/scaffold/prompt/cli + every test import. ✓
- Test command `node --import tsx --test test/*.test.ts` identical in package.json `test` script and every per-file run step. ✓
