<!--
Vendored engine: nextlevelbuilder/ui-ux-pro-max-skill (MIT) — see UPSTREAM.md, LICENSE, data/, scripts/.
Pipeline wrapper: agent-pipeline — planning-only; paired with role-ui-designer.
-->
---
name: ui-ux-pro-max
description: >-
  Generate a locked design direction for greenfield UI (pattern, palette,
  typography, anti-patterns) from product type. Planning phase only — invoke
  via role-ui-designer at convoy start or on explicit redesign. Do not use
  during audit fan-out or incremental UI tweaks inside an existing DS.
---

# UI UX Pro Max (planning)

Data-driven design intelligence: industry rules, styles, palettes, typography, and stack guidelines. **Generate once, lock in the convoy, enforce later** with `design-critique`, `design-systems`, and `accessibility-audit`.

## When to invoke

| Do | Don't |
| --- | --- |
| New screen, landing, marketing surface, major visual refresh | Hotfix, docs-only, server-only |
| User says *redesign* or bumps `design_direction.version` | Audit fan-out on a PR diff |
| `role-ui-designer` at convoy start (skill installed) | Every implementer brief |
| Re-run after explicit redesign request | Auto-re-run because code "looks off" |

## Prerequisites

- Python 3.x on the machine running the agent (`python3 --version`).
- Skill installed at `.cursor/skills/ui-ux-pro-max/` (bootstrap opt-in).

## Generate a design system (primary workflow)

From repo root:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py \
  "<product type query>" \
  --design-system \
  -p "<Project or convoy name>"
```

Examples:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "B2B SaaS analytics dashboard" --design-system -p "Deck Hearth admin"
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "wellness spa booking" --design-system -p "Serenity Spa"
```

Pick stack-specific guidelines when the convoy targets a known stack:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "checkout flow" --stack nextjs --max-results 5
```

## Lock in the convoy

1. Parse generator output into `skills/ui-ux-pro-max/templates/design-direction.md`.
2. Append `## Design direction` to `.convoys/<slug>.md`.
3. Set frontmatter:

```yaml
design_direction:
  source: role-ui-designer
  skill: ui-ux-pro-max
  skill_version: "2.5.0"
  version: 1
  locked_at: YYYY-MM-DD
  product_type: "<from query>"
  pattern: "<from output>"
  style: "<from output>"
  stack: nextjs
```

On **redesign**, bump `version` and replace the section — do not edit in place without bumping.

## Hand-off to other skills

| Next | Role / skill | Job |
| --- | --- | --- |
| Reuse + constraints | `role-ux-reviewer` | Maps locked direction to existing components; a11y constraints |
| Briefs | `role-architect` | Briefs must not contradict `design_direction` |
| Enforce | audit fan-out | `design-systems`, `accessibility-audit`, `design-critique` on the diff |

**Conflict rule:** repo tokens (`tailwind.config`, `globals.css`, `components/ui/`) **win** over generated palettes unless the convoy records an approved override.

## What this skill does NOT do

- Replace `design-critique` / `design-systems` / `accessibility-audit` at PR time.
- Commit code or open PRs.
- Install npm packages or fonts — implementer adds dependencies per brief.

## Anti-patterns

- Running the generator during audit fan-out.
- Re-running on brief 2, 3, … without a redesign request.
- Ignoring existing repo DS when the convoy is incremental UI (`skip: ui-design`).
- Loading entire `data/*.csv` into chat — always use `scripts/search.py`.

## References

- Upstream docs: [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- Convoy output template: `templates/design-direction.md`
- L2 role: `role-ui-designer` in `.cursor/agents/`
