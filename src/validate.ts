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
