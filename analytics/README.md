# Analytics

Two complementary signals, both **fully local**, no service to run:

| Layer | Source | Run | What you learn |
| --- | --- | --- | --- |
| **Convoy events** (forward-looking) | `<each-repo>/.convoys/.metrics.jsonl` | `npx tsx analyze-convoys.ts <repo-paths...>` | Role usage frequency, classification distribution, skip patterns, time per role, convoy duration |
| **Cursor transcripts** (retroactive) | `~/.cursor/projects/*/agent-transcripts/*.jsonl` | `npx tsx extract-transcripts.ts` | Tokens per chat, tool call breakdown, MCP usage, model used, wall-clock duration |

Both feed the same dashboard:

```bash
npx tsx render-dashboard.ts
open ~/agent-pipeline-data/dashboard.html
```

## What gets collected

### Convoy events

Each L2 role appends one line to `<repo>/.convoys/.metrics.jsonl` when invoked. Schema in [`schemas/convoy-event.json`](schemas/convoy-event.json):

```jsonc
{
  "ts": "2026-05-08T17:30:12Z",
  "role": "role-architect",
  "convoy": "bookmark-count-badge",
  "brief": null,                    // present only for implementer/reviewer
  "classification": "feature",
  "skip_flags": ["smoke", "visual"],
  "duration_s": 142,
  "stack_class": "nextjs-prisma",   // set by conductor only
  "repo": "zest",                    // git repo name; resolved from `git rev-parse --show-toplevel`
  "model": "composer-2.5-fast",
  "model_tier": "fast"
}
```

Privacy: events contain **no code**, **no prompts**, **no secrets** — just the metadata about which role ran. Default `.gitignore` keeps `.convoys/.metrics.jsonl` local. Opt-in to commit per-repo if your team wants shared metrics.

### Cursor transcripts

Cursor auto-captures every chat as JSONL at `~/.cursor/projects/<workspace-id>/agent-transcripts/<chat-id>/<chat-id>.jsonl`. The miner extracts:

```jsonc
{
  "chat_id": "...",
  "workspace": "zest",
  "started_at": "...",
  "ended_at": "...",
  "model": "claude-opus-4.7",
  "input_tokens_total": 17600,
  "output_tokens_total": 4200,
  "tool_calls_by_name": { "Read": 4, "Grep": 2, "Edit": 3 },
  "mcp_calls": 0,
  "user_prompts": 1
}
```

Privacy: the miner does NOT extract prompt or response text — only counts and tool names. Output goes to `~/agent-pipeline-data/transcripts.jsonl`, never committed.

## Setup (one-time)

The scripts use `tsx` (zero-config TS runner) which is already on most repos with TypeScript. If not:

```bash
cd ~/code/agent-pipeline
npm install -g tsx     # or use npx tsx instead
```

## Daily / weekly use

```bash
cd ~/code/agent-pipeline/analytics

# Mine all transcripts (incremental — skips already-processed chats)
npx tsx extract-transcripts.ts

# Aggregate convoy events from your repos
npx tsx analyze-convoys.ts \
  ~/Documents/Personal\ Coding\ Projects/zest \
  ~/Documents/Personal\ Coding\ Projects/echo-board \
  ~/Documents/Trimble\ Coding\ Projects/colab

# Render the dashboard
npx tsx render-dashboard.ts
open ~/agent-pipeline-data/dashboard.html
```

For team rollups: each member runs the scripts locally; commit the resulting JSON to a shared repo if you want cross-team comparison. Or share dashboard.html screenshots in standup.

## Self-optimization signals

The dashboard surfaces these heuristics:

| Signal | What it means | Action |
| --- | --- | --- |
| **Role X skip rate >70%** | The role isn't useful or is misclassified | Review whether the role is needed; or fix the Conductor's classification heuristics |
| **Role X duration trending up** | The role is bloating | Tighten the role spec; trim verbose sections |
| **Total tokens per convoy trending up** | Curated layer drifted | Re-validate against `validation-protocol.md`; check rule sizes |
| **Premium `model_tier` on fast-tier roles** | Opus used for audits/implementers | Invoke roles from Agents UI; follow `model-routing.mdc` |
| **MCP calls = 0 across all transcripts** | MCP layer not pulling weight | Disable the MCP nudge rule; reclaim the always-apply budget |
| **Tool call mix dominated by Grep** | Curated rules don't cover the work patterns | Add a glob-scoped rule for the relevant area |
| **Convoy classification skewed to `hotfix`** | Pipeline overhead too high for normal work | Investigate friction; lower the activation energy for `feature` runs |

## Files in this folder

| File | Purpose |
| --- | --- |
| `extract-transcripts.ts` | Mines `~/.cursor/projects/*/agent-transcripts/` |
| `analyze-convoys.ts` | Aggregates `<repo>/.convoys/.metrics.jsonl` across repos |
| `render-dashboard.ts` | Produces a static HTML report from the two data sources |
| `schemas/convoy-event.json` | JSON schema for one convoy-event row |
| `schemas/transcript-summary.json` | JSON schema for one extracted transcript summary |
| `dashboard-template.html` | Template the renderer fills in |
