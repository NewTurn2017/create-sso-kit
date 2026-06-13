# Design: `create-sso-kit` — agent-guided scaffolder for the SSO Kit

- **Date**: 2026-06-13
- **Status**: Approved (design); pending spec review → implementation plan
- **Author**: genie + Claude
- **Related**: `NewTurn2017/sso-kit` (the template repo, published), `make-public` skill

## 1. Context & goal

`sso-kit` is a pnpm monorepo (Next.js 15 + Convex + Better Auth) for subdomain
SSO. Getting a fresh clone running requires several **human-only or
decision-heavy** steps: `pnpm install`, an interactive `npx convex dev` login
(browser), four `convex env set` values, per-app `.env.local`, a dev-domain
choice, and a run/verify pass.

**Goal:** a `create-next-app`-style command that scaffolds the kit into a new
project, after which the user's *existing* coding agent (Claude Code / Codex /
etc.) **asks the human questions and walks them through the remaining setup
sequentially**. No embedded LLM — the agent that guides is the one the user
already runs.

## 2. Decisions (locked during brainstorming)

| # | Decision | Rationale |
|---|---|---|
| 1 | **Agent = the user's existing Claude/Codex, reading a runbook** (not an LLM embedded in the CLI) | No API key/cost, reuses the user's flow, avoids reimplementing an agent loop |
| 2 | **Runbook = portable `SETUP.md` + a pointer in `AGENTS.md`/`CLAUDE.md`** | Works for any agent (Claude/Codex/…) and is human-readable; simplest, most portable |
| 3 | **Distribution = npm `create-sso-kit`**, template fetched from the published GitHub repo at a **pinned tag** | Matches the `pnpm create next-app` UX; single source of truth (the repo) |
| 4 | **Thin CLI / fat runbook** — CLI only scaffolds + customizes + ensures the runbook; everything interactive is in `SETUP.md` | Maximizes the agent-guided value; keeps the CLI tiny |
| 5 | **CLI lives in a separate repo** `create-sso-kit` (publisher), distinct from `sso-kit` (template) | Clean separation; avoids the "CLI excludes itself from its own template" problem |

Out of scope (YAGNI): embedded LLM/API key; a thick interactive wizard;
automating the Convex browser login; multi-database (single Convex stays);
large-scale package-scope renaming.

## 3. Architecture — two components, built in order

### Component ① — The runbook (added to the `sso-kit` repo)

Lives in the template repo so it ships with every scaffold and is the single
source of the guided procedure. **Independently useful**: even with a plain
`git clone` (no CLI), opening Claude/Codex in the repo triggers the guide.

- **`SETUP.md`** (repo root) — the step-by-step agent runbook (see §4).
- **Pointer block** added to the existing `AGENTS.md` and `CLAUDE.md` (do not
  clobber existing content — add a `## First-time setup` section):

  > **First-time setup.** If this project isn't configured yet (no
  > `apps/*/.env.local`), follow `SETUP.md` one step at a time. Execute each
  > step yourself where you can; ask the user only for inputs you cannot
  > determine (the Convex login result, the dev domain). Do not proceed past a
  > step that needs the user until they confirm.

### Component ② — The `create-sso-kit` CLI (new separate repo)

- **Invocation**: `pnpm create sso-kit my-app` / `npm create sso-kit@latest my-app`
  / `npx create-sso-kit my-app`.
- **Tech**: Node ≥ 18, TypeScript, **minimal deps**. Single `bin`. Template
  fetch via the GitHub tag tarball
  (`https://github.com/NewTurn2017/sso-kit/archive/refs/tags/<tag>.tar.gz`)
  extracted with a small tar utility (or `tiged`); no interactive prompt library
  unless the project name is omitted.
- **What it does** (deterministic file ops only):
  1. Resolve target dir from the project-name arg (prompt once if omitted; error
     if the dir exists and is non-empty).
  2. Download the `sso-kit` template at the CLI's pinned default tag (overridable
     with `--ref <tag>`), extract into the target dir.
  3. Light customization:
     - root `package.json` `name` → project name;
     - inject the project name into `SETUP.md` (placeholder token);
     - leave `@sso-kit/*` workspace names as-is (renaming risks breakage).
  4. Remove the fetched `.git`, run `git init -b main`, make an initial commit.
  5. Print next-step guidance:
     > ✅ Created `my-app`. Next: `cd my-app && claude` (or `codex`) — your agent
     > will walk you through setup via `SETUP.md`.
- **What it does NOT do**: install deps, Convex login, env vars, `.env.local`,
  domain choice, running, verifying — all delegated to the runbook/agent.
- **Flags (minimal)**: `[project-name]` positional; `--ref <tag>` (template
  version); `--pm <pnpm|npm|yarn>` only if needed for the printed hint.

## 4. The `SETUP.md` runbook flow (what the agent performs)

Written as agent instructions. Each step says what the agent does vs what it must
ask the human. The agent narrates progress and stops at human-only gates.

1. **Greet & orient** — "I'll guide you through setup step by step."
2. **Install** — agent runs `pnpm install` (or detected PM).
3. **Convex login (human-only gate)** — instruct: "Run
   `cd packages/backend && npx convex dev` yourself (it opens a browser to log
   in / create a project). Tell me the deployment name/URL when it's up." Agent
   waits; does not fabricate.
4. **Dev domain** — propose default `lvh.me` (explain the `*.localhost` pitfall);
   confirm with the user, or take a custom domain.
5. **Convex deployment env** — agent runs `convex env set` for
   `BETTER_AUTH_SECRET` (generated via `openssl rand -base64 32`), `SITE_URL`,
   `COOKIE_DOMAIN`, `TRUSTED_ORIGINS` (derived from the chosen domain + apps).
6. **App env** — agent writes `apps/*/.env.local` from `.env.example`, filling in
   the Convex URL from step 3.
7. **Run & verify** — start the dev servers (or tell the user how), then confirm
   the G3 unauthenticated redirect works (the smoke test from
   `docs/poc-verification.md`).
8. **(Optional) publish** — offer to publish via the `make-public` /
   `make-private` skills.

The runbook shares its truth with the README Quick Start (same commands), so the
two never drift — implementation should cross-link them.

## 5. Distribution & versioning

- `sso-kit` cuts **git tags / releases** (e.g. `v0.1.0`); the CLI's pinned
  default `--ref` tracks a known-good tag.
- `create-sso-kit` is published to npm; the `create-` prefix enables
  `pnpm/npm/yarn create sso-kit`.
- Name availability for `create-sso-kit` on npm must be verified before publish
  (risk — see §7).
- Dogfooding: the `create-sso-kit` repo itself can be published with the
  `make-public` skill.

## 6. Testing

- **Runbook**: dry-run with a subagent on a fresh clone — verify the agent (a)
  runs `pnpm install`, (b) **stops** at the Convex-login gate and asks the human
  rather than fabricating, (c) sets the right env keys and `.env.local` shape
  once given a deployment URL, (d) reaches the G3 smoke test. Full end-to-end
  needs a real Convex login, so assert behavior up to and around the human gates.
- **CLI**: run the local `bin` against a temp dir — assert the scaffold has the
  expected files, root `name` customized, `SETUP.md` has the project name, a
  fresh `.git` with one commit, and that no install/`.env.local` happened. No npm
  publish needed to test.

## 7. Risks & open questions

- **npm name** `create-sso-kit` may be taken → fallback name needed.
- **Template fetch** needs network + a tagged release of `sso-kit`; the first tag
  must be cut before the CLI is usable.
- **`AGENTS.md`/`CLAUDE.md` merge** must not clobber existing project
  instructions — append a section, don't overwrite.
- **Agent compliance**: different agents may interpret the runbook differently;
  the pointer wording must be firm about the human-only gate (Convex login).

## 8. Build order

1. **Component ① (runbook in `sso-kit`)** — `SETUP.md` + `AGENTS.md`/`CLAUDE.md`
   pointer. Independently testable via manual clone. Tag `sso-kit`.
2. **Component ② (`create-sso-kit` CLI repo)** — scaffolder against the tag.
3. Publish CLI to npm; optionally publish the CLI repo via `make-public`.
