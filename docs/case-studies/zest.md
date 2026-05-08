# Case study: zest — first external deployment

> **TL;DR:** Greenfield install of all 3 layers (L1 + L2 + L3) on a built-out Next.js + Prisma 7 self-hosted app. 24 artifacts written across context, roles, and pipeline scaffolding. No file collisions, no overwrites needed. Schema map generated cleanly first try (19 models, 10 groups). Surfaced 4 stack-specific quirks that would have tripped a paste-and-pray install.

## Repo background

- **`zest`** — self-hosted, AI-first personal finance app
- **Stack:** Next.js 16, React 19, Prisma 7 with `@prisma/adapter-pg` (NOT the default engine), NextAuth v5 + TOTP 2FA, Tailwind 4, Postgres 16, Ollama-first AI layer
- **Pre-bootstrap state:** zero agent context — no `AGENTS.md`, no `.cursor/`, no `.github/workflows/`, no `.convoys/`. Built-out app, ~30 lib files, 23 API route groups
- **Ideal first test:** clean greenfield install, real codebase, no collisions

## What got installed

| Layer | Files | Lines |
| --- | --- | --- |
| L1 — Context | `AGENTS.md`, 4 `.cursor/rules/`, 1 `.cursor/skills/`, schema map + generator, agent-context README | 763 |
| L2 — Subagent roles | 9 `.cursor/agents/role-*.md` (verbatim copies — they're repo-agnostic) | 700 |
| L3 — Pipeline | `ci.yml`, `CODEOWNERS`, `PULL_REQUEST_TEMPLATE.md`, `.convoys/README.md`, `lib/flags/index.ts`, `scripts/wt.sh` | ~400 |
| Schema map | `docs/SCHEMA_MAP.md` (auto-generated — 19 models, 10 groups, 14 enums) | 239 |

Intentionally skipped per user input: `preview-smoke.yml`, `visual-diff.yml`, `pr-health-rollup.yml` (no preview URLs in homelab Docker Compose deploys); `playwright-smoke.spec.ts` (no Playwright); `test:` job in CI (no test runner adopted yet).

## What the bootstrap got right

The skill **tailored** rather than pasted — every L1 file references zest's actual conventions, not the source repo's:

| Convention | colab (source) | zest (target) |
| --- | --- | --- |
| Auth import | `@/auth` | `@/lib/auth` |
| Prisma client | `@/lib/prisma` | `@/lib/db` (note: `db.ts`, not `prisma.ts`) |
| Auth helper | `requireAuth` | `getRequestUserId(request)` returning `string \| null` |
| Validation | Zod | Manual type checks (no validator yet) |
| Prisma version | 5 (default engine) | 7 (driver adapter `@prisma/adapter-pg`) |
| Test runner | Vitest | None (rule honestly documents the gap) |
| `@@map` directives | Yes | No (zest matches model name to table name) |

The `api-routes.mdc` rule documents BOTH the helper-first pattern AND the legacy inline `await auth()` pattern that still exists in older routes — agent can keep convoy work consistent within a folder instead of forcing globally-uniform style.

## What the bootstrap surfaced (stack-specific quirks)

1. **Driver adapter, not engine.** Prisma 7 with `@prisma/adapter-pg` has subtly different behavior than the default Prisma binary engine. The bootstrap noted this in `AGENTS.md` §4 "Common gotchas" so future agents don't try to add binary engine targets.

2. **Custom Prisma client output path.** zest's `schema.prisma` writes the client to `node_modules/.prisma/client` (custom). The no-go-zones rule explicitly lists this so agents don't accidentally try to "regenerate" or hand-edit it.

3. **AES-256-GCM encrypted AI keys.** `AiCredential.apiKeyEnc` schema doc comment surfaced a security-critical convention. The bootstrap pulled this into `AGENTS.md` so any future API route touching AI credentials knows to never log the plaintext.

4. **No middleware.ts.** Every API route handles auth itself. AGENTS.md flagged this — without it, an agent might assume middleware-level guards exist and ship an unprotected route.

## Friction we hit (and rolled into the SKILL)

After the zest run, four friction points fed back into `bootstrap-agent-context/SKILL.md` v0.1.1:

1. **Glob-scoped rules forced under 80 lines** got too tight when a repo has multiple coexisting patterns. Bumped to 120 lines for glob-scoped (always-apply stays at 80).
2. **No automatic test-job comment-out** when no test runner exists. Now Step 0 detects `test_runner: yes/no` and Step 4b-conditional 1 handles it.
3. **No automatic `branches:` filter pruning** when only `main` exists. Now Step 4b-conditional 2.
4. **`{{OWNER}}` placeholder** in CODEOWNERS was forgettable. Switched to `@YOUR-GITHUB-HANDLE` — reads as a real (broken) handle, easier to grep.

## Time + token budget

- **Wall-clock:** ~25 minutes total agent time (much of it parallel reads).
- **Files written:** 24 artifacts.
- **Files read:** ~12 (package.json, README, schema, 1 representative API route, 4 lib files, 4 templates).
- **Schema map:** generated cleanly on first run, no manual edits to `MODEL_GROUPS` after the initial classification.

## Outcome

zest now has the same shape as `colab` — switching between the two repos costs near-zero context. The Conductor → Implementer pipeline is available without any per-repo configuration. Convoys can be opened and the team will know exactly where to find the brief, the PR template fields, and the CI gates.

The next deployment (TBD — likely `echo-board` or `tales-n-tails`) will exercise the four SKILL improvements in sequence.

## Replication notes

If your repo is a Next.js + Prisma stack, install proceeds identically — just answer the layer-selection prompts. If your repo has an existing `AGENTS.md`, the SKILL will offer to write `AGENTS.md.proposed` instead of overwriting (the diff/tighten flow wasn't exercised by zest because zest had no prior context).
