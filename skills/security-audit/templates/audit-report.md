# Security audit — {{convoy_slug}} / brief-{{brief_n}}

**Reviewer:** role-security-auditor
**Convoy:** {{convoy_slug}}
**Brief / PR:** {{brief_n}} / {{pr_number_or_draft}}
**Date:** {{YYYY-MM-DD}}
**Diff scope:** {{files_changed_count}} files

## Executive summary

- {{bullet 1 — overall risk posture}}
- {{bullet 2 — highest severity finding or "no sev ≥ 3"}}
- {{bullet 3 — auth/IDOR/injection/deps headline}}

## Findings

| Sev | Layer | Surface | Issue | Fix |
| --- | --- | --- | --- | --- |
| 4 | L2 AuthZ | `app/api/foo/route.ts:42` | IDOR: `userId` from path not checked against session | Add `if (session.user.id !== params.id) return forbidden()` |
| 2 | L3 Input | `app/api/bar/route.ts:18` | Body not validated | Add Zod schema per `api-routes.mdc` |

### Severity ≥ 3 detail

{{Expand each sev 3–4 with exploit scenario + suggested patch.}}

### Patterns (optional)

{{One row if the same mistake appears 3+ times.}}

## Automated checks

| Check | Result |
| --- | --- |
| `npm audit` (high+) | {{pass / N findings}} |
| Hardcoded secret grep | {{pass / findings}} |

## Approval recommendation

- [ ] **approve** — no sev ≥ 3; sev 2 acceptable with notes
- [ ] **request-changes** — sev ≥ 3 open
- [ ] **comment-only** — informational
