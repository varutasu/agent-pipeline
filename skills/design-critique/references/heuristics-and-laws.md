<!--
Reference for the design-critique skill. Sources:
- Nielsen's 10 Usability Heuristics: NN/g, 1994 (revised 2020) — https://www.nngroup.com/articles/ten-usability-heuristics/
- Laws of UX (Jon Yablonski) — https://lawsofux.com (CC-BY-3.0)
- Norman, D. — The Design of Everyday Things (1988, 2013 revised edition)
Cite by # in critique findings.
-->

# Heuristics & UX laws — design-critique reference

## Part 1 — Nielsen's 10 Usability Heuristics

The canonical heuristic set. Every critique finding cites one of these as **H1-H10**.

### H1. Visibility of system status

Keep users informed of what's happening through timely, appropriate feedback.

**Audit prompts:**
- Is loading state visible (skeleton, spinner, progress bar)?
- Does saving show a confirmation?
- Can the user tell their position in a multi-step flow?
- For long operations: is there progress, an ETA, or a way to step away?

### H2. Match between system and the real world

Speak users' language, follow real-world conventions.

**Audit prompts:**
- Are technical terms ("payload," "endpoint," "null") visible to end users?
- Do icons match common metaphors (gear = settings, magnifying glass = search)?
- Does date / currency / number format match user locale?

### H3. User control and freedom

Provide undo, cancel, back. Avoid trapping users.

**Audit prompts:**
- Is there a cancel before any committing action?
- Is there an undo after destructive actions (delete, send)?
- Does back / escape behave as expected?
- Can users abandon a flow without penalty (e.g. partial form data persisted)?

### H4. Consistency and standards

Same things look the same. Don't reinvent standard patterns.

**Audit prompts:**
- Do interactive elements look interactive (affordance — Norman)?
- Are primary CTAs styled consistently across the app?
- Do similar actions in different contexts use the same icons + labels?
- If a platform convention exists (e.g. iOS share sheet), is it used?

### H5. Error prevention

Better than good error messages: a design that prevents errors.

**Audit prompts:**
- Are destructive actions confirmed (typed confirmation, two-step)?
- Are constraints visible (max length, date range) before submit?
- Is validation inline (as the user types) where possible?
- Are mutually-exclusive options structurally exclusive (radio not checkbox)?

### H6. Recognition rather than recall

Visible options beat "remember what to type."

**Audit prompts:**
- Are options shown rather than requiring input from memory?
- Are previous selections persisted (recent items, autocomplete)?
- Is context preserved across navigation (search query, filters)?

### H7. Flexibility and efficiency of use

Shortcuts for experts; clarity for novices.

**Audit prompts:**
- Are keyboard shortcuts available + discoverable (`?` to list)?
- Are bulk actions supported where 1-by-1 is tedious?
- Is customization opt-in (defaults sensible)?
- *Postel's Law* — does input parsing accept reasonable variants?

### H8. Aesthetic and minimalist design

Every element earns its place.

**Audit prompts:**
- Is anything decorative-only? Why is it there?
- Is the primary action visually dominant?
- Are competing visual hierarchies present (two equally-loud CTAs)?
- *Aesthetic-Usability Effect* — does the surface feel polished?

### H9. Help users recognize, diagnose, and recover from errors

Error messages: identify problem + suggest fix in plain language.

**Audit prompts:**
- Do errors name the problem ("Password must be 8+ characters" vs "Invalid input")?
- Do they suggest the fix ("Try again with a longer password")?
- Are they styled to attract attention without alarming?
- Is recovery in-place (don't lose the user's work)?

### H10. Help and documentation

Discoverable, searchable, task-oriented.

**Audit prompts:**
- Is help discoverable from the surface (contextual `?` icons)?
- Is the docs page searchable?
- Are docs task-oriented ("How do I...") not feature-oriented ("The Foo screen")?

---

## Part 2 — UX laws

27 named laws drawn from cognitive psychology + interaction design. Each is **a force that shapes user behavior**, not a rule. Cite as **L1-L27** in findings.

### L1. Aesthetic-Usability Effect

Users perceive aesthetically pleasing designs as more usable. *Implication:* visual polish raises perceived usability and forgiveness for small bugs.

### L2. Choice Overload

Too many options reduces decision quality and increases abandonment. *Implication:* show ≤ 7 primary options; defer the rest behind progressive disclosure.

### L3. Chunking

Group information into meaningful chunks. *Implication:* phone numbers in 3-3-4; pricing tiers in 3-tier columns.

### L4. Cognitive Bias

User decisions are shaped by anchoring, defaults, loss aversion. *Implication:* defaults matter enormously (opt-in vs opt-out for consent, for example).

### L5. Cognitive Load

Working memory has limits. *Implication:* reduce extraneous load; chunking, progressive disclosure, sensible defaults.

### L6. Doherty Threshold

Productivity soars when system + user interact at a pace (≤ 400ms) where neither waits. *Implication:* show optimistic UI; preload likely next state.

### L7. Fitts's Law

Time to acquire a target is a function of distance + size. *Implication:* primary CTAs should be the largest, closest interactive elements.

### L8. Flow

A state of focused immersion when challenge matches skill. *Implication:* avoid interruptions during flow (modal popups, unexpected confirmations).

### L9. Goal-Gradient Effect

Users accelerate as they approach a goal. *Implication:* progress bars work; close-to-done states reduce abandonment.

### L10. Hick's Law

Decision time grows logarithmically with options. *Implication:* fewer top-level options + good hierarchy beats one massive menu.

### L11. Jakob's Law

Users spend most of their time on other sites; expect yours to work the same way. *Implication:* deviate from convention only when you have a stated reason.

### L12. Law of Common Region

Elements in a bounded region are perceived as grouped. *Implication:* cards / dividers / spacing communicate grouping without explicit relationships.

### L13. Law of Proximity

Close elements are perceived as related. *Implication:* form labels near their inputs; related actions near each other.

### L14. Law of Prägnanz

The brain prefers simple, ordered forms. *Implication:* simpler layouts are perceived faster.

### L15. Law of Similarity

Similar elements are perceived as related. *Implication:* primary CTAs across the app should be visually identical to reinforce the pattern.

### L16. Law of Uniform Connectedness

Elements connected visually (by line, color, container) are perceived as related. *Implication:* breadcrumbs / progress connectors guide flow.

### L17. Mental Model

Users come with mental models from prior experience. *Implication:* discover the model (research) before designing against or with it.

### L18. Miller's Law

Working memory holds 7±2 items. *Implication:* don't show > 7 top-level options.

### L19. Occam's Razor

Among competing designs, prefer the simplest that solves the problem. *Implication:* delete features more often than add.

### L20. Pareto Principle

80% of users will use 20% of features. *Implication:* optimize aggressively for the 20%; bury the rest.

### L21. Parkinson's Law

Work expands to fill the time available. *Implication:* default to short flows; "you can always do more" beats "this is all configurable."

### L22. Peak-End Rule

Users judge an experience by its peak (best or worst moment) and its end. *Implication:* invest in the success state + the failure recovery; the middle matters less.

### L23. Postel's Law

Be conservative in what you do, liberal in what you accept. *Implication:* accept URLs with or without `https://`; dates in multiple formats.

### L24. Selective Attention

Users see what they're looking for, miss the rest. *Implication:* secondary info doesn't compete with the primary action.

### L25. Serial Position Effect

First + last items in a list are remembered best. *Implication:* put the most important options at the start + end.

### L26. Tesler's Law (Conservation of Complexity)

Every system has a baseline complexity that cannot be removed, only redistributed (between system and user). *Implication:* decide where complexity goes — defaults, configuration, learning — but don't pretend you can erase it.

### L27. Von Restorff Effect

A distinctive item stands out. *Implication:* primary CTA distinctive in color + size; reserved for the most important action.

---

## How to cite

In findings, prefer:

> "H6 (Recognition over recall) — the timezone field requires the user to know the IANA name from memory. **L18 (Miller's Law)** also applies: the dropdown has 200+ options. Recommend an autocomplete that shows city names + the inferred timezone."

This grounds the finding in evidence + gives the reader the same vocabulary to debate or accept it.
