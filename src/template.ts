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
