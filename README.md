# agent-pipeline

A 3-layer system for AI-collaborative coding in [Cursor](https://cursor.com). One bootstrap command turns any repo into a structured idea-to-feature pipeline with subagent roles, CI gates, and self-analytics.

> **Validated outcome:** -53% conversation tokens vs. baseline on the first repo it shipped to (see [case-studies/colab.md](docs/case-studies/colab.md)).

## What you get

| Layer | What it ships | Where it lives |
| --- | --- | --- |
| **L1 — Context** | `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursor/skills/*/SKILL.md`, optional Prisma schema map | Per-repo |
| **L2 — Roles** | 9 subagent role configs (Conductor → IA → UX → Architect → Implementer → Reviewer → Design/A11y auditors → Doc Writer) | Per-repo `.cursor/agents/` |
| **L3 — Pipeline** | CI workflows, PR template, CODEOWNERS, `.convoys/` folder, feature-flag wrapper, worktree helper | Per-repo `.github/`, `.convoys/`, `lib/flags/` |
| **Analytics** | Convoy event log + Cursor transcript miner + static HTML dashboard | Per-machine `~/agent-pipeline-data/` |

The bootstrap stops before committing — every artifact is a draft for human review.

## 30-second install

```bash
git clone https://github.com/varutasu/agent-pipeline.git ~/code/agent-pipeline
cd ~/code/agent-pipeline
./install.sh
```

That symlinks the skill into `~/.cursor/skills/bootstrap-agent-context/` and the global nudge rule into `~/.cursor/rules/agent-context-bootstrap.mdc`. Restart Cursor so it picks them up.

## 30-second use

In Cursor, open any repo and ask:

> *"Bootstrap agent context for this repo."*

The skill detects your stack (Next.js+Prisma / Next.js / Node generic), asks which layers to install, drafts every artifact, and stops for review. Typical run: 5–10 minutes wall-clock, ~24 files written, no commits made.

For ongoing work, use the L2 roles:

> *"Run role-conductor: start a new convoy for [one-paragraph idea]. Success = [metric]."*

The Conductor classifies the work, sets skip flags, and hands off to subsequent roles. See [docs/role-reference.md](docs/role-reference.md) for the full pipeline.

## What's in this repo

```
agent-pipeline/
├── skills/                  # The bootstrap-agent-context skill (the core)
├── rules/                   # The global nudge rule
├── docs/                    # Spec, validation protocol, role reference, case studies
├── analytics/               # Self-analytics: transcript miner + convoy aggregator + dashboard
├── tests/                   # Smoke tests against fixture repos
├── install.sh / update.sh / uninstall.sh
├── INSTALL.md               # Detailed install + update + uninstall
├── CONTRIBUTING.md          # Fork-and-PR workflow
└── CHANGELOG.md
```

## Why use it

- **Token savings**. Validated -53% conversation tokens vs. baseline. See [docs/case-studies/colab.md](docs/case-studies/colab.md).
- **Same shape across repos**. Switching between projects costs near-zero context — the conventions are documented in the same place every time.
- **Subagent roles, not god agents**. Each role does one job. Hand-off is by message; humans gate the meaningful decisions.
- **Self-optimizing**. The analytics layer mines your Cursor transcripts to show which roles get used, which get skipped, and where the token spend goes.

## Background

Built to solve "I have 13 repos and switching between them costs 30 minutes of agent grep." Methodology overview in [docs/orchestration-spec.md](docs/orchestration-spec.md).

The L1 layer was validated against [`colab`](https://github.com/rstillwell-trimb/colab) (private). The L2 + L3 layers are derived from a synthesis of that work plus design decisions documented in the orchestration spec.

## Contributing

Fork, branch, PR. See [CONTRIBUTING.md](CONTRIBUTING.md). The smoke test (`tests/smoke.sh`) runs the bootstrap against fixture repos and checks for required artifacts — keep it green.

## License

MIT. See [LICENSE](LICENSE).
