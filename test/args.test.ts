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
