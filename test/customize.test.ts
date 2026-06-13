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
