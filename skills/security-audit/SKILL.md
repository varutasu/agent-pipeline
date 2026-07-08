---
name: security-audit
description: >-
  Run an application-security audit on a code diff or surface. Produces a
  severity-ranked findings report keyed to OWASP-style categories (authZ,
  injection, secrets, IDOR, SSRF, dependencies). Use when role-security-auditor
  is invoked, when the user asks for a security review, before merging
  auth/API/data convoys, or whenever a change touches authentication,
  authorization, API routes, middleware, env config, or user-controlled input.
  Skip if `skip: security` is set in the convoy or the change is docs-only
  with no executable code.
---

# Security audit

Six-layer audit framework for **application code** (not infra/IAM — those are separate convoys). Outputs a severity 0–4 findings list, an executive summary, and fix suggestions with file:line citations. Deep reference: `references/owasp-checklist.md`.

## When to invoke

- **Automatic:** by `role-security-auditor` on every PR draft except when `skip: security` is set.
- **Manual:** when the user says *"security review"*, *"audit this for vulnerabilities"*, or before merging auth/API/schema convoys.
- **Pre-merge:** audit fan-out — `/multitask role-reviewer + role-security-auditor + role-design-system-auditor + role-a11y-auditor`.

## Severity scale

| Severity | Meaning | Treatment |
| --- | --- | --- |
| **4 — Critical** | Exploitable without unusual conditions: auth bypass, secret in client bundle, SQL/command injection on user input, IDOR on another user's data. | Block merge. |
| **3 — High** | Serious weakness requiring attacker effort or specific config: missing rate limit on auth, weak session TTL, missing auth on non-public route, mass assignment. | Fix before merge unless documented exception in convoy. |
| **2 — Medium** | Defense-in-depth gap: verbose error leaks stack trace, missing security headers, log line includes PII. | Fix or track; recommend before next release. |
| **1 — Low** | Hardening opportunity: inconsistent auth helper usage, missing Zod on low-risk query param. | Inline in report. |
| **0 — Info** | Note for maintainer; not a defect. | Inline only. |

## The 6 layers

Run in order. Stop early only if the diff is literally comment-only.

### Layer 1 — Authentication boundary

Every protected route and server action must identify the caller before doing work.

- New or changed API routes / server actions: is there an auth gate (`requireAuth`, `auth()`, session check, Bearer verify)?
- Auth endpoints: rate limiting present? (`checkAuthRateLimit` or equivalent)
- No synthetic-admin / dev-bypass fallbacks in production paths
- JWT/session: secret from env (fail-loud if unset), reasonable TTL, not in client bundle
- Password handling: hashed (bcrypt/argon2), never logged, never returned in API responses

### Layer 2 — Authorization (IDOR / tenancy)

Authentication ≠ authorization. Check resource ownership on every read/write.

- Every query scoped by `userId` / `tenantId` / collection permission — not just "user is logged in"
- Path params (`/api/users/:id`) validated against session identity
- Admin routes use dedicated guard (`requireAdmin`, `withAdmin`) — not inline role string compare copy-pasted
- Public vs private resources: `is_public` / share links cannot leak other users' data

### Layer 3 — Input validation & injection

All user-controlled input validated at the boundary.

- Request bodies: Zod/schema validation (or repo equivalent) — no trusting `req.body` shape
- SQL: parameterized queries / ORM — no string concatenation with user input; no `sql.unsafe` with user data
- Shell commands: no `exec`/`spawn` with user input; no `eval`
- HTML/XSS: no `dangerouslySetInnerHTML` without sanitization; no reflecting raw user input in responses
- File upload: type/size limits, storage path not user-controlled

### Layer 4 — Secrets & sensitive data

- No API keys, tokens, passwords in source, comments, or client bundles
- `.env` values not committed; no `NEXT_PUBLIC_*` for secrets
- Logs: no passwords, tokens, full credit card numbers, or session cookies
- Error responses: generic message to client; details server-side only

### Layer 5 — Dependencies & supply chain

- Run `npm audit` / `pnpm audit` when Shell is available; surface high/critical in report
- New dependencies: justified? Known risky packages?
- Pin or review major version bumps on auth/crypto libraries

### Layer 6 — Transport & headers (when diff touches middleware / next.config / server)

- Cookies: `HttpOnly`, `Secure`, `SameSite` where applicable
- CORS: no wildcard `*` on authenticated APIs unless explicitly documented
- Security headers: CSP, X-Frame-Options / frame-ancestors where relevant

## Steps

1. **Scope read.** `git diff` + brief `files:` list. Flag any file outside scope as Critical (scope expansion).
2. **Read repo auth rules.** `.cursor/rules/auth-patterns.mdc`, `api-routes.mdc`, `AGENTS.md` auth section — match repo conventions, don't invent new ones.
3. **Layer pass 1 → 6.** For each finding: category, severity, file:line, exploit scenario (one sentence), fix (verbatim diff when possible).
4. **Automated sweep (optional).** `npm audit --json`, `grep` for `dangerouslySetInnerHTML`, `eval(`, hardcoded `sk-`, `password\s*=`.
5. **Report.** Fill `templates/audit-report.md`. Post as `## Security Audit` PR comment (exact header — rollup CI parses it).
6. **Hand off:** *"Security audit complete. N findings (sev ≥ 3: M). Recommend fixing sev ≥ 3 before merge."*

## Anti-patterns

- Marking style nits as Critical — credibility matters.
- Auditing without reading the brief — scope expansion is the first check.
- Recommending auth patterns the repo doesn't use — read `auth-patterns.mdc` first.
- Skipping layer 2 because "route requires login" — IDOR lives here.

## References

- `references/owasp-checklist.md` — expanded checklist by layer.

## Output template

- `templates/audit-report.md` — fillable report for PR comment or `.convoys/<slug>/audits/security-<timestamp>.md` mirror.
