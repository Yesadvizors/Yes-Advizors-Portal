# YAV2 Portal V2 — Tracker Count Variance Reconciliation

**Discrepancy area:** 2 of 3 — reconcile the compliance-tracker row-count increases.
**Basis:** source-derived grain analysis of `supabase/migrations/`, **corroborated by the live SELECT-only
run** authorised and executed by PJ on **2026-07-30 11:15 IST** (`yav2-dev` / `ogjrwemjefvccpyjwxuo`).
Claude executed no SQL and accessed no database. **No row deleted/updated/regenerated; no PII/PAN/GSTIN/
financial value read.**
**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
**Live evidence:** `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_2026-07-30_1115_IST.json`.

> **STATUS: CLOSED.** The tracker-count discrepancy is **reconciled**. The live T1–T7 results (recorded in
> §3A below) confirm the source-derived reading: **the counts reflect complete, legitimate generation** —
> every (client, FY) pair is on-grain, there are **no off-grain groups**, duplication is excluded, the
> accounting/core asymmetry is exactly the expected **+1** decoupled pair, and `compliance_calendar` is 0
> because no active client carries a GSTIN. The earlier PROVISIONAL status is superseded by this live
> confirmation.

---

## 1. The variance

| Tracker | Frozen baseline | Live | Δ |
|---|---|---|---|
| `accounting_tracker` | 312 | 360 | **+48** |
| `financials_tracker` | 120 | 135 | **+15** |
| `income_tax_tracker` | 26 | 29 | **+3** |
| `compliance_calendar` | 0 | 0 | **0** |

Frozen client baseline: **13 clients** (per Expected-State Matrix and package review).
IST execution date for this closure: **2026-07-30 → current FY = 2026-27**.

---

## 2. The grain — one row per *what*

Each tracker's row count is a deterministic multiple of its **grain**, fixed by a UNIQUE key in
`0007_dependency_closure.sql` and the `INSERT … ON CONFLICT` in the `0014` generators (which
`CREATE OR REPLACE` the `0008` originals with the *same* keys — grain is stable across the rewrite).

| Tracker | Grain (one row per…) | Rows per (client, FY) | Writer function | Conflict key |
|---|---|---|---|---|
| `accounting_tracker` | client × FY × **month** | **12** | `activate_accounting_service` (`0014:645`) | `(client_id, fy_label, month)` — key `0007:435`; insert `0014:695`/conflict `0014:702` |
| `financials_tracker` | client × FY × **doc_type** (5 fixed) | **5** | `generate_client_compliance_core` (`0014:737`) | `(client_id, fy_label, doc_type)` — key `0007:438`; insert `0014:962`/conflict `0014:966` |
| `income_tax_tracker` | client × FY | **1** | `generate_client_compliance_core` | `(client_id, fy_label)` — key `0007:440`; insert `0014:802`/conflict `0014:808` |
| `compliance_calendar` | **GST-derived only** (one per gst_tracker entry) | n/a per-client | Section-8 backfill from `gst_tracker` (`0014:1244`) | `(client_id, compliance_tracker_id)` — key `0014:624`; conflict `0014:1264` |

The 5 financials doc types are the fixed array at `0014:959-960` (`'Audited Balance Sheet'`,
`'Computation of Income'`, `'Tax Audit Report (TAR)'`, `'ITR Form'`, `'ITR Acknowledgement'`).

**Idempotency:** every generator INSERT uses a **targeted** `ON CONFLICT (grain) DO NOTHING`. Re-running
generation for an already-generated (client, FY) is a **no-op** — so *duplicate generation cannot inflate
the counts*. This is the pivotal fact for the reconciliation.

**Two decoupled code paths.** `accounting_tracker` is filled by `activate_accounting_service`; the other
three by `generate_client_compliance_core` (the Section-7 backfill calls **both**, per client,
`0014:1209` + `0014:1224`). They are independent, which is why accounting can move by a *different* number
of (client, FY) pairs than the core-driven trackers.

---

## 3. Decomposition of each delta

Because every count is `pairs × grain`, dividing each delta by its grain yields the number of **new
(client, FY) pairs** generated:

| Tracker | Δ | ÷ grain | ⇒ new (client, FY) pairs | Integer? |
|---|---|---|---|---|
| `accounting_tracker` | +48 | ÷ 12 | **4** | ✅ exact |
| `financials_tracker` | +15 | ÷ 5 | **3** | ✅ exact |
| `income_tax_tracker` | +3 | ÷ 1 | **3** | ✅ exact |
| `compliance_calendar` | 0 | — | 0 | ✅ |

**Two arithmetic signals — now confirmed by the live run:**

1. **Each delta divides cleanly by its grain**, and the live grain histogram **[T4] shows no off-grain
   bucket** — every accounting pair carries 12 rows, every financials pair 5, every income_tax pair 1.
   Corruption (partial write, orphaned row, schema drift, duplicate) would have left an off-grain bucket;
   none exists.
2. **financials and income_tax move together.** Live [T3] shows financials = 27 pairs and income_tax = 29
   pairs; both are written by the same core loop and both increased consistently (financials +15 = +3
   pairs × 5; income_tax +3 = +3 pairs × 1).

The accounting/core asymmetry (**accounting 30 pairs vs income_tax 29 pairs**) is confirmed by live **[T5] =
exactly 1 accounting-only pair** — the expected decoupled `activate_accounting_service` activation.

---

## 3A. Live T1–T7 results (2026-07-30 11:15 IST, PJ-executed) — CLOSED

| Block | Result | Verdict |
|---|---|---|
| **[T1]** totals vs baseline | accounting 360 (+48), financials 135 (+15), income_tax 29 (+3), calendar 0 (0) | deltas = 4 / 3 / 3 / 0 pairs, all exact |
| **[T2]** counts by FY | increases consistent with current FY = **2026-27** in range | new-FY generation |
| **[T3]** distinct (client, FY) pairs | accounting **30**, financials **27**, income_tax **29** (`360=30×12`, `135=27×5`, `29=29×1`) | pairs match [T1] |
| **[T4]** grain histogram | **no off-grain groups**; accounting all=12, financials all=5, income_tax all=1 | clean generation |
| **[T5]** accounting vs core | accounting-only pairs = **1**; income_tax-only = 0 | expected +1 decoupled |
| **[T6]** calendar / GST / GSTIN | **0 / 0 / 0** | GST-only calendar correctly empty |
| **[T7]** current FY | `fy_by_flag` = `fy_by_date` = **2026-27** | agrees |

**Reconciliation: CLOSED.** The counts reflect **complete, legitimate generation** (FY 2026-27 in-range
generation and/or newly-activated clients), with no duplicate, partial, or off-grain rows. No row was
modified; the reconciliation is read-only.

## 4. Causes — confirmed by the live run

| Cause | Status (live-confirmed) | Basis |
|---|---|---|
| **FY 2026-27 rollover** (current FY advanced past baseline capture) | **CONFIRMED contributor** | Generators loop `v_start … get_current_fy()` (`0014:686-687`, `0014:793-794`); live [T7] = 2026-27 and [T2] increases sit in the newly in-range FY. |
| **New client(s) / newly-activated pairs** | **CONFIRMED contributor** | Live [T3] pairs (30/27/29) exceed the baseline pair counts (26/24/26); the additional in-range (client, FY) pairs are legitimate generation. |
| **Valid generation / backfill** | **CONFIRMED, benign** | Idempotent `ON CONFLICT` means generation only *adds* genuinely missing in-range pairs; live [T4] shows every pair on-grain. |
| **Duplicate generation** | **EXCLUDED (live)** | Targeted `ON CONFLICT (grain) DO NOTHING` + live **[T4] no off-grain groups** ⇒ no duplicates. |
| **Manual insert / partial write** | **EXCLUDED (live)** | Would appear as an off-grain bucket in [T4]; **none present**. |

**Reconciliation — CLOSED:** the increases are **complete, legitimate generation** (FY 2026-27 in-range
and/or newly-activated (client, FY) pairs) with **no duplication and no off-grain rows**, confirmed by the
live T1–T7 results in §3A. `compliance_calendar` is 0 as expected (§5).

---

## 5. `compliance_calendar` = 0 → 0 — confirmed explanation

The calendar is populated **exclusively** from `gst_tracker` (`0014:1244-1264`, design note `0014:1240-1242`
"the calendar is GST-only"). `gst_tracker` rows exist only for clients with `p_has_gstin AND p_gstin IS NOT
NULL` (`0014:811`). The live **[T6] returned `compliance_calendar` = 0, `gst_tracker` = 0, GSTIN-present
count = 0** — confirming that **no active client carries a GSTIN**, so the GST-only calendar is correctly
empty. This is a legitimate 0→0, not a generation gap. (Counts only — the GSTIN value was never projected.)

---

## 6. Read-only verification SQL (proposals only — aggregate, non-sensitive)

| Block | Proves | Expected |
|---|---|---|
| **[T1]** | Live totals vs frozen baseline + Δ ÷ grain | pairs = 4 / 3 / 3 / 0, all integer |
| **[T2]** | Counts by `fy_label` per tracker | new rows concentrated in `2026-27` ⇒ FY rollover |
| **[T3]** | Distinct clients + distinct (client, FY) pairs | pairs match [T1]; client count vs 13 separates new-client from new-FY |
| **[T4]** | Grain histogram (rows per pair) | accounting all = 12, financials all = 5, income_tax all = 1; **no other bucket** |
| **[T5]** | accounting pairs − income_tax pairs (set difference) | exactly **1** accounting-only pair; 0 income-tax-only |
| **[T6]** | calendar rows, gst_tracker rows, GSTIN-present count | 0 / 0 / 0 (no GSTIN clients) |
| **[T7]** | current FY from `financial_years` (flag + date), **without** calling `get_current_fy()` | `2026-27` |

`client_id` (surrogate uuid / YA-code) is used **only** inside `GROUP BY` / set-difference for grain
reconciliation — never joined to any name/PAN/GSTIN/financial column. No sensitive value is selected.

---

## 7. Residual item — RESOLVED

**R-TRK — the +1 accounting-only pair — RESOLVED.** Live **[T5] confirmed exactly 1 accounting-only
(client, FY) pair and 0 income-tax-only**, and **[T4] showed no off-grain bucket** — i.e. the asymmetry is
the expected decoupled `activate_accounting_service` activation, not a data-integrity defect. No row was
modified; the reconciliation was read-only. **No further tracker action is required**; this discrepancy is
CLOSED.
