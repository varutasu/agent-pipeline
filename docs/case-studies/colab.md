# Case study: colab — first deployment, validated outcome

> **TL;DR:** -50% tool calls, -53% conversation tokens, -28% total context vs. baseline on a representative seed task. Decision: GO on the curated layer; defer the MCP code-graph layer (didn't pull its weight on the tested workloads).

## Repo background

- **`colab`** — Trimble's internal UX collaboration app
- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma 5, NextAuth v5
- **Size:** ~340 files, 80+ API routes, 50+ Prisma models, 10+ feature areas
- **Pre-bootstrap state:** AGENTS.md existed but was 200+ lines and verbose; no `.cursor/rules/`; no schema map; agents grepped the codebase ~14 calls per typical task

## What got installed (L1 only — this was the validation run)

| Artifact | Lines | Purpose |
| --- | --- | --- |
| `AGENTS.md` (tightened) | 76 | Always-loaded intent + conventions |
| `.cursor/rules/no-go-zones.mdc` (always-apply) | 54 | Paths agents must not edit |
| `.cursor/rules/api-routes.mdc` (glob-scoped) | 66 | API route conventions |
| `.cursor/rules/prisma.mdc` (glob-scoped) | 64 | Prisma client + schema patterns |
| `.cursor/rules/prisma-schema-map.mdc` (glob-scoped) | 34 | High-level model groups |
| `.cursor/rules/prefer-code-graph.mdc` (always-apply, optional) | — | Nudges toward MCP graph queries |
| `docs/SCHEMA_MAP.md` (auto-generated) | 800+ | All Prisma models grouped by feature |
| `scripts/generate-schema-map.ts` | 390 | Generator for the schema map |
| `docs/agent-context/README.md` | 45 | System overview for the team |
| `docs/agent-context/validation-2026-05.md` | — | The measurement record (lives in this repo) |

## Measurement protocol

Seed task chosen for representativeness: fix `upsert` semantic issue in `app/api/posts/[id]/reactions/route.ts` (a real bug uncovered while reading the code).

Two runs in fresh Cursor chats, identical prompts, identical seed task:

1. **Baseline** — agent context disabled (no rules loaded), no schema map, no skill nudges. The agent navigates the codebase from scratch.
2. **Pipeline** — agent context fully enabled.

Metrics captured from the JSONL transcripts (each entry includes per-tool-call token counts):

- Tool calls (count + breakdown by tool)
- Conversation tokens (sum of agent input + output)
- Total context (incl. system prompts, attached files)
- Wall-clock to first diff

## Results

| Metric | Baseline | Pipeline | Δ |
| --- | --- | --- | --- |
| Tool calls | 14 | 7 | **-50%** |
| Conversation tokens | 37,500 | 17,600 | **-53%** |
| Total context | 78,800 | 56,900 | **-28%** |
| MCP tool calls | 0 | 0 | (no change) |
| Wall-clock to first diff | 2m 40s | 1m 10s | **-56%** |
| Caught the `upsert` issue? | No | Yes | qualitative win |
| Used `prisma.$transaction`? | No (used `upsert`) | Yes | qualitative win |

The pipeline run not only used fewer resources but also produced better code: the agent recognized that `upsert` was wrong for the use case and swapped to `prisma.$transaction([delete, create])` without prompting.

## What surprised us

1. **The MCP code-graph layer didn't fire.** We installed `code-review-graph` (a tree-sitter MCP server) expecting it to handle navigation queries. Across both runs, the agent made zero MCP tool calls. The curated context was enough; grep was efficient when it was needed. We shipped without the MCP layer in the wide rollout.

2. **Always-apply rules pay off more than expected.** `no-go-zones.mdc` (54 lines) prevented several "let me look at `prisma/migrations/` for inspiration" detours that would have cost real tokens.

3. **Schema map matters most for cross-feature work.** When the seed task was scoped to one feature folder, the curated rules did the heavy lifting. The schema map shone on cross-feature tasks like "where do I add a new field that propagates to the home feed query?" — agents stopped opening 12 files to find the join.

## Spot-check (a different task)

To confirm the savings weren't seed-specific, ran `Grep "requireAdmin" path=app/api output_mode=files_with_matches`:

| Metric | Result |
| --- | --- |
| Grep calls | 1 |
| MCP calls | 0 |
| Conversation tokens | 957 |
| Round trips | 1 |

Agent picked `files_with_matches` mode and scoped to `app/api` — near-optimal grep behavior, made possible by the rules' explicit guidance on when to use grep vs other tools.

## Decisions made from this data

- **GO** on the curated layer — deploy to the rest of the fleet (followed by `zest`, which is the next case study).
- **DEFER** the MCP code-graph layer — keep `code-review-graph` available per-machine for users who want it, but don't ship as part of the bootstrap.
- **Re-validate after meaningful additions** — the protocol is now in `docs/validation-protocol.md` and any team member can re-run on their repo.

## Replication

To run the same protocol on your repo: see [docs/validation-protocol.md](../validation-protocol.md). Acceptance bar: ≥50% reduction in conversation tokens. Anything less means the curated layer needs work (rules too long, gotchas missing, schema map miscategorized).
