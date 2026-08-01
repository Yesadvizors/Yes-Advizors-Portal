# YAV2 Portal V2 — Stage A — Supabase Support Request (DRAFT — NOT SENT)

> **STATUS: DRAFT ONLY. This request has NOT been sent to Supabase.** Sending requires separate explicit PJ
> authorisation. No Supabase access, no SQL executed, no credentials used in preparing this draft.
> **Target:** `yav2-dev` / ref `ogjrwemjefvccpyjwxuo`. **Explicitly NOT** V1/Production
> (`zcszesuvjrryxtigjglt`).

---

## Draft message

**Subject:** Request: correct one `supabase_admin`-owned default privilege in schema `public` (project
`ogjrwemjefvccpyjwxuo`, dev)

**Project ref:** `ogjrwemjefvccpyjwxuo` (project `yav2-dev`, a **development** project).
**This request concerns the dev project only. Do NOT apply anything to our production project.**

**Limited objective (one statement, defaults only):**
We are hardening the `anon` role. On existing tables we can already remove `anon`'s object-level privileges
ourselves as `postgres`. The remaining item is a **default privilege owned by `supabase_admin`** in schema
`public` that grants `anon` object-level privileges (`TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`) on
**future** tables created by `supabase_admin`. We want that single default corrected.

**Why our `postgres` role cannot do this ourselves:**
Our SQL-Editor / connection identity is `postgres`, which is **not a superuser** and **not a member of
`supabase_admin`**. `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin …` therefore returns a permission error
for us. We will **not** use `SET ROLE` or any privilege-escalation workaround; we are asking for the supported
method.

**Exact SQL we would like applied (schema `public` only):**
```sql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
```

**Expected result after the change:**
Zero `anon` object-level default rows for owner `supabase_admin` in schema `public`
(i.e. `[DEF-POST-A]` shows 0). The `postgres`-owned default and all existing-table grants are handled
separately by us and must be **unaffected**.

**Exact rollback SQL (if reversal is ever needed):**
```sql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon;
```

**What we are asking you to confirm in writing:**
1. Whether the **requested statement is supported** on this managed project.
2. Whether **Supabase Support can execute the exact statement** for us.
3. The **executing PostgreSQL role** that would run it.
4. Whether that role **owns, is a member of, or otherwise has sufficient authority over `supabase_admin`** to
   alter its default privileges (we understand project/dashboard ownership does not grant this).
5. The **exact audit evidence** you can provide (who executed, when, and the before/after default-ACL state).
6. Whether the **exact rollback statement** (above) can also be executed through the **same mechanism**.
7. Whether **any platform/managed service depends on these four `anon` object-level defaults** in `public`.
8. Whether changing **only `supabase_admin` defaults in `public`** has any **known managed-platform side
   effect**.
9. Whether **`graphql` and `graphql_public` defaults will remain untouched** by your action.
10. **Necessity check:** are any future tables in schema `public` created by `supabase_admin` (vs by
    `postgres`)? This tells us whether this default is a live risk or a latent one.

*(On rollback: we treat the exact-inverse `GRANT` executed via your mechanism as the primary rollback. We are
not relying on PITR as a privilege-level rollback.)*

**Strict scope — please do NOT change any of the following:**
- **No** schema other than `public` — specifically **leave `graphql` and `graphql_public` untouched** (we know
  `supabase_admin` also has `anon` defaults there; they are **out of scope**).
- **No** existing-table privileges (we handle those ourselves).
- **No** `postgres`-owned default privileges (we handle those ourselves).
- **No** data privileges (`SELECT/INSERT/UPDATE/DELETE`) — object-level only.
- **No** change to `authenticated` or `service_role`.
- **Only** the `anon` grantee, **only** the four object privileges above, **only** schema `public`, **only**
  the `supabase_admin` owner scope.
- **Only** project `ogjrwemjefvccpyjwxuo` (dev). **Not** our production project.

Thank you — please confirm the method and the reversibility before applying, and let us know what audit record
you can provide (who executed, when, and the before/after state).

---

## Internal notes (not part of the message)

- **Do not send** without separate PJ authorisation.
- On reply, capture: confirmed executing role/method, statement-level rollback (same-mechanism) confirmation,
  audit-evidence offer, platform-dependency/side-effect answers, `graphql`/`graphql_public` untouched
  assurance, and the necessity answer (confirmation item 10) — then feed A-1/A-5/A-7/A-8 of the Mandatory
  Execution Evidence.
- If Supabase proposes an alternative statement or method, **re-review** before any authorisation; do not
  accept scope expansion (no graphql/graphql_public, no existing tables, no data privileges, no Stage B).
- If Supabase declines, record Part B as a **KNOWN OPEN GATE** and escalate the necessity/scope decision
  (defer vs accept-as-residual) to PJ.
