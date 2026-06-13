[English](README.md) · [한국어](README.ko.md)

# create-sso-kit

Scaffold a **subdomain single sign-on** starter — [Next.js 15](https://nextjs.org) + [Convex](https://convex.dev) + [Better Auth](https://better-auth.com) — and let your AI coding agent finish the setup for you.

`create-sso-kit` is a thin scaffolder. It fetches the pinned [`sso-kit`](https://github.com/NewTurn2017/sso-kit) template, drops it into a new project, and stops. The decision-heavy and human-only parts of setup — `pnpm install`, the interactive Convex login, the four `convex env set` values, each app's `.env.local`, the dev-domain choice, and the run/verify pass — are delegated to a bundled runbook (`SETUP.md`) that **your existing Claude Code or Codex agent executes step by step**, pausing to ask you only where it must (the browser login, the domain choice).

## Quick start

```bash
pnpm create sso-kit my-app
# or:  npm create sso-kit@latest my-app
# or:  npx create-sso-kit my-app
```

Then hand the rest to your agent:

```bash
cd my-app
claude          # or: codex
```

The agent reads `AGENTS.md` / `CLAUDE.md`, finds `SETUP.md`, and walks you through configuring the kit — stopping at the Convex login and the dev-domain choice for your input.

## What the CLI does (and doesn't)

**Does** (deterministic file ops only):

1. Downloads the `sso-kit` template at the pinned tag (override with `--ref`).
2. Extracts it into `my-app/`.
3. Customizes the root `package.json` `name` and injects your project name into `SETUP.md`.
4. Re-initializes git (`git init -b main`) with a single initial commit.
5. Prints next-step guidance.

**Does NOT**: install dependencies, log in to Convex, set environment variables, write `.env.local`, choose a domain, run, or verify anything. All of that lives in the runbook and is performed by your agent — see [`sso-kit/SETUP.md`](https://github.com/NewTurn2017/sso-kit/blob/main/SETUP.md).

## Flags

| Flag | Description | Default |
|---|---|---|
| `[project-name]` | Positional; the target directory and package name. Prompted once if omitted. | — |
| `--ref <tag>` | The `sso-kit` template tag to scaffold from. | `v0.1.2` |
| `--pm <pnpm\|npm\|yarn>` | Package manager named in the printed hint. | auto-detected |

## How it's designed

A **thin CLI** paired with a **thick runbook**:

- **This CLI** only scaffolds files from a pinned template tag — no logic about Convex, env, or domains.
- **The runbook** (`SETUP.md`, shipped inside `sso-kit`) carries the real setup procedure, written as agent instructions with explicit human-only gates. It mirrors the kit's README "Quick start", so the two never drift.

This keeps the CLI tiny and the setup knowledge in one place, next to the code it configures.

## Requirements

- **Node ≥ 18** to run the CLI (global `fetch`, `node:util` `parseArgs`).
- For the scaffolded project: [pnpm](https://pnpm.io) 10 and a free [Convex](https://convex.dev) account (the agent guides this).

## Development

```bash
pnpm install
pnpm test        # node:test suite via tsx (offline; uses a fixture tarball)
pnpm typecheck   # tsc --noEmit over src + test
pnpm build       # tsc → dist/ (published artifact)
```

Project layout:

```
src/
  args.ts        # CLI argument parsing (--ref, --pm, positional)
  validate.ts    # project-name validation + npm-safe slug
  customize.ts   # package.json name + SETUP.md {{PROJECT_NAME}} injection
  template.ts    # tag tarball URL + download/extract (strip top-level dir)
  scaffold.ts    # orchestrator (injectable IO for offline tests)
  prompt.ts      # one-shot readline prompt when the name is omitted
  cli.ts         # entry point + next-step guidance
test/            # one test file per module + a real-bin CLI test
```

## License

[MIT](LICENSE) © 2026 NewTurn2017
