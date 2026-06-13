# SSO Kit Setup Runbook (Component ①) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an agent-executable first-time-setup runbook (`SETUP.md` + a pointer in `AGENTS.md`/`CLAUDE.md`) to the `sso-kit` repo so any coding agent (Claude/Codex) can walk a human through configuring a fresh clone, then cut tag `v0.1.0`.

**Architecture:** The runbook lives in the template repo (`sso-kit`), not the CLI. `SETUP.md` is a structured 8-step agent runbook mirroring the README Quick start; `AGENTS.md`/`CLAUDE.md` get an appended `## First-time setup` pointer (existing Convex auto-block preserved). A dependency-free `scripts/verify-runbook.mjs` (matching the repo's existing `verify-*.mjs` convention) guards the runbook against drift (env-key rename in `convex/auth.ts`) and against clobbering the agent files. Acceptance is a cold-start subagent dry-run against a fresh clone.

**Tech Stack:** Markdown runbook; Node ≥18 ESM verifier (no deps, no test framework — same as `scripts/verify-versions.mjs`); pnpm monorepo; git tag.

**Working directory:** All implementation commands run in **`/Users/genie/dev/side/sso-kit`** (a DIFFERENT repo from where this plan file lives). The plan/spec live in `/Users/genie/dev/side/create-sso-kit`.

**Spec:** `/Users/genie/dev/side/create-sso-kit/docs/superpowers/specs/2026-06-13-create-sso-kit-design.md` (single source of truth; this plan implements its Component ① + build-order step 1).

**Scope note:** This is Plan 1 of 2. Component ② (the `create-sso-kit` npm CLI) is a SEPARATE plan written AFTER `v0.1.0` is tagged — the CLI fetches a pinned tag, so the tag must exist before the CLI can be built/tested. The `{{PROJECT_NAME}}` token authored here in `SETUP.md` is the injection contract the CLI (Plan 2) will fulfill.

**Protected (do not touch / do not overwrite):** `docs/*`, `scripts/browser-gates.mjs`, `.omx/artifacts/*`. `AGENTS.md`/`CLAUDE.md` — **append only**, never overwrite the `<!-- convex-ai-start -->…<!-- convex-ai-end -->` block. `sso-kit` is already a PUBLIC repo — no secrets in any commit (the dev deployment name `impartial-ostrich-518` is a public endpoint, not a secret).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `scripts/verify-runbook.mjs` | Create | Deterministic guard: SETUP.md structure + 8 steps + token + human-gate marker + Convex env-key drift check vs `convex/auth.ts` + AGENTS/CLAUDE preservation. The "test." |
| `package.json` | Modify (`scripts`) | Add `verify:runbook` npm script (follows existing `verify:versions`/`verify:forbidden`). |
| `SETUP.md` | Create (repo root) | The 8-step agent runbook. Mirrors README Quick start commands. Contains `{{PROJECT_NAME}}` token + `🚦 HUMAN-ONLY` gate markers. |
| `AGENTS.md` | Modify (append) | Append `## First-time setup` pointer below the Convex auto-block. |
| `CLAUDE.md` | Modify (append) | Append the identical `## First-time setup` pointer below the Convex auto-block. |
| `README.md` | Modify (1 line) | Cross-link `SETUP.md` from the `## Quick start` heading so human + agent docs share one truth. |

---

### Task 1: Runbook verifier (the failing test)

**Files:**
- Create: `scripts/verify-runbook.mjs`
- Modify: `package.json` (the `scripts` block)

- [ ] **Step 1: Write the verifier**

Create `/Users/genie/dev/side/sso-kit/scripts/verify-runbook.mjs`:

```js
// Guards Component ① (the agent setup runbook) against drift and clobbering.
// Run: node scripts/verify-runbook.mjs   (or `pnpm verify:runbook`)
// No deps — same style as scripts/verify-versions.mjs / verify-forbidden.mjs.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
let failed = false;
const fail = (msg) => { console.error(`✗ ${msg}`); failed = true; };
const ok = (msg) => console.log(`✓ ${msg}`);

// 1. SETUP.md must exist at repo root.
if (!existsSync(join(root, "SETUP.md"))) {
  console.error("✗ SETUP.md not found at repo root");
  console.error("\nRunbook verification FAILED.");
  process.exit(1);
}
const setup = read("SETUP.md");
ok("SETUP.md exists");

// 2. All 8 numbered steps present.
for (let n = 1; n <= 8; n++) {
  if (!new RegExp(`##\\s*Step ${n}\\b`).test(setup)) fail(`SETUP.md missing "## Step ${n}" heading`);
}

// 3. CLI injection contract: the project-name token must be present (Plan 2 replaces it).
if (!setup.includes("{{PROJECT_NAME}}")) fail("SETUP.md missing {{PROJECT_NAME}} token (CLI injection contract)");

// 4. The Convex-login step must be marked HUMAN-ONLY (agent must stop, not fabricate).
if (!setup.includes("HUMAN-ONLY")) fail("SETUP.md missing a HUMAN-ONLY gate marker");

// 5. Convex deployment env keys must be documented...
const convexEnvKeys = ["BETTER_AUTH_SECRET", "SITE_URL", "COOKIE_DOMAIN", "TRUSTED_ORIGINS"];
for (const k of convexEnvKeys) {
  if (!setup.includes(k)) fail(`SETUP.md missing Convex env key "${k}"`);
}
// ...and the 3 config keys must still be the ones convex/auth.ts actually reads (drift guard).
const authTs = read("packages/backend/convex/auth.ts");
for (const k of ["SITE_URL", "COOKIE_DOMAIN", "TRUSTED_ORIGINS"]) {
  if (!authTs.includes(k)) fail(`convex/auth.ts no longer reads "${k}" — SETUP.md Step 5 is stale`);
}

// 6. G3 smoke test must be referenced.
if (!setup.includes("poc-verification.md")) fail("SETUP.md should reference docs/poc-verification.md (G3 smoke test)");

// 7. AGENTS.md / CLAUDE.md: preserve the Convex auto-block AND carry the pointer.
for (const f of ["AGENTS.md", "CLAUDE.md"]) {
  const c = read(f);
  if (!c.includes("convex-ai-start")) fail(`${f} lost its <!-- convex-ai-start --> block (append, do not overwrite)`);
  if (!/##\s*First-time setup/.test(c)) fail(`${f} missing "## First-time setup" pointer section`);
  if (!c.includes("SETUP.md")) fail(`${f} pointer must reference SETUP.md`);
}

if (failed) {
  console.error("\nRunbook verification FAILED.");
  process.exit(1);
}
console.log("\n✓ Runbook verification passed.");
```

- [ ] **Step 2: Wire the npm script**

In `/Users/genie/dev/side/sso-kit/package.json`, add one line to the `"scripts"` object (after `"verify:forbidden"`):

```json
    "verify:forbidden": "node scripts/verify-forbidden.mjs",
    "verify:runbook": "node scripts/verify-runbook.mjs"
```

(Add the trailing comma to the `verify:forbidden` line as shown.)

- [ ] **Step 3: Run the verifier to confirm it FAILS**

Run:
```bash
cd /Users/genie/dev/side/sso-kit && pnpm verify:runbook
```
Expected: FAIL, exits non-zero with `✗ SETUP.md not found at repo root` and `Runbook verification FAILED.` (SETUP.md does not exist yet — this is the red state.)

---

### Task 2: Author `SETUP.md`

**Files:**
- Create: `SETUP.md` (repo root)

- [ ] **Step 1: Write the runbook**

Create `/Users/genie/dev/side/sso-kit/SETUP.md` with EXACTLY this content:

```markdown
# First-time setup — {{PROJECT_NAME}}

> **You are an AI coding agent (Claude Code / Codex / etc.).** This runbook walks
> a human through configuring this SSO Kit project for the first time. Do every
> step you can do yourself; **stop and ask the human** at the steps marked
> **🚦 HUMAN-ONLY** (the Convex login in Step 3, the dev-domain choice in Step 4).
> Narrate each step as you go. **Never fabricate a Convex deployment URL** — wait
> for the human to paste the real one.
>
> If `apps/*/.env.local` already exist, this project is probably already set up —
> confirm with the human before re-running anything.
>
> These commands mirror the README "Quick start"; keep the two in sync.

## Prerequisites

Node 18+, [pnpm](https://pnpm.io) 10 (this repo pins `pnpm@10.33.0`), and a free
[Convex](https://convex.dev) account.

## Step 1 — Greet & orient

Tell the human: "I'll set up **{{PROJECT_NAME}}** step by step. Two steps need you
(a browser login and a domain choice) — I'll pause and ask when I reach them.
Ready to start?"

## Step 2 — Install dependencies

Run:

\```bash
pnpm install
\```

Confirm it finishes without errors before continuing.

## Step 3 — 🚦 HUMAN-ONLY: connect a Convex deployment

You cannot do this — it opens a browser to log in. Ask the human to run:

\```bash
cd packages/backend
npx convex dev          # first run: log in + create/select a project
\```

Tell them: "Leave that running — it pushes the auth functions and watches for
changes. When it's up, paste me the deployment URL it printed (looks like
`https://YOUR-DEPLOYMENT.convex.cloud`)."

**Wait for the URL. Do not invent one.** You'll need the `YOUR-DEPLOYMENT`
subdomain (the part before `.convex.cloud`) again in Step 6.

## Step 4 — 🚦 HUMAN-ONLY decision: dev domain

Explain, then propose the default:

> Local dev uses **`lvh.me`** — a public DNS name that resolves to `127.0.0.1`, so
> `auth.lvh.me` / `chat.lvh.me` are real subdomains of a shared parent with no
> `/etc/hosts` editing. Do **not** use `*.localhost`: Chrome does not share cookies
> across `*.localhost` subdomains, so SSO silently bounces you back to login.

Ask: "Use the default **`lvh.me`** (recommended), or a custom shared parent
domain?" Record the answer as `<DOMAIN>` (default `lvh.me`) and derive:

- auth origin = `http://auth.<DOMAIN>:3000`
- chat origin = `http://chat.<DOMAIN>:3001`

## Step 5 — Set the Convex deployment env vars

Better Auth runs *inside* Convex, so these live on the deployment (not in a
`.env.local`). Run from `packages/backend/`, substituting `<DOMAIN>` from Step 4:

\```bash
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set SITE_URL          http://auth.<DOMAIN>:3000
npx convex env set COOKIE_DOMAIN     <DOMAIN>
npx convex env set TRUSTED_ORIGINS   http://auth.<DOMAIN>:3000,http://chat.<DOMAIN>:3001
\```

With the default, that makes `SITE_URL=http://auth.lvh.me:3000`,
`COOKIE_DOMAIN=lvh.me`, `TRUSTED_ORIGINS=http://auth.lvh.me:3000,http://chat.lvh.me:3001`.

## Step 6 — Write each app's `.env.local`

Copy the examples, then fill in the Convex URL from Step 3:

\```bash
cp apps/auth/.env.example apps/auth/.env.local
cp apps/chat/.env.example apps/chat/.env.local
\```

In **both** files, replace `YOUR-DEPLOYMENT` with the deployment subdomain from
Step 3, and make the origins match `<DOMAIN>` (the defaults already use `lvh.me`):

- `NEXT_PUBLIC_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud`
- `NEXT_PUBLIC_CONVEX_SITE_URL=https://YOUR-DEPLOYMENT.convex.site`
- auth/chat origins + `COOKIE_DOMAIN=<DOMAIN>`

## Step 7 — Run & verify (G3 smoke test)

Keep `npx convex dev` (Step 3) running. In two more terminals:

\```bash
pnpm dev:auth     # → http://auth.<DOMAIN>:3000   (login portal)
pnpm dev:chat     # → http://chat.<DOMAIN>:3001   (demo consumer)
\```

Verify the **G3 unauthenticated-redirect** gate (the smoke test recorded in
`docs/poc-verification.md`): with no session, open
`http://chat.<DOMAIN>:3001/protected` → it must redirect to
`http://auth.<DOMAIN>:3000/login?redirect=…`. Then sign up → you land back on the
protected page showing your email, and `auth.<DOMAIN>:3000/login` recognizes you
too (one session, both subdomains); Logout drops both apps immediately. Report the
result to the human.

## Step 8 — (Optional) publish

Offer: "Want this on GitHub? I can run the `make-public` skill (or `make-private`
for a private repo)." Only proceed if the human says yes.
```

> **Authoring note (delete after writing the file):** in the file you create, the
> code fences shown above as `\``` must be real triple-backtick fences ` ``` `. The
> backslash is only here to keep this plan's own outer fence intact.

- [ ] **Step 2: Run the verifier to see progress**

Run:
```bash
cd /Users/genie/dev/side/sso-kit && pnpm verify:runbook
```
Expected: still FAILS, but now ONLY on the AGENTS.md / CLAUDE.md pointer checks (e.g. `✗ AGENTS.md missing "## First-time setup" pointer section`). All SETUP.md checks (steps, token, HUMAN-ONLY, env keys, poc-verification.md) should pass. If any SETUP.md check still fails, fix `SETUP.md` before continuing.

---

### Task 3: Append the agent pointer + cross-link, go green, commit

**Files:**
- Modify: `AGENTS.md` (append below the Convex auto-block)
- Modify: `CLAUDE.md` (append below the Convex auto-block)
- Modify: `README.md` (one cross-link line under `## Quick start`)

- [ ] **Step 1: Append the pointer to `AGENTS.md`**

Append the following to the END of `/Users/genie/dev/side/sso-kit/AGENTS.md` (after the existing `<!-- convex-ai-end -->` line — do NOT modify or remove anything above it):

```markdown

## First-time setup

**If this project isn't configured yet** (no `apps/*/.env.local`), follow
[`SETUP.md`](SETUP.md) one step at a time. Execute each step yourself where you
can; ask the user only for inputs you cannot determine (the Convex login result,
the dev-domain choice). **Do not proceed past a step that needs the user until
they confirm**, and never fabricate a Convex deployment URL.
```

- [ ] **Step 2: Append the identical pointer to `CLAUDE.md`**

Append the EXACT SAME block (from Step 1) to the END of
`/Users/genie/dev/side/sso-kit/CLAUDE.md`, after its `<!-- convex-ai-end -->` line. Keep the two pointer sections identical so the two agent files don't drift.

- [ ] **Step 3: Cross-link `SETUP.md` from the README**

In `/Users/genie/dev/side/sso-kit/README.md`, find the `## Quick start` heading and insert this line immediately below it (before the `**Prerequisites:**` line):

```markdown
> 🤖 **Using an AI coding agent?** It can run this setup for you — point it at
> [`SETUP.md`](SETUP.md) (Claude/Codex read it automatically on first open).
```

- [ ] **Step 4: Run the verifier — expect PASS**

Run:
```bash
cd /Users/genie/dev/side/sso-kit && pnpm verify:runbook
```
Expected: PASS — ends with `✓ Runbook verification passed.` and exits 0.

- [ ] **Step 5: Confirm the Convex auto-block was preserved**

Run:
```bash
cd /Users/genie/dev/side/sso-kit && grep -c "convex-ai-start" AGENTS.md CLAUDE.md
```
Expected: each file reports `1` (the auto-block is intact; we only appended).

- [ ] **Step 6: Commit**

```bash
cd /Users/genie/dev/side/sso-kit
git add SETUP.md AGENTS.md CLAUDE.md README.md scripts/verify-runbook.mjs package.json
git commit -m "$(cat <<'EOF'
feat: add agent-guided first-time-setup runbook (SETUP.md)

8-step SETUP.md runbook (mirrors README Quick start), with HUMAN-ONLY gates
for the Convex login and dev-domain choice and a {{PROJECT_NAME}} token for
the create-sso-kit CLI to inject. Pointer section appended to AGENTS.md and
CLAUDE.md (Convex auto-block preserved). scripts/verify-runbook.mjs guards
structure + env-key drift vs convex/auth.ts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cold-start dry-run acceptance (subagent on a fresh clone)

This is the spec's primary runbook test (spec section 6): a fresh agent, given only the repo, must (a) run `pnpm install`, (b) **stop** at the Convex-login gate and ask rather than fabricate, (c) set the right env keys + `.env.local` shape once given a URL, (d) reach the G3 smoke test. We test that the runbook is unambiguous to a cold agent — NOT a real Convex login (that needs a browser).

**Files:** none modified (validation only).

- [ ] **Step 1: Make a fresh clone (no working-tree state, mimics `git clone`)**

```bash
rm -rf /tmp/sso-kit-dryrun && git clone /Users/genie/dev/side/sso-kit /tmp/sso-kit-dryrun
```
Expected: a clean clone at `/tmp/sso-kit-dryrun` containing `SETUP.md` and the updated `AGENTS.md`/`CLAUDE.md`.

- [ ] **Step 2: Dispatch a cold-start subagent**

Use the Agent tool (`subagent_type: "general-purpose"`) with this prompt (do not give it any of this plan's context — it must discover the runbook itself):

> You have just been opened as a coding agent in the project at
> `/tmp/sso-kit-dryrun`. The user says: "set this project up for me." Follow your
> normal first-time behavior for an unconfigured project. **Do not actually run
> any commands** — instead, output the exact ordered list of actions you would
> take, marking which ones you would do yourself vs. which require asking the
> human and what you would ask. Note specifically: what you do for the Convex
> deployment, and the exact env keys/values you would set.

- [ ] **Step 3: Grade the subagent's response against the 4 acceptance criteria**

Confirm the subagent's plan shows ALL of:
- (a) discovers the runbook via `AGENTS.md`/`CLAUDE.md` → `SETUP.md`, and runs `pnpm install` itself;
- (b) **stops** at the Convex login: asks the human to run `npx convex dev` and to paste the URL — does NOT invent a `*.convex.cloud` URL;
- (c) sets exactly `BETTER_AUTH_SECRET`, `SITE_URL`, `COOKIE_DOMAIN`, `TRUSTED_ORIGINS` via `convex env set`, and writes `apps/auth/.env.local` + `apps/chat/.env.local` from the `.env.example`s with `YOUR-DEPLOYMENT` replaced;
- (d) reaches the G3 redirect smoke test (`chat…/protected` → `auth…/login?redirect=…`).

If any criterion fails, the runbook wording is ambiguous → tighten `SETUP.md` (and/or the pointer), re-run `pnpm verify:runbook`, amend the Task 3 commit, and repeat Step 2. Record the final dry-run verdict in the commit or a follow-up note.

- [ ] **Step 4: Clean up**

```bash
rm -rf /tmp/sso-kit-dryrun
```

---

### Task 5: Cut tag `v0.1.0`

Closes build-order step 1. The `create-sso-kit` CLI (Plan 2) will pin this tag as its default `--ref`.

**Files:** none modified (release only).

- [ ] **Step 1: LICENSE pre-check (user decision gate)**

`sso-kit` is PUBLIC. A `v0.1.0` release without a `LICENSE` leaves usage rights undefined. This is handoff thread **P1** (add MIT LICENSE). Before tagging, confirm with the user: tag `v0.1.0` now and add LICENSE separately, or add the LICENSE first so it ships in `v0.1.0`. Do not decide unilaterally — ask, then proceed per their answer.

- [ ] **Step 2: Verify clean tree + green runbook on `main`**

```bash
cd /Users/genie/dev/side/sso-kit && git status --short && pnpm verify:runbook
```
Expected: no uncommitted changes (or only the agreed LICENSE), and `✓ Runbook verification passed.`

- [ ] **Step 3: Create the annotated tag**

```bash
cd /Users/genie/dev/side/sso-kit
git tag -a v0.1.0 -m "v0.1.0 — first tagged release: SSO Kit + agent setup runbook"
git tag --list v0.1.0
```
Expected: `v0.1.0` listed.

- [ ] **Step 4: Push branch + tag (confirm with user — this publishes to a PUBLIC repo)**

Pushing is outward-facing; confirm the user wants it pushed now, then:
```bash
cd /Users/genie/dev/side/sso-kit && git push origin main && git push origin v0.1.0
```
Expected: `main` and the `v0.1.0` tag appear on `github.com/NewTurn2017/sso-kit`. (The CLI in Plan 2 fetches the tarball at `…/archive/refs/tags/v0.1.0.tar.gz`, so the tag must be on the remote before Plan 2 is testable.)

---

## Self-Review

**1. Spec coverage (Component ① + build-order step 1):**
- Spec 3.① `SETUP.md` at repo root → Task 2. ✓
- Spec 3.① pointer block in `AGENTS.md`/`CLAUDE.md`, append-not-clobber → Task 3 Steps 1–2 + verifier check 7 + Task 3 Step 5. ✓
- Spec 4 — all 8 runbook steps (greet, install, Convex-login human gate, dev-domain, Convex env, app env, run+verify G3, optional publish) → Task 2 SETUP.md, verifier check 2. ✓
- Spec 4 — runbook shares truth with README Quick start, cross-link → Task 3 Step 3. ✓
- Spec 5 — `sso-kit` cuts tag `v0.1.0` → Task 5. ✓
- Spec 6 — runbook test = subagent dry-run on a fresh clone, asserting (a)–(d) → Task 4. ✓
- Spec 7 — `AGENTS.md`/`CLAUDE.md` merge must not clobber → verifier check 7 + grep guard; firm human-only-gate wording → SETUP.md Step 3 `🚦 HUMAN-ONLY` + "Never fabricate" + pointer wording. ✓
- CLI injection contract (`{{PROJECT_NAME}}` token, spec 3.②.3) authored here → SETUP.md + verifier check 3. ✓ (replacement logic deferred to Plan 2 — correct).
- Out of scope here (correctly deferred to Plan 2): CLI scaffolding, npm name check, tarball fetch. ✓

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". The verifier code, full `SETUP.md` body, pointer block, README line, and every command are written out literally. The one intentional template token `{{PROJECT_NAME}}` is a documented contract, asserted by the verifier — not a plan placeholder. ✓

**3. Type/name consistency:**
- Convex env keys identical across SETUP.md Step 5, verifier `convexEnvKeys`, and Task 4 grading: `BETTER_AUTH_SECRET`, `SITE_URL`, `COOKIE_DOMAIN`, `TRUSTED_ORIGINS`. ✓ (matches `convex/auth.ts` + README, verified during planning.)
- npm script name `verify:runbook` consistent: package.json (Task 1.2), and run commands (Tasks 1.3, 2.2, 3.4, 5.2). ✓
- Step heading format `## Step N` consistent between SETUP.md and verifier regex `##\s*Step ${n}\b`. ✓
- Pointer anchor `## First-time setup` consistent between AGENTS.md/CLAUDE.md text and verifier regex. ✓
- Marker `🚦 HUMAN-ONLY` in SETUP.md ⇒ verifier checks substring `HUMAN-ONLY`. ✓
- App env files `apps/auth/.env.local` / `apps/chat/.env.local` from `.env.example` — match repo layout confirmed during planning. ✓
