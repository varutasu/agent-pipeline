<!--
Catalog inspiration: cuellarfr/design-skills (https://github.com/cuellarfr/design-skills) — MIT.
This SKILL.md is independently authored against WCAG 2.2 (W3C). It does not reproduce
cuellarfr's prose; it follows the same domain structure and adapts the agent-pipeline's
≤350-line SKILL.md / progressive-disclosure conventions.
-->
---
name: accessibility-audit
description: >-
  Run a WCAG 2.2 accessibility audit on a UI change or surface. Produces a
  severity-ranked findings report keyed to WCAG success criteria, with code
  diffs for the fixable cases. Use when role-a11y-auditor is invoked, when
  the user asks for an a11y review, before shipping a UI convoy, or whenever
  a change touches anything interactive (forms, navigation, modals, dynamic
  content, media). Skip if `skip: a11y` is set in the convoy or the change is
  server/infra-only.
---

# Accessibility audit

Five-layer audit framework keyed to **WCAG 2.2** (W3C, October 2023). Outputs a severity 0–4 findings list, an executive summary, and code-diff suggestions for fixable issues. The default rubric below covers the cases that actually fail in production; the deep reference at `references/wcag-2.2-checklist.md` covers all 86 success criteria for completeness.

## When to invoke

- **Automatic:** by `role-a11y-auditor` when a convoy's PR draft touches `app/**`, `components/**`, or any UI surface.
- **Manual:** when the user says *"audit this for a11y"*, *"check accessibility"*, *"can a screen reader use this"*, or names a WCAG criterion (`2.1.1`, `1.4.3`, etc.).
- **Pre-merge:** when an audit fan-out runs (`/multitask role-reviewer + role-design-system-auditor + role-a11y-auditor` per the multitask playbook).

## Severity scale

| Severity | Meaning | Treatment |
| --- | --- | --- |
| **4 — Blocker** | WCAG Level A failure on a critical path (auth, checkout, primary navigation). Users on AT cannot complete the journey. | Block merge. File as a child task under the audit document (per Phase 2b). |
| **3 — Major** | WCAG Level AA failure, or Level A failure on a non-critical path. AT users hit a workaround or degraded experience. | File as child task. Strongly recommend fix before merge. |
| **2 — Moderate** | WCAG Level AAA failure, or AA on a low-traffic surface, or AT-specific friction not codified in WCAG (e.g. confusing announcement order). | Inline in audit doc; create task only if pattern repeats. |
| **1 — Minor** | Polish item: improved labels, redundant ARIA cleanup, focus order optimization. | Inline only. |
| **0 — Info** | Note for the maintainer; not a defect. | Inline only. |

Per `[docs/CONSUMERS.md](../../docs/CONSUMERS.md)` resolution: **severity ≥ 3 spawns a child task** in the convoy's audit document (Phase 2b). Severity < 3 stays inline in the document body.

## The 5 layers

Run each layer in order; do not skip ahead even if the surface looks "obviously fine." Subtle violations cluster around layers 3–4.

### Layer 1 — Semantic structure (foundation)

Without correct semantic HTML, no amount of ARIA fixes the surface. **Check first** because everything downstream depends on it.

- **Landmarks** — `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` present at the page level. Exactly one `<main>` per page. Each landmark has a unique label if more than one exists.
- **Heading hierarchy** — One `<h1>` per page. `<h2>`-`<h6>` nest without level skips (no `<h2>` followed by `<h4>`).
- **Lists** — `<ul>` / `<ol>` / `<dl>` for actual lists. Not `<div>` with bullets in CSS.
- **Forms** — every `<input>` has a `<label for=...>` OR `aria-label` OR `aria-labelledby`. Placeholders are **not** labels.
- **Buttons vs links** — `<button>` for actions ("Save", "Cancel"); `<a href>` for navigation ("Go to Settings"). A `<div onclick>` is neither and fails immediately.

WCAG mapping: 1.3.1 (Info and Relationships), 2.4.6 (Headings and Labels), 4.1.2 (Name, Role, Value).

### Layer 2 — Keyboard operability

WCAG 2.1.1 (Keyboard) requires every interactive element to be reachable + operable via keyboard alone.

- **Tab order** matches visual reading order. Use `tabindex="0"` to add custom interactive elements; never use `tabindex >= 1` (creates an invisible second tab loop).
- **Focus visible** — a clear focus ring on every focusable element. `*:focus { outline: none }` without a replacement is an instant Level A failure (2.4.7).
- **No keyboard traps** — Escape closes modals; focus returns to the trigger. Tab cycles within the modal until closed.
- **Skip-to-content link** — present, becomes visible on focus, lands on `<main>` (2.4.1, Bypass Blocks).
- **Custom controls** keyboard-equivalent — every action available via mouse is available via keyboard. Drag-to-reorder needs a keyboard alternative (typically arrow keys with `aria-grabbed` or the newer `<button>`+`aria-pressed` pattern).

### Layer 3 — Perceivability

Information must be perceivable across visual + non-visual + alternate-color-vision paths.

- **Alt text** on every meaningful `<img>`. Decorative images use `alt=""` (empty string, not missing). Icons used as buttons need `aria-label` on the button, not on the SVG.
- **Color contrast** — Normal text 4.5:1 (1.4.3); large text (18pt+ or 14pt+ bold) 3:1; UI components / graphical objects 3:1 (1.4.11). Check with Chrome DevTools or the WebAIM contrast checker. The dark-mode pass is a frequent failure point.
- **Color is not the only signal** — error states use icon + text ("⚠ Required"), not just red. Selected states use border + check icon, not just background color (1.4.1).
- **Resize to 200%** — content reflows without horizontal scrolling at 320 CSS pixels (1.4.10, Reflow). Tailwind's responsive utilities usually handle this; check the worst-offender (data tables, modals on mobile).
- **Animations** — respect `prefers-reduced-motion`. Auto-playing motion > 5 seconds has pause/stop (2.2.2).

### Layer 4 — Screen reader experience

WCAG can pass while screen reader UX is terrible. This layer is *the* differentiator between a compliant app and an accessible app.

- **Announcement order** matches visual order. Test with VoiceOver (macOS: Cmd+F5) on the top 3 user journeys.
- **Dynamic content announces** — toast/snackbar uses `role="status"` for non-urgent or `role="alert"` for urgent. Loading states use `aria-busy="true"` on the container.
- **Form errors** are programmatically associated — `aria-describedby` from the input to the error message. The error appears immediately when validation runs, not silently in the DOM.
- **Page title** changes on route change (single-page app pitfall). The browser title bar is the screen reader's primary location cue.
- **Modals** use `aria-modal="true"` + `role="dialog"` + `aria-labelledby`. Focus moves to the modal on open; returns to trigger on close.
- **Custom widgets** use the ARIA Authoring Practices Guide pattern verbatim. Tabs, accordions, comboboxes, and date-pickers have published patterns — don't invent your own.

### Layer 5 — Cognitive + motor accessibility (WCAG 2.2 additions)

WCAG 2.2 (Oct 2023) added 9 new success criteria focused on cognitive load and motor needs. Most often missed because tooling (axe, WAVE, Lighthouse) still treats them as new.

- **2.4.11 Focus Not Obscured (Minimum)** — when an element receives focus, no part of it is hidden by author-created content (sticky headers, cookie banners, chat widgets covering the focused field). Easy to fail with sticky headers + tab into a form below.
- **2.5.7 Dragging Movements** — any drag operation has a single-pointer alternative (click-tap interaction).
- **2.5.8 Target Size (Minimum)** — interactive targets are at least 24×24 CSS pixels OR have 24px of spacing. Common failure: icon-only buttons at 16×16.
- **3.2.6 Consistent Help** — if a help mechanism exists on multiple pages, it's in the same place.
- **3.3.7 Redundant Entry** — the user is not asked to re-enter the same info in the same session (autocomplete, prefill).
- **3.3.8 Accessible Authentication** — does not require the user to solve a cognitive function test (password puzzle, captcha-without-alternative). Magic links + WebAuthn pass; complex passwords without paste support fail.

Full WCAG 2.2 mapping: see `references/wcag-2.2-checklist.md`.

## Steps

1. **Scope read.** Read the PR diff or convoy `## Architecture` section. Identify every touched UI file. Run `git diff --name-only` if needed.
2. **Tool sweep first (cheap).** If automated checks are wired (`axe-core`, `jest-axe`, `@axe-core/playwright`), run them and capture the output. These catch ~30% of issues — fast, deterministic. **Don't stop here** — the remaining 70% needs human inspection.
3. **Manual layer pass.** Walk layers 1 → 5 against each touched surface. For each finding:
   - Cite the WCAG success criterion number (e.g. "2.1.1 Keyboard, Level A").
   - Assign severity 0–4 per the table above.
   - For severity ≥ 2, propose a code diff (verbatim, applies as-is). For severity 0-1, a sentence suffices.
4. **Pattern check.** If a pattern fails 3+ times across files (e.g. missing focus rings everywhere), file ONE pattern finding instead of 10 instances; reference the pattern.
5. **Report.** Fill `templates/audit-report.md` (in this skill). Output structure:
   - Header (convoy / brief / commit / auditor)
   - Executive summary (≤5 bullets)
   - Findings table (severity, surface, WCAG ref, description, fix)
   - Patterns to lift across the team (severity 0-1 grouped here)
6. **MCP attempt** (skip if no `.cursor/agents/echodo.config.json`):
   - Call `create_task_from_template({template: "a11y-audit", body: <report>, parentId: convoyId})` — Phase 2b
   - For each severity ≥ 3 finding, call `link_audit_finding({parentAuditId, severity, finding})` — Phase 2b
   - On failure, queue to `.convoys/.pending-mcp-sync.jsonl`; the file mirror is the source of truth.
7. **Hand off** by message: *"A11y audit complete. N findings (sev ≥ 3: M, sev < 3: K). Report: `<path>`. Recommend fixing sev ≥ 3 before merge."*

## Anti-patterns

- **Skipping layer 1** because the surface "looks structured." Manually check the semantic HTML on every touched component — frameworks generate divs by default.
- **`role="presentation"` to hide tables from screen readers.** This destroys the relationship structure WCAG 1.3.1 requires. Use proper `<th>` / `<caption>` instead.
- **`aria-label` to fix bad markup.** ARIA is a last resort. Fix the underlying semantic first; add ARIA only when no HTML element fits.
- **Trusting axe/Lighthouse alone.** They cover ~30% of failures. The 70% they miss is the difference between a compliant app and an accessible one.
- **Marking everything severity 4.** Triage matters; if every finding blocks merge, the report gets ignored. Reserve 4 for actual auth/checkout/critical-path blockers.

## References

- `references/wcag-2.2-checklist.md` — All 86 success criteria grouped by audit layer; cite the criterion number in every finding.

## Output template

- `templates/audit-report.md` — fillable report. Becomes the Phase 2b `document` body when MCP is reachable.
