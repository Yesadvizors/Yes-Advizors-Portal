# YAV2 Portal V2 — 0021–0024 Reconciliation — Evidence Capture Template

> PJ fills this in during the live SELECT-only run in **yav2-dev / `ogjrwemjefvccpyjwxuo`**.
> One section per block. Paste the raw result grid, then set the status label.
> Return the completed file to Claude/ChatGPT. **No client PII should ever appear** — the kit
> returns counts/booleans/catalog metadata only.

## Run header (fill first)

| Field | Value |
|---|---|
| Executor | PJ |
| Execution date/time (IST) — from `[A1]` | ______________________ |
| Confirmed Supabase project name | `yav2-dev` (confirm) ▢ |
| Confirmed project ref | `ogjrwemjefvccpyjwxuo` (confirm) ▢ |
| **PROJECT IDENTITY CONFIRMED (YES/NO)** | __________ |
| Kit file SHA-256 verified = `368e22d78d2cf92741c291d9e57a5cb4b5d715ab3cd54f7134c9c80be7a11860` | ▢ |
| Ran inside `SET TRANSACTION READ ONLY`? (optional) | YES / NO |

> If PROJECT IDENTITY CONFIRMED = NO → write `HOLD — PROJECT IDENTITY NOT ESTABLISHED` and stop.

Status label legend: **PASS** / **FAIL** / **NOT PRESENT** (optional/legacy object absent) /
**UNKNOWN** / **NOT VISIBLE** / **SKIPPED — PREREQUISITE NOT MET** (see Execution Guide §6, §6.1).

---

## Section A — Environment fingerprint

### [A1] Session identity
```
<paste result>
```
- executed_at_ist: ______________________  | run_as: __________ | **Label:** ______

### [A2] Server/version
```
<paste result>
```
**Label:** ______

### [A3] Server address
```
<paste result>
```
**Label:** ______ (NULL is acceptable)

### [A4] Installed extensions
```
<paste result>
```
**Label:** ______

### [A5] Operator confirmation gate
- Editor header reads `yav2-dev` / `ogjrwemjefvccpyjwxuo`? **YES / NO**
- **Label:** ______ (must be PASS to continue)

---

## Section B — Migration-ledger visibility

### [B1] `supabase_migrations` schema present?
```
<paste result — or "0 rows" / permission error>
```
**Label:** PASS / NOT VISIBLE — ______

### [B2] `schema_migrations` columns
```
<paste result / error>
```
**Label:** ______

### [B3] Ledger entries (0021–0024?)
```
<paste result / "not run — ledger absent">
```
- Entries referencing 0021/0022/0023/0024: __________
- **Label:** ______  (absence ≠ non-application)

### [B4] Object-existence provenance fallback
```
<paste result>
```
- svc_catalogue_present: ___ | csa_present: ___ | rpc_create_present: ___
- **Label:** ______

---

## Section C — Object inventory 0021/0022

| Block | What | Result summary | Label |
|---|---|---|---|
| [C1] | P5 tables PRESENT/MISSING + owner | | |
| [C2] | CSA + catalogue columns | | |
| [C3] | Named constraints (7 expected) | | |
| [C4] | Indexes on P5 tables | | |
| [C5] | Triggers (expect none) | | |
| [C6] | Table comments | | |
| [C7] | service_catalogue count (expect 11) + codes | | |
| [C8] | 4 applicability audit events | | |

Paste raw grids:
```
[C1] <paste>
[C2] <paste>
[C3] <paste>
[C4] <paste>
[C5] <paste>
[C6] <paste>
[C7] <paste>
[C8] <paste>
```

---

## Section D — Functions (P5 / P6 / T4)

### [D1] Function metadata (owner/security/volatility/search_path)
```
<paste result>
```
**Label:** ______

### [D2] P5 RPC definitions + `has_other_notes_guard_0022`
```
<paste result — note has_other_notes_guard_0022 for create & update>
```
- create guard: ___ | update guard: ___ | **Label:** ______

### [D3] get_current_fy + generator definitions
```
<paste result>
```
**Label:** ______

### [D4] EXECUTE-grant matrix per role
```
<paste result — flag ANY anon/service_role TRUE on Group A/B, any PUBLIC>
```
- Any Group A helper executable by anon/authenticated/service_role? ___
- Any Group B PUBLIC/anon EXECUTE? ___
- **Label (0023):** ______

### [D5] PUBLIC EXECUTE via aclexplode
```
<paste result — public_has_execute must be false for all>
```
- Any `public_has_execute = true`? ___ | Any `acl_is_default_null = true`? ___
- **Label:** ______

### [D6] 0024 search_path of 3 helpers
```
<paste result — hardened_0024 must be true for all 3>
```
- get_portal_role: ___ | is_active_user: ___ | is_admin_or_manager: ___
- **Label (0024):** ______

---

## Section E — RLS / FORCE RLS

| Block | What | Result | Label |
|---|---|---|---|
| [E1] | RLS + FORCE flags (protected set) | | |
| [E2] | Policies (protected tables) | | |
| [E3] | Table grants (protected tables) | | |
| [E4] | Sequence privileges | | |

```
[E1] <paste — confirm forced=true on the 14 FORCE tables incl. both P5 tables>
[E2] <paste>
[E3] <paste — confirm no write grant to authenticated on CSA>
[E4] <paste>
```

---

## Section F — Compliance Tracker grants & posture

| Block | What | Result | Label |
|---|---|---|---|
| [F1] | Tracker/calendar grants per role | | |
| [F2] | Tracker RLS/FORCE + policy cmds | | |
| [F3] | anon exposure sweep (expect 0 rows) | | |

```
[F1] <paste>
[F2] <paste>
[F3] <paste — MUST be empty>
```

---

## Section G — Financial years

### [G1] All FY rows
```
<paste — labels/ranges/flags>
```
### [G2] Derived current FY (pure SELECT)
```
<paste — expect exactly 1 row>
```
derived_current_fy: __________
### [G3] Uniqueness/integrity counts
```
<paste — is_current=1, date_covered=1, dup=0, malformed=0>
```
### [G4] Continuity/overlap (expect 0 rows)
```
<paste>
```
### [G5] Flag vs date-derived consistency
```
<paste — both equal>
```
**Section G Label:** ______

---

## Section H — P5 Service Applicability data

| Block | What | Result | Label |
|---|---|---|---|
| [H1] | CSA counts by status | | |
| [H2] | service_code × status distribution | | |
| [H3] | Orphan/contradictory (all expect 0) | | |
| [H4] | Cross-client registration (expect 0) | | |
| [H5] | Duplicate live grain (expect 0) | | |

```
[H1] <paste>  [H2] <paste>  [H3] <paste>  [H4] <paste>  [H5] <paste>
```

---

## Section I — P6 generators

| Block | What | Result | Label |
|---|---|---|---|
| [I1] | ceiling calls get_current_fy (expect true) | | |
| [I2] | upper 2025-26 ceiling (expect false) | | |
| [I3] | fail-loud no_data_found (expect true) | | |
| [I4] | start-anchor distinct | | |
| [I5] | generated FY coverage | | |

```
[I1] <paste>  [I2] <paste>  [I3] <paste>  [I4] <paste>  [I5] <paste>
```

---

## Section J — P6A backend dependency

### [J1] P6A backend-fact bundle
```
<paste — live_current_fy, max_active_fy, has_active_fy_beyond_2025_26=true, any_generator_capped_2025_26=false>
```
### [J2] Deployed generator fingerprints
```
<paste — ceiling_from_get_current_fy=true; record md5>
```
**Section J Label:** ______

---

## Section K — G-11 non-impact & protected counts

### [K1] MANDATORY core counts (all governed, expected present)
```
clients=___ team=___ service_catalogue=___ client_service_applicability=___ client_persons=___ client_remediation_flags=___
```
### [K1b] OPTIONAL / LEGACY — client_directors (absent → NOT PRESENT, not FAIL)
```
client_directors_legacy=___   Label: PRESENT(count) / NOT PRESENT
```
### [K2] MANDATORY tracker/calendar counts
```
accounting_tracker=___ financials_tracker=___ income_tax_tracker=___ compliance_calendar=___ tasks=___
```
### [K3] MANDATORY audit counts
```
audit_event_contract=___ audit_log=___ audit_ingestion_failures=___ financial_years=___
```
### [K4] View existence
```
v_team_workload_present=___ (expect false) v_firm_dashboard_present=___ v_client_compliance_summary_present=___ v_overdue_ageing_present=___
```
**Guard baselines (NOT mechanical equality — see Execution Guide §6.2):**
- **FROZEN (exact match required):** service_catalogue 11 · client_persons 0 · client_remediation_flags 0 · accounting_tracker 312 · financials_tracker 120 · income_tax_tracker 26 · compliance_calendar 0
- **Guard (growth OK; a DROP is the concern):** clients ~13 · team ~8 · client_service_applicability ~4 · audit_event_contract ~24 · audit_log ~33 · financial_years (horizon-maintained)
- Rule: higher → usually PASS (legitimate growth); lower → INVESTIGATE; FROZEN → exact or FAIL.

**Section K Label:** ______  (note any DROP or any FROZEN-row change in the Discrepancy Register)

---

## Section L — Integrity & anomaly sweep

| Block | What | Result (rows) | Label |
|---|---|---|---|
| [L1] | Protected tables missing FORCE (expect 0) | | |
| [L2] | PUBLIC EXECUTE functions (T4 helpers must be absent) | | |
| [L3] | DEFINER fns unpinned search_path (0024 targets must be absent) | | |
| [L4] | P5 RPC overloads (expect 1 each) | | |
| [L5] | Object counts snapshot | | |
| [L6] | Applicability→inactive-code refs (expect 0) | | |

```
[L1] <paste>  [L2] <paste>  [L3] <paste>  [L4] <paste>  [L5] <paste>  [L6] <paste>
```

---

## Run summary (fill last)

| Section | Overall label | Notes |
|---|---|---|
| A Environment | | |
| B Ledger | | |
| C Objects 0021/0022 | | |
| D Functions | | |
| E RLS/FORCE | | |
| F Tracker posture | | |
| G Financial years | | |
| H P5 applicability | | |
| I P6 generators | | |
| J P6A backend | | |
| K Protected counts | | |
| L Integrity sweep | | |

**Blocks not runnable (UNKNOWN/NOT VISIBLE):** ______________________
**Any FAIL blocks:** ______________________
**Confirmation — zero writes made, no commit/push/deploy performed:** ▢
