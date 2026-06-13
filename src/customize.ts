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
