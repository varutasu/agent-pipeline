# Design direction (convoy lock)

Copy into `.convoys/<slug>.md` as `## Design direction` after running the generator.
Also mirror key fields in convoy frontmatter `design_direction:` (see `role-ui-designer`).

---

## Summary

<!-- One sentence: who this is for and what it should feel like -->

## Pattern + style

| Field | Value |
| --- | --- |
| Product type | |
| Landing / app pattern | |
| UI style | |
| Stack notes | nextjs \| react \| … |

## Colors

| Role | Hex | Usage |
| --- | --- | --- |
| Primary | | |
| Secondary | | |
| CTA | | |
| Background | | |
| Text | | |

## Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display / heading | | |
| Body | | |

## Effects + motion

<!-- Shadows, transitions (150–300ms), hover rules -->

## Anti-patterns (do not ship)

-

## Pre-delivery checklist

- [ ] No emojis as icons (SVG: Lucide / Heroicons)
- [ ] `cursor-pointer` on clickable elements
- [ ] Hover/focus transitions
- [ ] Text contrast ≥ 4.5:1 (light mode)
- [ ] Keyboard focus visible
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375 / 768 / 1024 / 1440

## Conflict rule

**Repo design tokens win** when they disagree with this direction. File a convoy note if the lock should override tokens (rare — requires human approval).
