# T4 Remediation — Evidence Template (to be filled by PJ on V2, read-only capture)

Environment: V2 / yav2-dev `ogjrwemjefvccpyjwxuo`. Tag every capture `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` + timestamp. No secrets.

## 0. Pre-flight
- [ ] Dashboard shows project ref `ogjrwemjefvccpyjwxuo` (screenshot).

## 1. PRE snapshots (before any change)
- [ ] `PRE-2` grantees of the 17 (paste output) — baseline shows PUBLIC+anon on all 17.
- [ ] `PRE-3` Group-A caller check (paste output) — **must be empty** to revoke authenticated from Group A.
- [ ] `PRE-4` search_path of the 3 helpers (paste) — baseline `search_path=public`.

## 2. Apply 0023 (grants) — PJ authorised
- [ ] 0023 applied (transaction committed) — capture success/notice output.

## 3. POST 0023 verification
- [ ] `PRE-2` re-run: Group A → no PUBLIC/anon/authenticated; Group B → no PUBLIC/anon, authenticated present.
- [ ] `get_sensitive_audit_logs` authenticated_can_execute = true.

## 4. Apply 0024 (search_path) — PJ authorised
- [ ] 0024 applied.

## 5. POST 0024 verification
- [ ] `PRE-4` re-run: 3 helpers = `pg_catalog, public, pg_temp`.

## 6. Runtime smoke (T2/PJ, approved creds)
- [ ] Admin: Audit Log tab loads and returns data.
- [ ] Non-admin: Audit Log denied (server-enforced).
- [ ] No console/Network 42xxx/permission errors on dashboard/compliance.

## 7. Result
- [ ] All expected end-states met → G-05/V-5 CLOSED. Else → attach failing output + rollback decision.
