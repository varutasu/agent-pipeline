<!--
WCAG 2.2 (W3C, Oct 2023) success-criteria checklist for accessibility-audit.
Source-of-truth: https://www.w3.org/TR/WCAG22/
Each criterion is identified by its WCAG number; cite that number in audit findings.
This file groups the 86 criteria by the 5 audit layers in `../SKILL.md` so the auditor
can do a level pass without flipping between specs.
-->

# WCAG 2.2 checklist — by audit layer

Levels: **A** (must), **AA** (should — legal baseline in most jurisdictions), **AAA** (aspirational). Most consumer products target Level AA.

WCAG 2.2 = WCAG 2.1 + 9 new criteria. Criteria new in 2.2 are tagged **[2.2]**.

---

## Layer 1 — Semantic structure

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 1.3.1 | Info and Relationships | A | Semantic HTML conveys structure (lists are `<ul>`, tables are `<table>` with `<th>`, forms have labels). Programmatic structure matches visual structure. |
| 1.3.2 | Meaningful Sequence | A | Reading order in DOM matches visual order. CSS `flex-direction: row-reverse` or absolute positioning can break this. |
| 2.4.6 | Headings and Labels | AA | Headings and labels describe topic or purpose. No generic "Click here" link text. |
| 2.4.10 | Section Headings | AAA | Sections of content are organized with headings. |
| 3.3.2 | Labels or Instructions | A | Every form input has a programmatic label. Placeholder alone fails. |
| 4.1.2 | Name, Role, Value | A | Every UI component has accessible name + role + state programmatically determinable. Custom widgets need ARIA role + state attrs. |
| 4.1.3 | Status Messages | AA | Status messages can be programmatically determined (`role="status"`, `role="alert"`, `aria-live`). |

## Layer 2 — Keyboard operability

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 2.1.1 | Keyboard | A | All functionality available via keyboard. |
| 2.1.2 | No Keyboard Trap | A | Keyboard focus can move away from any component (Esc closes modals; Tab cycles out). |
| 2.1.4 | Character Key Shortcuts | A | Single-character shortcuts can be turned off, remapped, or only activate on focus. |
| 2.4.1 | Bypass Blocks | A | Skip-link or equivalent bypasses repeated content. |
| 2.4.3 | Focus Order | A | Tab order matches a meaningful sequence. |
| 2.4.7 | Focus Visible | AA | Keyboard focus indicator is visible. `outline: none` without replacement fails. |
| 2.4.11 | Focus Not Obscured (Minimum) **[2.2]** | AA | When focused, no part of the element is fully obscured by author content. Sticky headers + tab-into-form-below is a common failure. |
| 2.4.12 | Focus Not Obscured (Enhanced) **[2.2]** | AAA | When focused, no part is partially obscured either. |
| 2.4.13 | Focus Appearance **[2.2]** | AAA | Focus indicator meets a minimum size + contrast threshold (≥ 2 CSS pixels perimeter; 3:1 against unfocused state). |

## Layer 3 — Perceivability

### Text alternatives

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 1.1.1 | Non-text Content | A | Images have alt text. Decorative use `alt=""`. SVG icons used as buttons get `aria-label` on the button. |

### Time-based media

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 1.2.1 | Audio-only / Video-only (Prerecorded) | A | Transcripts for audio; descriptions for video. |
| 1.2.2 | Captions (Prerecorded) | A | Captions on prerecorded video with audio. |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | Audio description or full text alternative for prerecorded video. |
| 1.2.4 | Captions (Live) | AA | Live captions on live video. |
| 1.2.5 | Audio Description (Prerecorded) | AA | Audio description for prerecorded video. |

### Adaptable + distinguishable

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 1.3.3 | Sensory Characteristics | A | Instructions don't rely solely on shape, color, sound, position ("click the round button" alone fails). |
| 1.3.4 | Orientation | AA | Content works in portrait + landscape. |
| 1.3.5 | Identify Input Purpose | AA | Inputs identifying user info (name, email, tel) have appropriate `autocomplete` attribute. |
| 1.4.1 | Use of Color | A | Color is not the only means of conveying info. Errors include icon + text, not just red. |
| 1.4.3 | Contrast (Minimum) | AA | Text contrast 4.5:1 (3:1 for large text 18pt+ or 14pt+ bold). |
| 1.4.4 | Resize Text | AA | Text resizes to 200% without loss of content or function. |
| 1.4.5 | Images of Text | AA | Use real text, not images of text, unless essential (logos). |
| 1.4.10 | Reflow | AA | Content reflows at 320 CSS pixels viewport width without horizontal scroll. |
| 1.4.11 | Non-text Contrast | AA | UI components + meaningful graphical objects have 3:1 contrast against adjacent colors. |
| 1.4.12 | Text Spacing | AA | Content + functionality survives line-height 1.5, paragraph spacing 2x font-size, letter-spacing 0.12em, word-spacing 0.16em. |
| 1.4.13 | Content on Hover or Focus | AA | Hover/focus tooltips are dismissible, hoverable, persistent. |

## Layer 4 — Screen reader experience

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 1.3.1 | Info and Relationships | A | (See Layer 1) — programmatic relationships are what screen readers consume. |
| 2.4.2 | Page Titled | A | Each page has a descriptive title. SPAs update `document.title` on route change. |
| 2.4.4 | Link Purpose (In Context) | A | Link text + surrounding context describes the destination. |
| 2.4.9 | Link Purpose (Link Only) | AAA | Link text alone describes destination. |
| 3.1.1 | Language of Page | A | `<html lang="en">` set. |
| 3.1.2 | Language of Parts | AA | Foreign-language passages have `lang` attribute. |
| 3.2.1 | On Focus | A | Focusing an element does not trigger a context change (no auto-navigate on focus). |
| 3.2.2 | On Input | A | Changing an input value does not trigger context change without warning. |
| 3.2.3 | Consistent Navigation | AA | Repeated nav appears in the same relative order across pages. |
| 3.2.4 | Consistent Identification | AA | Components with the same function are identified consistently. |
| 4.1.2 | Name, Role, Value | A | (See Layer 1) — custom widgets need correct ARIA. |
| 4.1.3 | Status Messages | AA | (See Layer 1) — toasts/alerts use `role="status"` / `role="alert"`. |

## Layer 5 — Cognitive + motor (WCAG 2.2 emphasis)

### Cognitive load

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 2.2.1 | Timing Adjustable | A | Timeouts can be extended, adjusted, or turned off. |
| 2.2.2 | Pause, Stop, Hide | A | Motion > 5s can be paused. Auto-updating content can be paused. |
| 2.3.1 | Three Flashes or Below | A | No content flashes more than 3x per second. |
| 2.5.3 | Label in Name | A | Visible label text is part of accessible name (so voice control "Submit" hits the "Submit" button). |
| 3.2.5 | Change on Request | AAA | Context changes only on user request, or a mechanism is available to turn them off. |
| 3.2.6 | Consistent Help **[2.2]** | A | If a help mechanism exists across pages, it's in the same place. |
| 3.3.1 | Error Identification | A | Errors are identified in text. |
| 3.3.3 | Error Suggestion | AA | Suggestions for fixing errors are provided. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | Reversible / confirmed / verified for legal/financial actions. |
| 3.3.7 | Redundant Entry **[2.2]** | A | User isn't asked to re-enter info in the same session. Autocomplete + prefill. |
| 3.3.8 | Accessible Authentication (Minimum) **[2.2]** | AA | Does not require a cognitive function test (puzzle, captcha) without alternative. |
| 3.3.9 | Accessible Authentication (Enhanced) **[2.2]** | AAA | Stronger: no cognitive test at all. |

### Motor

| # | Criterion | Level | What to check |
| --- | --- | --- | --- |
| 2.5.1 | Pointer Gestures | A | Multi-point or path-based gestures have a single-point alternative. |
| 2.5.2 | Pointer Cancellation | A | Down-event doesn't trigger; up-event triggers (gives the user a chance to cancel). |
| 2.5.4 | Motion Actuation | A | Functionality triggered by device motion (shake, tilt) has a UI alternative + can be disabled. |
| 2.5.5 | Target Size (Enhanced) | AAA | Targets are at least 44×44 CSS px. |
| 2.5.7 | Dragging Movements **[2.2]** | AA | Drag operations have a single-pointer alternative (click/tap). |
| 2.5.8 | Target Size (Minimum) **[2.2]** | AA | Targets ≥ 24×24 CSS px, OR have 24px spacing. Icon-only buttons at 16x16 fail. |

---

## Quick triage

When you're under time pressure and can only check 10 things, in order:

1. Keyboard reachability + visible focus on every interactive element (2.1.1, 2.4.7)
2. Form labels present + linked (1.3.1, 3.3.2)
3. `<h1>` exists; heading order doesn't skip levels (1.3.1)
4. Color contrast on body text (1.4.3) and UI components (1.4.11)
5. Alt text on images (1.1.1)
6. Page has `<lang>` (3.1.1) + descriptive `<title>` (2.4.2)
7. Modal traps focus + Esc closes + focus returns (2.4.3, 2.1.2)
8. Status messages announce (`role="status"` / `role="alert"`) (4.1.3)
9. Target size ≥ 24×24 or 24px spacing (2.5.8 — new in 2.2)
10. Authentication doesn't require a cognitive test (3.3.8 — new in 2.2)

These 10 catch ~75% of real-world failures. The full pass catches the rest.

## Tooling reference

| Tool | Best for | Limitations |
| --- | --- | --- |
| axe-core / jest-axe / @axe-core/playwright | CI gate; catches programmatic violations | ~30% coverage of total criteria |
| WAVE (browser extension) | Visual overlay; structure inspection | Manual; one page at a time |
| Lighthouse | Quick page-level a11y score | Subset of axe-core; misses cognitive criteria |
| VoiceOver (macOS Cmd+F5) | Screen reader UX validation | The actual user experience — irreplaceable |
| NVDA (Windows, free) | Windows screen reader UX | Most used screen reader globally |
| Keyboard alone | Layer 2 + focus order | Free and fast; do this first |

Automated tooling is a floor, not a ceiling.
