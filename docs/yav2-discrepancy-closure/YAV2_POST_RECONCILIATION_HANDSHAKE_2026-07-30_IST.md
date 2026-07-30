# YAV2 Portal V2 — Post-Reconciliation Handshake

**Date:** 2026-07-30 (IST) · **Prepared by:** Claude (authoring only; no live execution)
**Final decision:** **PASS WITH SPECIFIC CORRECTIONS** — three original discrepancies reconciled; one new
object-level hardening item carried separately.

---

## 1. Governing references

| Item | Value |
|---|---|
| Governing repository | `Yesadvizors/Yes-Advizors-Portal` |
| Governing baseline commit | `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5` |
| Governing branch | `sync/integration` |
| **Authorised** Supabase target | **`yav2-dev` / ref `ogjrwemjefvccpyjwxuo`** (V2 / dev) |
| **Prohibited** Supabase target | **V1 / Production / ref `zcszesuvjrryxtigjglt`** — never accessed |
| Live execution | **2026-07-30 11:15 IST**, SELECT-only, executed by **PJ** (Claude executed nothing) |
| Live evidence file | `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_2026-07-30_1115_IST.json` |

---

## 2. Final findings (live-confirmed)

**Environment:** 39 tables · 3 views · 51 functions · current FY = **2026-27**.

### 2.1 Grant posture (Area 1) — row-level sound; object-level residual raised
- **All 39 tables RLS-enabled.** **[G5] anon/PUBLIC policies = 0.** **[G6] legacy `*_authenticated_all` = 0.**
- **anon/authenticated cannot CREATE in `public`.** **service_role `BYPASSRLS` confirmed** (secret-handling control).
- **11 tables anon-revoked** (9 M1-A + 2 P5) · **28 tables RLS-mitigated** (20 operational + 5 dependency + 3 audit).
- Broad default table grants to anon/authenticated/service_role are of **likely platform/default-environment
  origin** (no repo grant statement; `pg_default_acl` = supporting evidence only; historical provenance not
  conclusively available from current catalog evidence).
- **NEW HIGH:** 28 tables grant anon **object-level** `TRUNCATE / REFERENCES / TRIGGER / MAINTAIN` (PG-17),
  which **RLS does not mediate** → residual **R-ANON-OBJECT-PRIVILEGES**. **Not** asserted exploitable
  (no runtime evidence).

### 2.2 Tracker variance (Area 2) — **CLOSED**
- Totals **360 / 135 / 29 / 0**; pairs **30 / 27 / 29** (`360=30×12`, `135=27×5`, `29=29×1`).
- **[T4]** no off-grain groups · **[T5]** exactly **1** accounting-only pair (0 income-tax-only) ·
  **[T6]** calendar/GST/GSTIN = **0/0/0** · **[T7]** FY **2026-27**.
- Counts reflect **complete, legitimate generation**; duplicate/partial/off-grain excluded. No row modified.

### 2.3 SECURITY DEFINER search_path (Area 3) — **CLOSED**
- All 10 functions pin `search_path = public, pg_temp`; **live setting matches the governing repository
  setting**; no divergence (setting comparison, not a normalized full-definition diff).
- Future hardening (retained, non-urgent): pin `pg_catalog` first.

---

## 3. Residual security / hardening register

| ID | Severity | Item | Status | Action |
|---|---|---|---|---|
| **R-ANON-OBJECT-PRIVILEGES** | **HIGH** | anon holds `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` on 28 tables; RLS does not mediate | OPEN | Proposal deliverable #9 → **separate PJ approval** |
| R-SVC | Medium | service_role broad grant + `BYPASSRLS` (RLS-irrelevant) | OPEN | Secret-handling; deployment/client-bundle audit |
| R-OWN | Low→Med | 28 tables RLS `ENABLE` not `FORCE` → owner bypass | OPEN | Future `FORCE RLS` (PJ) |
| R-ANON-DATA | Low | 28 tables rely on policy-absence, not explicit anon `REVOKE` of S/I/U/D | OPEN | Folded into deliverable #9 |
| R-SP | Low | 10 fns pin `public` before `pg_catalog` | OPEN | Future repin (PJ) |
| R-G05 | HIGH (pre-existing) | PUBLIC/anon EXECUTE on role helpers (17 fns) | OPEN | Separate remediation track |
| R-C-COND | — | Legacy-open / anon policy / RLS-off | **RESOLVED** (live [G6]=0, [G5]=0, RLS all 39) | none |
| R-TRK | — | +1 accounting-only pair | **RESOLVED** (live [T5]=1, on-grain) | none |

None of the OPEN items is remediated here; each requires separate PJ authorisation.

---

## 4. Completion estimate

**Current completion estimate: 78–79%.**

Rationale (qualitative): the V2 data/security foundation is verified live (schema, RLS on all 39 tables,
role model, definer search_path, tracker generation reconciled). Remaining before a production-ready posture:
the **R-ANON-OBJECT-PRIVILEGES** hardening and the other OPEN residuals (R-SVC/R-OWN/R-SP/R-G05), storage
(S5) live proof, edge-function deployment state, and the P6A/PR #35 frontend line — none of which is
authorised for change in this task.

---

## 5. Next authorised development stage

**Next authorised action:** a **separate PJ decision** on the **R-ANON-OBJECT-PRIVILEGES** hardening proposal
(deliverable #9). If approved, it proceeds as an explicitly-authorised migration (anon object-privilege
`REVOKE` + default-privilege correction) with regression verification and rollback — **outside** this
read-only closure. This preservation task ends at a **Draft PR**; nothing beyond it is authorised here.

---

## 6. Explicit authorisation boundary

The following remain **UNAUTHORISED** and were **not** performed:

- **Normal team use** of the environment.
- **Production / V1** access (`zcszesuvjrryxtigjglt`).
- Any **migration** (create or run) or **live privilege** change (REVOKE/GRANT/ALTER/DDL/DML).
- **Merge** of any branch or **deployment**.
- Modifying **PR #35** or marking it ready.

GitHub remains the permanent source of truth. This closure is preserved via a **Draft PR only**
(`verification/yav2-discrepancy-closure-final`); it is **not** merged and **not** deployed.
