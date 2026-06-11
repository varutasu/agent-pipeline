# Design critique — {{convoy_slug}} / brief-{{brief_n}}

**Reviewer:** role-ux-reviewer
**Convoy:** {{convoy_slug}}
**Brief / commit:** {{brief_n}} / `{{commit_sha}}`
**Date:** {{YYYY-MM-DD}}
**Frameworks:** Nielsen's 10 heuristics + UX laws (Yablonski + Norman)
**Surface:** {{e.g. "Checkout flow — /cart through /confirmation"}}

## User goal (one sentence)

> {{e.g. "Complete a purchase from cart to confirmation in ≤ 90 seconds without leaving the page."}}

If you can't write this in one sentence, the surface is doing too much. Note that as finding #1.

## Score summary

| # | Heuristic | Score (1-5) | Rationale (one sentence) |
| --- | --- | --- | --- |
| H1 | Visibility of system status | 3 | Loading states present but inconsistent across steps. |
| H2 | Match system / real world | 4 | Plain language throughout; minor jargon in shipping options. |
| H3 | User control + freedom | 2 | No back button after payment screen; cancel ambiguous. |
| H4 | Consistency + standards | 4 | Buttons + inputs consistent; one non-standard date picker. |
| H5 | Error prevention | 3 | Inline validation present, but quantity field allows negatives. |
| H6 | Recognition over recall | 4 | Saved addresses + payment methods surface correctly. |
| H7 | Flexibility + efficiency | 2 | No keyboard shortcuts; no autofill for repeat buyers. |
| H8 | Aesthetic + minimalist | 4 | Clean hierarchy; primary CTA dominant. |
| H9 | Help users recover | 3 | Generic "Payment failed" instead of specific cause. |
| H10 | Help + documentation | 2 | No contextual help; FAQ is two clicks away. |

**Total: 31 / 50**

## Walk: happy path (steps 1-2)

{{Step-by-step walkthrough from entry to goal. One paragraph per step. Cite H1/H2/H4 issues inline.}}

Example:

1. **Cart → Checkout button click.** Visible "Continue to checkout" CTA, dominant size + color. ✅ (H4, L7 Fitts's Law). However, no indication of how many steps remain (H1 violation).
2. **Address step.** Saved addresses auto-suggested — good (H6). But "address line 2" placeholder doubles as the label (H2 violation — placeholder is not a label; a11y issue too — see a11y audit).
3. **...**

## Walk: error paths (step 3)

{{Deliberately fail at each step. What does the user see + can they recover?}}

Example:

- **Decline credit card.** Message: "Your card was declined" — generic. *H9 finding (sev 3, score 2/5):* Stripe returns specific decline codes; surface "Your bank declined — try a different card" instead. Doesn't lose entered data ✅.
- **Wrong CVC.** Inline validation correctly catches before submit. ✅ (H5).

## Control + freedom (step 4)

- **After payment screen, no back arrow.** *H3 finding (sev 4, score 1/5):* user cannot return to address step without abandoning + restarting. Breaks "User control and freedom" on the critical path.
- **Cancel CTA on payment screen labeled "Cancel" but action is "Abandon order."** Ambiguous (H2 + H3).

## Cognitive load (step 5)

- **Shipping options page shows 12 options** in a flat list. *L18 Miller's Law violation:* group by speed (Standard / Express / Overnight) — 3 groups of 4. *L10 Hick's Law:* decision time too long for a 90s flow.
- **Optional fields not marked.** *L5 Cognitive Load:* user must inspect each field to decide if it's required. Add "(optional)" suffix on optional fields.

## Flexibility (step 6)

- **No keyboard shortcuts.** Heavy customers (10+ purchases / month) would benefit from `Cmd+Enter` to submit. *H7 finding (sev 2, score 2/5).*
- **No bulk re-order from order history.** *H7 finding (sev 2, score 2/5).*

## Heuristic sweep (step 7)

Findings caught in the sweep, not by the targeted steps above:

- **H4 (sev 3, score 2/5):** Date picker is custom; doesn't match the OS picker. Mobile users get a non-standard experience.
- **H8 (sev 1, score 4/5):** Promotional banner above the main CTA competes for attention. Move below the fold or remove for this flow.

## Emotional + brand pass (step 8)

- **Success state ("Order confirmed")** uses a small toast that auto-dismisses in 3 seconds. *L22 Peak-End Rule:* the END of the experience is undersold. Recommend a dedicated confirmation page with: order #, delivery ETA, what's next ("we'll email when it ships"), and a clear next action.
- **Failure copy is blame-y** ("Your payment failed") rather than apologetic ("We couldn't complete this — your card wasn't charged"). Adjust per `skills/ux-writing` (wave 1c).

## Synthesis (step 9)

### 3 things to fix immediately

1. **H3 sev 4** — Add a "Back to address" button on the payment screen. (1 line of nav.)
2. **L18 sev 3** — Group shipping options by speed. (15 minutes of refactor.)
3. **H9 sev 3** — Surface specific Stripe decline codes. (Half a day of mapping + copy.)

### 1 thing to reconsider at the design-system level

The "decline / failure / generic error" pattern recurs across at least 4 flows (checkout, sign-up, password reset, account update). Each rolls its own copy. Recommend a `failure-state` primitive in the DS that takes a cause-code + suggests a fix — see `role-design-system-auditor` follow-up.

## Severity ≥ 3 findings → child tasks

Phase 2b: each row below becomes a child `task` under this critique `document`.

- [ ] **H3 sev 4** — Back button on payment screen
- [ ] **H9 sev 3** — Specific decline code copy
- [ ] **L18 sev 3** — Group shipping options
- [ ] **H4 sev 3** — Replace custom date picker with native

## Severity < 3 findings (inline only)

- **H7 sev 2** — Keyboard shortcuts on checkout (defer; low traffic)
- **H7 sev 2** — Bulk re-order from history (defer; nice-to-have)
- **H10 sev 2** — Contextual help affordance (defer; tracking shows low FAQ usage)

## Sign-off

- [ ] Severity-4 items fixed before merge
- [ ] Severity-3 items either fixed or scheduled as follow-up convoys
- [ ] DS-level pattern (`failure-state` primitive) handed to `role-design-system-auditor`
- [ ] Reviewer: role-ux-reviewer (`{{commit_sha}}`)
