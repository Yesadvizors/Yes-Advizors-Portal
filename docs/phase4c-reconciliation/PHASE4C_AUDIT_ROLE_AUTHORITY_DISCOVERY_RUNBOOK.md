# YAV2 Portal V2 — Phase 4C — Audit Role Authority Discovery Runbook (yav2-dev only)

**Status:** runbook for a **read-only** discovery. **Claude performs no Supabase access and runs no SQL.** PJ (or
an authorised operator) runs the SELECT-only kit in `yav2-dev` and records the raw output.
**Kit:** `supabase/verification/YAV2_PHASE4C_AUDIT_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`.
**Governing base:** `sync/integration` @ `18df34cc8d949d6c0da5552571e7a66962eece2b`.

> **TARGET: `yav2-dev` / ref `ogjrwemjefvccpyjwxuo` ONLY.**
> **PROHIBITED: V1 / Production / `zcszesuvjrryxtigjglt`. If the editor header shows that ref — STOP, run nothing.**

---

## 1. Purpose

Confirm, before any Phase 4C implementation, whether the executing identity can **create and administer** the
two Phase 4C roles (`audit_owner`, `audit_writer`), whether they already exist, and the `service_role` platform
constraint. **No role is created and no privilege changed** — the kit is SELECT-only.

## 2. Pre-run checks (hard STOP on any failure)

- [ ] Supabase SQL Editor header shows **`yav2-dev` / `ogjrwemjefvccpyjwxuo`** — **NOT** `zcszesuvjrryxtigjglt`.
- [ ] You are running the **unmodified** kit file (hash it if in doubt).
- [ ] You will **paste the raw output verbatim** (no summarising/editing) for the record.

## 3. Execution

1. Open the Supabase **SQL Editor** on `yav2-dev`.
2. Paste the entire contents of `YAV2_PHASE4C_AUDIT_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`.
3. Run. It executes **seven SELECT statements** (`[P1]`–`[P7]`). It performs **no** DDL/DML/CREATE ROLE.
4. Capture the raw result of each block verbatim.

## 4. Expected outputs & interpretation

| Block | What it returns | Interpretation |
|---|---|---|
| `[P1]` | `current_user / session_user / current_role` | Expected `postgres` in `yav2-dev` (record the actual). |
| `[P2]` | current role attributes | `rolcreaterole` is decisive; `rolsuper` expected **false** (per Stage A). |
| `[P3]` | role memberships (`pg_has_role`) | Note membership of any privileged role. |
| `[P4]` | whether `audit_owner`/`audit_writer` already exist | Expected **absent** in a clean env (`already_exists = false`). |
| `[P5]` | `eligible_to_create_audit_roles`, roles-absent flags | **`true` + both absent → the identity can create the roles.** |
| `[P6]` | `service_role`/`anon`/`authenticated` attributes; membership | Confirms `service_role` is platform-managed (grant/revoke only). |
| `[P7]` | consolidated one-row summary | Single-row go/no-go for role creation. |

**GO condition:** `[P7] eligible_to_create_audit_roles = true` **and** `audit_owner_exists = false` **and**
`audit_writer_exists = false`.

## 5. Stop conditions (any one → STOP; escalate to PJ)

- Target is **not** `yav2-dev` / `ogjrwemjefvccpyjwxuo` (especially any Production/V1 ref).
- `[P5]/[P7] eligible_to_create_audit_roles = false` (identity cannot create roles) → escalate; treat like the
  Stage A authority gate (Supabase-supported mechanism / separate PJ decision).
- Either role **already exists** with unexpected attributes (`rolcanlogin = true`, `rolsuper = true`) → STOP;
  investigate before reuse.
- Current identity is unexpectedly a **member of `service_role`** or a superuser → STOP; confirm environment.
- Any result cannot be captured verbatim → STOP.

## 6. After the run

- Record the raw `[P1]`–`[P7]` output (verbatim) into a Phase 4C evidence note.
- If **GO**, the reconciled implementation (design doc §2) may be authored for a **separate** PJ authorisation.
- If **NO-GO**, record the blocker; do not attempt role creation by any escalation, `SET ROLE`, or workaround.

## 7. Absolute constraints

No Supabase mutation · no SQL beyond the SELECT-only kit · **no `CREATE ROLE`** · no privilege change · no
migration · no deployment · **no V1/Production**. Claude does not access Supabase; the operator runs the kit.
