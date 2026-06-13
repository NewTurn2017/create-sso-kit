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
