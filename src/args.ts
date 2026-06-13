import { parseArgs } from "node:util";

export interface Options {
  projectName?: string;
  ref: string;
  pm: "pnpm" | "npm" | "yarn";
}

export const DEFAULT_REF = "v0.1.3";

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
