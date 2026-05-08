# Validation protocol

How to measure whether the bootstrap actually saved tokens on YOUR repo. Acceptance bar: **≥50% reduction in conversation tokens** vs. baseline. Anything less means the L1 layer needs work — rules too long, gotchas missing, or schema map miscategorized.

## Why measure

The whole point of L1 is token reduction. The L2/L3 layers don't move the needle on tokens directly — they make the work-stream consistent. So token measurement validates L1 and only L1.

If a re-validation shows token regression after meaningful additions (new rules, schema growth, bigger curated docs), tighten before deploying further.

## Protocol

Pick a **representative seed task**: a real bug or feature small enough to fit in one chat (≤30 minutes), but realistic enough to require navigation and editing (not a one-line typo fix). Examples:

- Fix a missing index on a high-traffic Prisma query
- Add `_count.bookmarks` to a feed query
- Convert a route from `upsert` to `prisma.$transaction`
- Add a new field to an existing model and propagate to one consumer

Two runs in **fresh Cursor chats** with **identical prompts**:

| Run | Setup | Capture |
| --- | --- | --- |
| **Baseline** | Disable agent context: rename `AGENTS.md` → `AGENTS.md.disabled`, rename `.cursor/rules/` → `.cursor/rules.disabled/`. (Restart Cursor.) | Save the chat transcript JSONL |
| **Pipeline** | Restore the renames. (Restart Cursor.) Run the IDENTICAL prompt | Save the chat transcript JSONL |

Both transcripts auto-capture to `~/.cursor/projects/<workspace-id>/agent-transcripts/<chat-id>.jsonl`. Cursor surfaces the chat ID in the UI.

## Metrics to record

Run `analytics/extract-transcripts.ts` against both transcripts (instructions in `analytics/README.md`). Or extract by hand:

| Metric | How |
| --- | --- |
| **Tool calls** | `jq 'select(.type == "tool_use")' transcript.jsonl \| wc -l` |
| **Tool call breakdown** | `jq -r 'select(.type == "tool_use") \| .name' transcript.jsonl \| sort \| uniq -c` |
| **Conversation tokens** | Sum of `usage.input_tokens + usage.output_tokens` across all `assistant` events |
| **Total context** | Add system prompt + attached files (Cursor surfaces this in the UI) |
| **MCP calls** | Count of tool calls with names not in {Read, Grep, Glob, Edit, Write, Shell, ReadLints, etc.} |
| **Wall-clock** | Timestamp of first edit minus prompt timestamp |

## Comparison table

Document in `docs/agent-context/validation-YYYY-MM.md` (committed to the validated repo, not this repo):

```markdown
| Metric | Baseline | Pipeline | Δ |
| --- | --- | --- | --- |
| Tool calls | X | Y | -Z% |
| Conversation tokens | X | Y | -Z% |
| Total context | X | Y | -Z% |
| MCP calls | X | Y | (note) |
| Wall-clock to first diff | X | Y | -Z% |
```

Plus qualitative notes: did the pipeline run produce better code? Did it catch issues the baseline missed?

## Acceptance bar

| Outcome | Decision |
| --- | --- |
| Pipeline ≥50% reduction in conversation tokens | **GO** — deploy to next repo in the rollout |
| Pipeline 25–49% reduction | **HOLD** — tighten the rules, drop low-value lines, re-measure |
| Pipeline <25% reduction or regression | **STOP** — something is wrong with the curated layer; investigate before deploying further |

## Replication signal vs noise

LLMs are non-deterministic. A single comparison can be misleading. Two cheap noise-reduction tactics:

1. **Use the same model + same temperature for both runs.** Don't compare GPT-5 baseline to Claude pipeline.
2. **Run 2–3 baseline + 2–3 pipeline pairs.** Take the median, not the mean (resistant to outliers).

If your reduction sits in the 40–55% band, run a third pair before declaring GO/HOLD.

## What NOT to measure

- **Token cost in dollars.** Pricing changes; metrics shouldn't. Stick to token counts.
- **Subjective "the agent felt smarter."** Use the qualitative notes column instead — concrete observations only.
- **Time saved.** Wall-clock is one signal but conflated with model latency / network. Token reduction is purer.

## When to re-validate

| Trigger | Re-run? |
| --- | --- |
| Added a new `.cursor/rules/*.mdc` file | Yes if the file is always-apply or globs are broad |
| Schema doubled in size (new feature area) | Yes — schema map cost grew |
| Switched Cursor model family (GPT → Claude or v.v.) | Optional — different baseline |
| Refactored or renamed major directories | Yes — the rules' folder references may have drifted |
| 6 months passed | Optional sanity check |

Save the new validation-YYYY-MM.md alongside the prior one — comparing month-over-month tells you if the curated layer is staying tight.
