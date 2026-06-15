# Design system audit — {{convoy_slug}} / brief-{{brief_n}}

**Auditor:** role-design-system-auditor
**Convoy:** {{convoy_slug}}
**Brief / commit:** {{brief_n}} / `{{commit_sha}}`
**Date:** {{YYYY-MM-DD}}
**Scope:** {{e.g. "tcg-vault DS — tokens, atoms, governance, adoption"}}

## Maturity scoring

| Axis | Score (1-5) | Evidence |
| --- | --- | --- |
| **Tokens** | 2 | `tailwind.config.ts` has a single layer of CSS vars; no aliases. Hex codes in 47 component files. |
| **Components** | 3 | `<Button>` + `<Input>` + `<Card>` published as primitives. No molecules or organisms. 5 raw `<button>` instances bypassing `<Button>`. |
| **Patterns** | 1 | No documented patterns. Each new feature reinvents form + empty-state + error-state. |
| **Governance** | 1 | No contribution doc. Last 3 primitives shipped by 3 different authors with no review. |
| **Adoption** | 2 | Not measured. Spot check: 30% of color usage is inline hex; `<Button>` adoption ~ 80%. |

**Total: 9 / 25** — early-stage system. Primary leverage point: **Patterns** (axis 1). Secondary: **Governance**.

## Findings table

| # | Sev | Axis | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | 4 | Patterns | No documented `failure-state` pattern. Each flow (checkout, sign-up, password reset, account) implements its own error UI. 4 different message styles, 3 different recovery affordances. Surfaced by 3 prior design-critique findings. | Ship a `<FailureState>` primitive with cause-code → copy mapping. Migrate the 4 known callsites in v0.5. |
| 2 | 3 | Tokens | Components reference primitives directly (`bg-blue-500` in `Button.tsx:14`). No alias layer; dark mode would require rewriting every component. | Introduce `tokens/aliases.json` (W3C format). Refactor `Button`, `Input`, `Card` to consume aliases. Add ESLint rule banning Tailwind color/spacing utilities in `components/**`. |
| 3 | 3 | Governance | No contribution doc. New primitives shipped by individuals without review; quality + naming inconsistent. | Author `docs/design-system/contributing.md`: who proposes, who reviews, naming rules, SLA. Add `CODEOWNERS` for `packages/ui/`. |
| 4 | 2 | Tokens | No `$type` declared in `tokens.json`; tools can't validate. | Adopt W3C format: add `$value` + `$type` per entry. Compatible with current build. |
| 5 | 2 | Components | Five raw `<button>` instances in `app/(marketing)/**` bypass `<Button>`. | Migrate to `<Button>`. Add ESLint rule to ban raw `<button>` in `app/**` (allow in `components/ui/**`). |
| 6 | 1 | Adoption | Adoption not measured. We can't tell if new components catch on. | Add a `pnpm ds:audit` script that counts component-instance vs raw-HTML ratios; surface in CI rollup. |

## Severity ≥ 3 findings → child tasks

Phase 2b: each row becomes a child `task`.

- [ ] **#1 sev 4** — `FailureState` primitive + 4-callsite migration
- [ ] **#2 sev 3** — Token alias layer + ESLint enforcement
- [ ] **#3 sev 3** — DS governance doc + CODEOWNERS

## Severity < 3 findings (inline only)

- **#4 sev 2** — W3C `$type` declarations
- **#5 sev 2** — Marketing-page button migration
- **#6 sev 1** — Adoption measurement script

## Token audit detail

### Current state

```jsonc
// tokens.json (current — tier 1 only)
{
  "primary":     "#3B82F6",
  "secondary":   "#10B981",
  "neutral-50":  "#FAFAFA",
  "neutral-900": "#18181B"
}
```

Components import directly:

```tsx
// components/Button.tsx — current
<button className="bg-blue-500 text-white" />
```

### Target state

```jsonc
// tokens/primitives.json
{
  "color.blue": {
    "500": { "$value": "#3B82F6", "$type": "color" }
  }
}

// tokens/aliases.json
{
  "color.interactive.default": {
    "$value": "{color.blue.500}",
    "$type": "color"
  }
}
```

```tsx
// components/Button.tsx — target
<button className="bg-[var(--color-interactive-default)] text-white" />
```

Cost estimate: ~ 4 hours of refactor for `Button`, `Input`, `Card`, plus ESLint rule. Half-day total.

## Component audit detail

Top 5 reused UI elements + adoption rates (counted via `grep`):

| Element | DS adoption | Raw HTML instances | Acceptable? |
| --- | --- | --- | --- |
| `<Button>` | 47 | 5 | Migrate marketing pages |
| `<Input>` | 23 | 0 | ✅ |
| `<Card>` | 18 | 8 | Investigate; some may not be Card-shaped |
| `<Modal>` | n/a | 12 | **Missing primitive — ship one** |
| `<Toast>` | n/a | 4 | **Missing primitive — ship one** |

Adoption opportunity: **ship `<Modal>` + `<Toast>` primitives** before more raw instances accumulate.

## Governance recommendation

Hybrid model recommended:

- **Centralized:** tokens + atoms (Button, Input, Card, Modal, Toast) — owned by DS team / @rstillw.
- **Federated:** molecules + organisms (`SearchBox`, `ProductCard`, `DataTable`) — feature teams contribute under review.
- **Contribution rules:**
  1. Proposal in `.convoys/<slug>.md` with `## Architecture` justifying the new primitive.
  2. Design-system review by the DS owner (CODEOWNERS).
  3. Migration plan for prior duplicates listed in PR body.
  4. SLA: review within 2 business days.

## Sign-off

- [ ] Severity-4 items scheduled before next major release
- [ ] Severity-3 items either scheduled or rejected with documented reason
- [ ] Maturity scores tracked over time (this audit is t=0; re-score after Phase 6 retros)
- [ ] Auditor: role-design-system-auditor (`{{commit_sha}}`)
