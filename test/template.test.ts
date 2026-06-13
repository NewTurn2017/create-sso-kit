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
