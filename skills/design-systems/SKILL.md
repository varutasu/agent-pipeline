<!--
Catalog inspiration: cuellarfr/design-skills (https://github.com/cuellarfr/design-skills) — MIT.
Independently authored from Brad Frost's "Atomic Design" (2016), the W3C Design Tokens
Community Group format spec (https://design-tokens.github.io/community-group/format/),
and the broader design-systems literature (Nathan Curtis, Diana Mounter, Marco Suarez).
Adapts the structure of cuellarfr's "Design Systems" domain to agent-pipeline conventions.
-->
---
name: design-systems
description: >-
  Audit or design a component/token/governance system. Produces a maturity
  assessment + concrete recommendations across token architecture, component
  hierarchy, governance, and adoption metrics. Use when role-design-system-
  auditor is invoked, when the user asks "is our design system any good"
  or "how do we ship a DS", when patterns recur across audits (see
  design-critique step 9), or when teams are duplicating primitives. Skip
  for server-only convoys (skip flag: design-system).
---

# Design systems

Audit + design framework for component-and-token systems. Covers **token architecture (3-tier W3C format), component hierarchy (Atomic Design), governance models (centralized / federated / hybrid), and a maturity model** for benchmarking. Outputs an audit report scored against a 5-stage maturity rubric, plus concrete recommendations.

This skill answers two distinct questions:
- **Auditing** an existing system: where's the leverage to invest next?
- **Designing** a new system: what's the minimum viable scope to start, what's deferred?

## When to invoke

- **Automatic:** by `role-design-system-auditor` when a convoy ships a new component, modifies a primitive, or touches `tailwind.config.{ts,js}` / `tokens/**` / `theme/**`.
- **Manual:** when the user says *"audit our design system"*, *"ship a design system"*, *"why are buttons inconsistent"*, *"set up design tokens"*.
- **Pattern-triggered:** when `design-critique` or `accessibility-audit` flags a recurring pattern (DS-level finding) 3+ times across audits.
- **Adoption review:** when launching a new app/surface that should consume the system.

## Maturity model

Score the existing system 1-5 on each axis. The audit reports the lowest-scoring axis as the primary leverage point.

| Axis | 1 — Ad hoc | 2 — Emergent | 3 — Defined | 4 — Managed | 5 — Optimizing |
| --- | --- | --- | --- | --- | --- |
| **Tokens** | Hex codes inline | Shared CSS vars / Tailwind defaults | 2-tier (alias → primitive) | 3-tier (semantic → alias → primitive) in W3C format | Multi-brand / multi-theme automation; tokens generated from a single source |
| **Components** | Per-feature duplication | A shared `Button` lives somewhere | Documented primitives (`Button`, `Input`, `Select`) | Atomic hierarchy with atoms / molecules / organisms; usage docs | Components versioned + auto-checked for adoption |
| **Patterns** | None | One-off ("we usually use modals like this") | Documented patterns (form, table, empty state) | Published pattern library with do/don't examples | Patterns evolve from telemetry + research feedback |
| **Governance** | "Whoever's loudest" | One person decides | Documented contribution rules | Cross-team contribution + design council | Federated contribution with central review; SLA on requests |
| **Adoption** | Unknown | Anecdotal | Tracked manually | Measured (component-instance count per app) | Adoption metrics drive prioritization |

A young system at stage 2 across the board is healthy. A system at stage 4 tokens but stage 1 governance is a time bomb. **Audit the lowest axis first.**

## Token architecture (deep)

The single most leveraged DS investment. A clean token system enables theming, brand variants, dark mode, accessibility tuning, and platform consistency.

Three-tier token hierarchy (W3C Design Tokens Community Group spec):

### Tier 1 — Primitives (the palette)

Raw values. **Should not appear in component code.** Treat as named constants.

```jsonc
// tokens/primitives.json
{
  "color": {
    "blue": {
      "500": { "$value": "#3B82F6", "$type": "color" },
      "600": { "$value": "#2563EB", "$type": "color" },
      "700": { "$value": "#1D4ED8", "$type": "color" }
    },
    "neutral": {
      "100": { "$value": "#F4F4F5", "$type": "color" },
      "900": { "$value": "#18181B", "$type": "color" }
    }
  },
  "spacing": {
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" }
  }
}
```

### Tier 2 — Aliases (semantic intent)

Map primitives to roles. Components reference aliases, not primitives.

```jsonc
// tokens/aliases.json
{
  "color": {
    "background": {
      "primary":     { "$value": "{color.neutral.50}",  "$type": "color" },
      "secondary":   { "$value": "{color.neutral.100}", "$type": "color" }
    },
    "text": {
      "primary":     { "$value": "{color.neutral.900}", "$type": "color" },
      "muted":       { "$value": "{color.neutral.500}", "$type": "color" }
    },
    "interactive": {
      "default":     { "$value": "{color.blue.500}",    "$type": "color" },
      "hover":       { "$value": "{color.blue.600}",    "$type": "color" },
      "pressed":     { "$value": "{color.blue.700}",    "$type": "color" }
    }
  }
}
```

### Tier 3 — Component (last resort)

Component-specific tokens for cases where the alias doesn't fit. **Use sparingly** — too many component tokens defeats the purpose.

```jsonc
// tokens/components/button.json
{
  "button": {
    "primary": {
      "background": { "$value": "{color.interactive.default}", "$type": "color" }
    }
  }
}
```

### Dark mode + theming

Aliases get **mode variants**; primitives don't change. Switching `data-theme="dark"` flips alias mappings, not primitive values.

```jsonc
{
  "color.background.primary.dark": { "$value": "{color.neutral.900}", "$type": "color" },
  "color.text.primary.dark":       { "$value": "{color.neutral.50}",  "$type": "color" }
}
```

Deep reference: `references/token-architecture.md` (multi-brand structure, naming conventions, build pipeline).

## Component hierarchy (Atomic Design)

Brad Frost's 5-level hierarchy, adapted:

- **Atoms** — primitives (`Button`, `Input`, `Label`, `Icon`, `Avatar`). One responsibility each.
- **Molecules** — compositions of atoms (`SearchBox = Input + Button + Icon`, `Field = Label + Input + ErrorMessage`).
- **Organisms** — feature-aware compositions (`SiteHeader`, `ProductCard`, `DataTable`).
- **Templates** — layout without content (`DashboardLayout`, `MarketingLayout`).
- **Pages** — concrete instances with real data.

DS scope is typically **atoms + molecules + select organisms**. Templates + pages are app-level.

## Governance models

Pick one (or hybrid) based on org size + DS maturity:

- **Centralized** — one DS team owns + ships everything. Pros: consistency. Cons: bottleneck at scale.
- **Federated** — contributing teams ship components into the DS with a council reviewing. Pros: scale + speed. Cons: harder to enforce consistency.
- **Hybrid** — core team owns atoms + tokens (centralized); product teams contribute molecules + organisms (federated). **Most common for orgs of 30-200 engineers.**

Document the model + the contribution rules. A DS without governance is a graveyard of half-built components.

## Adoption metrics

A DS that nobody uses is a vanity project. Track:

- **Component instance count per app** (how many `<Button />` vs raw `<button>`)
- **Token coverage** (% of hex codes in code that resolve to a token vs inline)
- **Time-to-adopt** (how long after a new component ships does the first non-DS-team consume it)
- **Bypass rate** (PRs that introduce raw HTML where a DS component exists)

If adoption < 50% on atoms after 6 months, the problem is rarely the components — it's discoverability or governance.

## Steps

1. **Scope read.** PR diff or convoy `## Architecture`. Identify DS-adjacent changes: new components, token changes, theme work, Tailwind config edits.
2. **Maturity scoring.** Score the existing system on the 5 axes (Tokens / Components / Patterns / Governance / Adoption). Cite evidence per score (file paths, counts).
3. **Token audit.** Are the 3 tiers present? Are aliases used over primitives? Is there a dark-mode story? Per `references/token-architecture.md`.
4. **Component audit.** Pick the 5 most-used UI elements in the codebase (`Button`, `Input`, `Card`, `Modal`, `Toast` are the usual top 5). Count instances. Count divergences (custom buttons vs `<Button>`).
5. **Governance audit.** Is there a contribution doc? Who decided the last new primitive? Is there review?
6. **Adoption audit.** Pick one new app/surface. Count DS-component instances vs raw HTML.
7. **Findings + leverage.** Lowest-scoring axis gets the top recommendation. Severity ≥ 3 → child task.
8. **Report** using `templates/ds-audit-report.md`.
9. **MCP attempt** (skip if no `.cursor/agents/echodo.config.json`):
   - `create_task_from_template({template: "design-system-audit", body: <report>, parentId: convoyId})`
   - For each sev ≥ 3, `link_audit_finding(...)`
   - On failure: queue to `.convoys/.pending-mcp-sync.jsonl`.
10. **Hand off**: *"DS audit complete. Maturity: T{n}/C{n}/P{n}/G{n}/A{n}. Top recommendation: invest in {axis}. Sev ≥ 3 findings: ..."*

## Anti-patterns

- **Building components before tokens.** Components built on primitives lock in the visual language; refactoring later is painful. Start with aliases even if the primitives are placeholder.
- **Mixing primitive + alias references in component code.** `bg-blue-500` AND `bg-interactive-default` in the same file means the alias system isn't enforced. Pick one rule + ESLint it.
- **Component for everything.** Not every UI moment needs to be in the DS. Atoms + heavily-reused molecules belong; one-off marketing widgets don't.
- **Governance debt.** Adding a 30th button variant because a stakeholder requested it. The DS is supposed to *push back* with patterns; not absorb every request.
- **No adoption metrics.** A DS that nobody measures is a DS that nobody uses.
- **Versioning by vibe.** Components without semantic versioning create silent breakage. Major + minor + patch from day 1.

## References

- `references/token-architecture.md` — Full W3C token format, multi-brand structures, build pipeline (Style Dictionary / Tokens Studio), naming conventions.

## Output template

- `templates/ds-audit-report.md` — Phase 2b template source.
