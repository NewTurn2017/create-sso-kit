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
