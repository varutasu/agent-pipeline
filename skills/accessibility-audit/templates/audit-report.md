# A11y audit — {{convoy_slug}} / brief-{{brief_n}}

**Auditor:** role-a11y-auditor
**Convoy:** {{convoy_slug}}
**Brief / commit:** {{brief_n}} / `{{commit_sha}}`
**Date:** {{YYYY-MM-DD}}
**Standard:** WCAG 2.2, Level AA (Level A blockers also flagged)
**Tooling run:** {{axe / jest-axe / Lighthouse / etc.}}

## Executive summary

{{≤5 bullets. First line states blocker count. Example:}}
- 2 blockers (sev 4) require fix before merge: missing skip-link, missing focus indicator on primary CTA.
- 4 major findings (sev 3): contrast ratio failures in dark-mode error states.
- 7 minor + 3 info findings inline below.
- Patterns to lift across the team: focus-ring system + dark-mode contrast tokens.
- Recommendation: **block merge** until severity-4 items fix.

## Findings table

| # | Sev | Surface | WCAG ref | Finding | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | 4 | `app/(auth)/login/page.tsx:42` | 2.4.7 Focus Visible (AA) | "Sign in" button has `outline: none` with no replacement focus style. Keyboard users cannot see focus on the auth submit. | Add `focus-visible:ring-2 focus-visible:ring-primary` (Tailwind). Diff in §Diffs below. |
| 2 | 4 | `app/layout.tsx:18` | 2.4.1 Bypass Blocks (A) | No skip-to-content link. Screen reader users must tab through nav on every page. | Add `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>` before `<header>`. |
| 3 | 3 | `components/Toast.tsx:14` | 4.1.3 Status Messages (AA) | Toast is rendered with no `role`; screen readers don't announce it. | Add `role={severity === 'error' ? 'alert' : 'status'}` to the toast root. |
| ... | | | | | |

## Severity ≥ 3 findings (→ child tasks)

Phase 2b: each row below becomes a child `task` under this audit `document` via `link_audit_finding`.

- [ ] **#1 (sev 4)** Focus visible — `app/(auth)/login/page.tsx:42`
- [ ] **#2 (sev 4)** Skip-to-content — `app/layout.tsx:18`
- [ ] **#3 (sev 3)** Toast role — `components/Toast.tsx:14`

## Severity < 3 findings (inline only)

- **#5 (sev 2):** `<button>` text "Click here" is non-descriptive — recommend "Save changes" (WCAG 2.4.4). Three other instances in the same file follow the same pattern.
- **#6 (sev 1):** Redundant `aria-label` on a `<button>Save</button>` — the visible text already serves as the accessible name (WCAG 2.5.3, Label in Name).

## Patterns to lift

{{Findings that recur 3+ times — file as ONE pattern, not N instances.}}

- **Focus rings:** 4 instances of `outline: none` without replacement. Recommendation: a `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` utility class baked into the design-system primitives (`Button`, `Input`, `Select`, `IconButton`).
- **Dark-mode contrast:** 3 surfaces fail 4.5:1 contrast in dark mode but pass in light. Recommendation: add dark-mode contrast tokens to the DS audit (`role-design-system-auditor` follow-up).

## Suggested diffs

### Diff for finding #1 (focus visible on login submit)

```diff
- <button type="submit" className="bg-primary text-white px-4 py-2 rounded">
+ <button type="submit" className="bg-primary text-white px-4 py-2 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    Sign in
  </button>
```

### Diff for finding #2 (skip link)

```diff
  <html lang="en">
    <body>
+     <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:p-2 focus:bg-primary focus:text-white focus:rounded">Skip to content</a>
      <Header />
-     <main>
+     <main id="main">
        {children}
      </main>
```

## Tooling output (collapsed)

<details>
<summary>axe-core results</summary>

```
{{paste raw axe results JSON or summary here}}
```

</details>

<details>
<summary>Manual keyboard-walk notes</summary>

{{notes from manually tabbing through the surface}}

</details>

## Sign-off

- [ ] Severity-4 items fixed and verified
- [ ] Severity-3 items either fixed or filed as follow-up convoys
- [ ] Patterns added to next convoy's `## Architecture` section under "Cross-cutting changes"
- [ ] Auditor: role-a11y-auditor (`{{commit_sha}}`)
