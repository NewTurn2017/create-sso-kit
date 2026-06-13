import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { tarballUrl, downloadAndExtract, extractTarball } from "./template.js";
import { setPackageName, injectProjectName } from "./customize.js";
import type { ResolvedName } from "./validate.js";

export interface ScaffoldIO {
  fetchTemplate: (ref: string, dest: string) => Promise<void>;
  initGit: (dest: string) => void;
}

/**
 * Test/offline seam: when CREATE_SSO_KIT_TEMPLATE_TGZ points at a local .tar.gz,
 * the real bin extracts that instead of fetching from GitHub. Lets the CLI run
 * (and be spawned in tests) with no network. Unset in normal use → live fetch.
 */
export const LOCAL_TEMPLATE_ENV = "CREATE_SSO_KIT_TEMPLATE_TGZ";

export const defaultIO: ScaffoldIO = {
  fetchTemplate: (ref, dest) => {
    const localTgz = process.env[LOCAL_TEMPLATE_ENV];
    if (localTgz) return extractTarball(localTgz, dest);
    return downloadAndExtract(tarballUrl(ref), dest);
  },
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
