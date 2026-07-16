# PR review & security

How **agent review**, **automated gates**, and **human merge** fit together in the agent-pipeline.

## Three layers

| Layer | What | Who |
| --- | --- | --- |
| **L2 audit fan-out** | Structured PR comments before human review | `role-reviewer`, `role-security-auditor`, `role-design-system-auditor`, `role-a11y-auditor` |
| **L3 CI** | Lint, tests, optional `forbidden-patterns`, `npm-audit-gate` | GitHub Actions / Cloud Build |
| **Human Gate 2** | Merge authority | You + `CODEOWNERS` + branch protection |

Agents **propose**; humans **merge**. No agent opens or merges PRs.

## Audit fan-out (after implementer)

```
/multitask role-reviewer + role-security-auditor + role-design-system-auditor + role-a11y-auditor
```

| Role | Focus |
| --- | --- |
| `role-reviewer` | Scope vs brief, conventions, tests, regression |
| `role-security-auditor` | Auth, IDOR, injection, secrets, dependencies |
| `role-design-system-auditor` | Tokens, primitives, inline styles |
| `role-a11y-auditor` | WCAG 2.2 |

Each posts a comment with a fixed header (`## Reviewer Report`, `## Security Audit`, etc.). `pr-health-rollup.yml` aggregates CI + report presence.

**If reports request changes:** you review findings, then invoke **implementer Mode 2 (fix pass)** — human gate between audit and code changes, max 2 passes per brief. Re-run only the auditors whose domain you fixed. See [`multitask-playbook.md`](multitask-playbook.md) Pattern E.

### Skip flags

Set by Conductor in convoy frontmatter and PR template:

| Flag | Skips |
| --- | --- |
| `review` | Reviewer only (rare — hotfix should still run security) |
| `security` | Security auditor |
| `a11y` / `design` | UI auditors |

**Never skip:** `plan-approval`, `pr-merge`, `prod-promote`.

## L1 rules (preventive)

| Rule | Purpose |
| --- | --- |
| `security-baseline.mdc` | Always-on secure coding defaults |
| `auth-patterns.mdc` | Repo-specific auth helpers and IDOR patterns |
| `api-routes.mdc` | Validation + error helpers on API routes |
| `no-go-zones.mdc` | Secrets paths, generated dirs |

## L3 optional gates

| Workflow | Purpose |
| --- | --- |
| `forbidden-patterns.yml` | Repo-specific grep policies (harvest from tcg-vault pattern) |
| `npm-audit-gate.yml` | Fail PR on new high/critical audit findings |
| `convoy-metrics-gate.yml` | Convoy PRs must log telemetry |

## GitHub org setup (not templated)

Configure in repo **Settings → Branches**:

1. Require pull request before merging
2. Require approvals (≥ 1)
3. Require review from CODEOWNERS when paths match
4. Require status checks: CI + rollup (as applicable)
5. Dismiss stale reviews on new pushes

## Optional: Cursor Bugbot

After audit fan-out, optionally run Bugbot on the PR for a second pass. Document in convoy retro whether it caught issues the security auditor missed.

## Security-critical convoys

For auth, payments, or permission model changes:

1. Classification: `feature` or `hotfix` — **do not** skip `security` or `review`
2. Smaller PRs (per-brief) beat one large diff
3. Mirror report under `.convoys/<slug>/audits/security-*.md`
4. Human reviewer with CODEOWNERS on `auth/**`, `middleware.*`, `app/api/**`

## Related docs

- [`docs/role-reference.md`](role-reference.md) — full pipeline diagram
- [`docs/multitask-playbook.md`](multitask-playbook.md) — Pattern A fan-out
- `.convoys/README.md` — skip flags and lifecycle
