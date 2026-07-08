# OWASP-aligned security checklist (agent reference)

Cite the **layer + item** in findings (e.g. "Layer 2 — IDOR"). Not a substitute for penetration testing.

## Layer 1 — Authentication

- [ ] All non-public API routes call a shared auth helper
- [ ] Login/register/forgot-password rate limited
- [ ] Session/JWT secret from environment; app fails start if missing
- [ ] No long-lived tokens in `localStorage` without documented threat model
- [ ] Password reset tokens single-use + short TTL
- [ ] No credentials in URLs or query strings

## Layer 2 — Authorization

- [ ] Resource IDs in path/body checked against session user/tenant
- [ ] List endpoints filter by ownership — no "return all rows"
- [ ] Admin operations behind explicit admin guard
- [ ] Role checks use server-side source of truth (DB), not client-only flags
- [ ] Bulk operations cannot target arbitrary user IDs

## Layer 3 — Input & injection

- [ ] All POST/PATCH/PUT bodies validated with schema
- [ ] Query params validated/coerced (Zod `z.coerce` or explicit parse)
- [ ] ORM/raw SQL uses parameters only
- [ ] No `dangerouslySetInnerHTML` without DOMPurify or equivalent
- [ ] File paths constructed server-side; no `../` from user input
- [ ] SSRF: server-side fetch URLs not user-controlled to internal IPs

## Layer 4 — Secrets & data

- [ ] No secrets in git history in this diff
- [ ] `NEXT_PUBLIC_` prefix only on truly public values
- [ ] PII minimized in logs and analytics events
- [ ] API responses omit internal IDs when unnecessary

## Layer 5 — Dependencies

- [ ] No new high/critical `npm audit` findings introduced
- [ ] Auth/crypto libs from reputable sources, pinned versions

## Layer 6 — Transport & config

- [ ] Auth cookies: Secure + HttpOnly
- [ ] CORS allowlist explicit for API routes
- [ ] Webhook endpoints verify signatures
