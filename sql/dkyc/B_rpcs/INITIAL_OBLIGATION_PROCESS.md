# Director KYC — Initial-Obligation Process (three-path classification)

When a director's routine KYC obligation is first established, the engine classifies the DIN holder
into exactly one of three date-driven paths. Classification is performed by `dkyc_compute_due` and is
surfaced through `classification_path` plus a specific `reason_code`. Verified prior-regime evidence
takes precedence over the date test.

## Decision order (deterministic)
1. **PRIOR_REGIME_VERIFIED** — `dkyc_has_prior_regime_evidence(holder)` is true
   (verified filing + registry_filing_date + SRN on a HISTORICAL/PERIODIC record).
   → due **30 June 2028**, `reason_code=TRANSITION_PRIOR_REGIME`, `interpretation_applied=false`.
   This path wins even if the allotment date looks "legacy".
2. **NEW_DIN** — no prior-regime evidence AND `din_allotment_date >= 2025-04-01` (the new-DIN cutoff).
   First held as on 31 March 2026 or later, so a genuine new DIN may legitimately have **no** prior KYC;
   evidence is therefore NOT required. Calculate from the first applicable 31 March + three consecutive
   FYs → 30 June of (third FY start + 1). `reason_code=NEW_DIN_FY_ANCHOR`, `interpretation_applied=true`,
   `admin_review_status=REVIEW_RECOMMENDED`. UI shows "Rule interpretation applied — review recommended".
   - held 31 Mar 2026 (allot in FY2025-26) → 30 June 2029.
   - first held 31 Mar 2027 (allot in FY2026-27) → 30 June 2030.
3. **LEGACY_HISTORY_UNRESOLVED** — no prior-regime evidence AND `din_allotment_date <= 2025-03-31`.
   The DIN was already held as on 31 March 2025 under the prior annual-KYC regime; prior completion is
   neither verified nor safely disproved. → **MANUAL_REVIEW**,
   `reason_code=MANUAL_REVIEW_LEGACY_HISTORY_UNRESOLVED`. The engine does NOT calculate a new-DIN date.
4. **MANUAL_REVIEW (no anchor / conflicting)** — allotment date NULL → NO_ANCHOR_DATA;
   allotment date in the future relative to as-of → CONFLICTING_DATA.

## Cutoff derivation (auditable)
Rule 12A is effective 31 March 2026; the new regime's first applicable 31 March is 31 March 2026.
- Allotment on/after 2025-04-01 (FY2025-26) ⇒ first held as on 31 Mar 2026 ⇒ NEW_DIN.
- Allotment on/before 2025-03-31 ⇒ already held as on 31 Mar 2025 (prior regime) ⇒ LEGACY.
The cutoff date is a single source: `dkyc_new_din_cutoff() = 2025-04-01`. If MCA later publishes an
official worked illustration that moves this boundary, change only that one function.

## Initial obligation creation
- Use the existing `dkyc_create_kyc_record(...)` for the obligation row (record_type='PERIODIC_KYC').
- For NEW_DIN, `p_compliance_cycle` = due_year (e.g. 2029); compute via the engine, do not hand-enter.
- For PRIOR_REGIME_VERIFIED, `p_compliance_cycle`=2028.
- For LEGACY_HISTORY_UNRESOLVED or no-anchor, do NOT auto-create a calculated obligation; the holder is
  surfaced as MANUAL_REVIEW so an Admin/Manager can supply verified evidence (→ promotes to
  PRIOR_REGIME_VERIFIED) or otherwise resolve it. No silent new-DIN calculation is ever applied to a
  legacy DIN.
- On creation/acceptance/filing/verification/override/rule-version recalc, a snapshot is written
  (idempotent) capturing the classification + due date under the active rule_version.
