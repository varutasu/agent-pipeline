<!--
Catalog inspiration: cuellarfr/design-skills (https://github.com/cuellarfr/design-skills) — MIT.
Independently authored from Nielsen's 10 heuristics (Jakob Nielsen / NN/g, 1994 + 2020
revision), Norman's "Design of Everyday Things," and the published UX-laws catalog
(Laws of UX — lawsofux.com — CC-BY-3.0). Adapts the structure of cuellarfr's
"Design Critique & Evaluation" domain to agent-pipeline conventions.
-->
---
name: design-critique
description: >-
  Run a heuristic + UX-law design critique on a UI surface or flow. Produces a
  9-step structured critique scoring discoverability, learnability, efficiency,
  error prevention, and emotional response, keyed to Nielsen's 10 heuristics
  and ~27 UX laws. Use when role-ux-reviewer is invoked, when the user asks
  for a UX review or design critique, before a UI-heavy convoy ships, or when
  a flow's success metric is below target. Skip for server-only / infra-only
  / docs-only convoys (skip flag: ux).
---

# Design critique

A 9-step structured critique framework keyed to **Nielsen's 10 usability heuristics** (1994, revised 2020) and the canonical **UX laws** catalog. Outputs an evidence-based critique report, not a personal opinion. Use when the question is *"is this design any good?"* rather than *"does this comply?"* — accessibility-audit handles the compliance question.

## When to invoke

- **Automatic:** by `role-ux-reviewer` when a convoy's PR draft adds or substantially modifies a user-facing flow.
- **Manual:** when the user says *"review the UX"*, *"critique this design"*, *"why does this feel off"*, or asks about a specific heuristic ("is this discoverable?").
- **Pre-merge:** when a multitask audit fan-out runs alongside a11y + design-systems.
- **Post-launch:** when a flow's success metric is below target (e.g. checkout abandonment > 30%).

## Scoring rubric

Each finding scores **1-5** on the relevant heuristic + a **severity 0-4** matching the a11y skill (so audit deliverables stack consistently).

| Score | Meaning |
| --- | --- |
| **5** | Exemplary — others should copy this pattern. |
| **4** | Solid — meets the heuristic with intentionality. |
| **3** | Adequate — meets the heuristic but with friction. |
| **2** | Weak — violates the heuristic on the happy path. |
| **1** | Broken — violates the heuristic on the critical path. |

Cite the specific heuristic # or UX law in every finding. **No unattached opinions.**

## Nielsen's 10 heuristics (canonical reference)

The 10 heuristics every critique scores against, in audit order:

1. **Visibility of system status** — users know what's happening (loading, saving, position in flow).
2. **Match between system and the real world** — UI uses user's language, not jargon.
3. **User control and freedom** — undo / cancel / back is always available; no dead ends.
4. **Consistency and standards** — same things look the same; standard patterns aren't reinvented.
5. **Error prevention** — confirm destructive actions; validate inline before submit; use constraints to make errors impossible.
6. **Recognition rather than recall** — visible options, not "remember what to type."
7. **Flexibility and efficiency of use** — shortcuts for power users without obscuring the path for novices.
8. **Aesthetic and minimalist design** — every element earns its place; no decorative noise.
9. **Help users recognize, diagnose, and recover from errors** — error messages name the problem + suggest a fix.
10. **Help and documentation** — discoverable, searchable, task-oriented.

Deep reference: `references/heuristics-and-laws.md` (includes the 27 UX laws keyed to which heuristics they reinforce).

## The 9 steps

Run all 9 in order on the surface or flow under review. Each produces a section in the output report.

### 1. Define scope + user goal

Before critiquing anything, name the **one** user goal this surface serves. Write it as a verb phrase: *"Sign in to my account,"* *"Compare two products,"* *"Recover from a failed payment."*

If you can't state a single primary goal in one sentence, that's finding #1: the surface is trying to do too much.

### 2. Walk the happy path (Heuristic 1, 2, 4)

Tab + click through the path from the entry point to the goal completion. At each step, capture:

- What state is shown? Does the user know what's happening (Heuristic 1)?
- Is the language plain (Heuristic 2)?
- Do interactive elements look interactive (Heuristic 4, *Affordance* — Norman)?
- Is the next action obvious (*Hick's Law*: time to decide grows logarithmically with options)?

Output: step-by-step walkthrough, score per step on Heuristics 1/2/4.

### 3. Map the error paths (Heuristic 5, 9)

Deliberately fail at each step. For every failure mode:

- Does the system **prevent** the error before it happens (Heuristic 5: better than recovering)?
- If it happens anyway, is the error message **specific + actionable** (Heuristic 9: "Password too short" beats "Invalid input")?
- Can the user recover **without re-entering everything** (Heuristic 5)?
- Are destructive actions confirmed (e.g. "Delete account" → typed confirmation)?

Output: error-path findings, score on Heuristics 5/9.

### 4. Check undo/cancel/back (Heuristic 3)

For every committing action ("Save", "Send", "Delete", "Publish"):

- Is there a clear cancel before commit?
- Is there an undo after commit (5-15 seconds is the standard window per Gmail's pattern)?
- Does back/escape work as expected?
- *Doherty Threshold*: does action complete in ≤ 400ms or does it show progress?

Output: control + freedom findings, score on Heuristic 3.

### 5. Audit cognitive load (Heuristics 6, 8 + UX laws)

Count the number of decisions the user must make to reach the goal. Apply:

- *Miller's Law* — working memory holds 7±2 items; chunk lists > 7.
- *Hick's Law* — minimize choice points; defer secondary actions.
- *Aesthetic-Usability Effect* — visual clarity raises perceived usability; clutter lowers it.
- *Fitts's Law* — target size + distance — small/far targets are slow. Primary CTAs should be the largest interactive element.
- *Recognition over recall* (Heuristic 6) — don't make the user remember; show options.

Output: cognitive load findings, score on Heuristics 6/8.

### 6. Check flexibility for power users (Heuristic 7)

- Keyboard shortcuts on power surfaces (`?` to show shortcuts, `/` to search).
- Bulk actions where one-by-one is tedious.
- Customization that doesn't trap novices (default sensible).
- *Postel's Law* — be liberal in what you accept (URLs, dates, casing).

Output: efficiency findings, score on Heuristic 7.

### 7. Heuristic walk (Heuristic 1-10 sweep)

Quick sweep of any heuristic not covered above. For each, ask *"is there a violation I haven't flagged?"* — gut check + spot fixes.

### 8. Emotional + brand pass

What's the **feel**? Confident, frantic, generous, mean? Score 1-5 on:

- Does the surface respect the user's time (loading skeletons vs spinners; saved drafts; sensible defaults)?
- Does it celebrate the user's wins (a save confirmation, not silent success)?
- Does it apologize on failures, not blame ("We couldn't save your changes" beats "Server error")?
- Is the tone consistent with the brand (per `skills/ux-writing` when that lands in wave 1c)?

This step is judgment-heavy — anchor every observation to a concrete UI moment + a UX law.

### 9. Synthesize: 3 things + 1 thing

End with:

- **3 things to fix immediately** — highest severity, lowest cost.
- **1 thing to reconsider at the design-system level** — the recurring pattern this critique surfaced.

If you have more than 3 immediate fixes, you have a redesign, not a critique. Save the rest for a follow-up convoy.

## Steps

1. **Scope read.** PR diff or convoy `## Architecture`. Identify the surface + the primary user goal.
2. **Tooling sweep.** Lighthouse Best Practices + Performance pass. Note any obvious perf-degraded UX (LCP > 2.5s, CLS > 0.1, INP > 200ms).
3. **9-step walk** in the order above. One section per step in the report.
4. **Cross-reference** findings against `references/heuristics-and-laws.md` to make sure citations are correct.
5. **Score + severity** every finding. Severity ≥ 3 → child task (Phase 2b).
6. **Report** using `templates/critique-report.md`.
7. **MCP attempt** (skip if no `.cursor/agents/echodo.config.json`):
   - `create_task_from_template({template: "design-critique", body: <report>, parentId: convoyId})`
   - For each sev ≥ 3, `link_audit_finding(...)`
   - On failure: queue to `.convoys/.pending-mcp-sync.jsonl`. Files are source of truth.
8. **Hand off**: *"UX critique complete. Score X/50 across 10 heuristics. N sev-≥-3 findings. Top 3 fixes: ..."*

## Anti-patterns

- **"This feels off"** without a heuristic. Every finding cites a heuristic or law. If you can't, you don't have a finding yet — keep walking.
- **Comparing to a different product** instead of to the heuristics. "Linear does it this way" is not a finding. *"This violates Heuristic 6 because options aren't visible"* is.
- **Scoring without evidence.** A 2/5 needs a specific UI moment + quote (screenshot or paste). Abstract "this feels cramped" doesn't qualify.
- **Bundling a11y + UX.** A11y compliance is the `accessibility-audit` skill. Design critique is separate. Cross-reference between them, don't merge.
- **Reinventing patterns.** Heuristic 4 (Consistency) — if a standard pattern exists, deviating needs a stated reason in the convoy's `## Architecture`.

## References

- `references/heuristics-and-laws.md` — Nielsen 10 + 27 UX laws with brief definitions + audit prompts.

## Output template

- `templates/critique-report.md` — Phase 2b template source.
