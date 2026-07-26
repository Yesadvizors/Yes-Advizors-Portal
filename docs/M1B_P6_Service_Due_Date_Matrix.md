# YAV2 Portal V2 — Module 1 — P6 Service-Wise Statutory Due-Date Matrix (PROPOSED DRAFT — for PJ review) — Rev10

**Status:** **PROPOSED DRAFT — PJ TO APPROVE. NOTHING IN THIS DOCUMENT IS APPROVED.** Per **D-12 (framework
APPROVED, PJ 2026-07-22 IST)**. **Research/verification date:** 2026-07-22 IST. Author: Claude Code (documentation
+ statutory-source verification only) · Approver: PJ · Reviewer: ChatGPT.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53` · branch `ui/redesign-v1` · V2/yav2-dev only; V1/Production prohibited.

> Companions: **`docs/M1B_P6_Statutory_Source_Evidence_Register.md`** (full official-source citations per code) and
> **`docs/M1B_P6_PJ_Due_Date_Decision_Sheet.md`** (genuine PJ decisions). **Drafting is NOT approval.** Rows marked
> `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` **must NOT be presented to PJ for approval** until upgraded.

## Field definitions
- **`obligation_code`** — PROPOSED stable/deterministic/human-readable statutory-obligation identity (PJ-approved, never invented at implementation).
- **`obligation_class`** ∈ `RETURN_FILING` · `PAYMENT` · `CERTIFICATE` · `STATUTORY_REPORT` · `INTERNAL_WORKFLOW` · `EVENT_BASED` · `OPTIONAL_FILING` · `OUT_OF_SCOPE`.
- **`verification_status`** ∈ `PRIMARY_TEXT_VERIFIED` (statute/rule text read) · `OFFICIAL_PORTAL_VERIFIED` (official portal/form page confirmed, not raw statute text) · `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` (not read from primary text, or affected by unresolved new-law mapping, or snippet-only — **NOT ready for approval**) · `OUT_OF_SCOPE` · `INTERNAL_RULE_PJ_TO_DEFINE`.
- **Current-law mapping** (Income Tax/TDS only): current provision under **Income-tax Act, 2025** + **Income-tax Rules, 2026** + **current form no.**; the 1961-Act/1962-Rules reference is retained **only as legacy reconciliation**, not as governing authority.

## ⚠️ Overarching caveats
1. **New law governs AY 2026-27:** Income-tax Act 2025 / Rules 2026 in force from 1 Apr 2026; forms renumbered. **The current-law section/rule numbers were NOT independently verified from primary text** → **every Income Tax + TDS row is `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED`**; the 1961-Act citations are legacy-only and must not be the implementation authority.
2. **Standard vs extension:** all dates are NORMAL statutory. Extensions are in the **Extension Register** only; `standard_due_date` is never overwritten.
3. **Non-working-day:** no official next-working-day rule found → **no auto-shift** unless PJ approves one (Decision 10).
4. **Category/threshold/state/event dependencies** → BLOCKED per D-12 until the input/config exists.

---

## 1. Governing calendar identity + `obligation_code` rules
Distinct identity: **`(client_id, service_code, obligation_code, fy_label, period_key)`** — one `compliance_calendar`
row per distinct five-part key, **not per tracker row**. Multiple tracker representations may share one code **only**
where they truly represent the same obligation. period_key: MONTHLY `FY:Mnn` · QUARTERLY `FY:Qn` · ANNUAL `FY:ANNUAL`
· EVENT `FY:EVENT:<ref>`.

---

## 2. Proposed obligation matrix (PROPOSED — PJ TO APPROVE)

### 2.1 ACCOUNTING → accounting_tracker
| obligation_code | class | obligation | freq/period_key | standard due-date rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `ACC_MONTH_CLOSE` | `INTERNAL_WORKFLOW` | Monthly books close (bookkeeping) | MONTHLY / `FY:Mnn` | **NONE in statute** — internal/config target only (Decision 1) | `INTERNAL_RULE_PJ_TO_DEFINE` |

### 2.2 GST → gst_tracker  *(GST is under the CGST Act 2017/Rules — not affected by the IT Act 2025)*
| obligation_code | class | obligation | freq/period_key | standard due-date rule (proposed, normal) | dependency | verification_status |
|---|---|---|---|---|---|---|
| `GST_GSTR1_M` | `RETURN_FILING` | GSTR-1 monthly | MONTHLY / `FY:Mnn` | **11th** of succeeding month (Rule 59; Notif 83/2020-CT) | turnover>₹5cr/non-QRMP | `PRIMARY_TEXT_VERIFIED` |
| `GST_GSTR1_Q` | `RETURN_FILING` | GSTR-1 quarterly (QRMP) | QUARTERLY / `FY:Qn` | **13th** of month after quarter | QRMP opt-in | `PRIMARY_TEXT_VERIFIED` |
| `GST_GSTR3B_M` | `RETURN_FILING` (payment embedded) | GSTR-3B monthly | MONTHLY / `FY:Mnn` | **20th** of succeeding month (Rule 61(1)(i)) | monthly filer | `PRIMARY_TEXT_VERIFIED` |
| `GST_GSTR3B_Q` | `RETURN_FILING` | GSTR-3B quarterly (QRMP) | QUARTERLY / `FY:Qn` | **22nd (Group-1 states) / 24th (Group-2 states)** (Rule 61(1)(ii) table) | QRMP + **STATE** | `PRIMARY_TEXT_VERIFIED` |
| `GST_CMP08` | `PAYMENT` (statement-cum-challan) | CMP-08 (composition) | QUARTERLY / `FY:Qn` | **18th** of month after quarter (Rule 62(1)(i)) | composition | `PRIMARY_TEXT_VERIFIED` |
| `GST_GSTR4` | `RETURN_FILING` | GSTR-4 (composition annual) | ANNUAL / `FY:ANNUAL` | **30 June** following FY (from FY2024-25; Notif 12/2024-CT) | composition; FY | `OFFICIAL_PORTAL_VERIFIED` *(portal FAQ outdated; notif governs)* |
| `GST_GSTR9` | `RETURN_FILING` | GSTR-9 (annual return) | ANNUAL / `FY:ANNUAL` | **31 December** following FY (Rule 80(1)) | exempt ≤₹2cr | `PRIMARY_TEXT_VERIFIED` |
| `GST_GSTR9C` | `STATUTORY_REPORT` | GSTR-9C (reconciliation) | ANNUAL / `FY:ANNUAL` | **31 December** following FY (Rule 80(3)) | turnover>₹5cr | `PRIMARY_TEXT_VERIFIED` |
| `GST_IFF` | `OPTIONAL_FILING` | Invoice Furnishing Facility (QRMP m1/m2) | MONTHLY / `FY:Mnn` | 13th (optional; Rule 59(2)) | QRMP; Decision 5 | `OUT_OF_SCOPE` *(pending PJ)* |
| `GST_PMT06` | `PAYMENT` | QRMP monthly tax (PMT-06) | MONTHLY / `FY:Mnn` | 25th (Rule 61(3)) | QRMP; Decision 5 | `OUT_OF_SCOPE` *(pending PJ)* |

### 2.3 TDS → tds_tracker  *(ALL rows HOLD — Income-tax Act 2025 / Rules 2026 current-law mapping unresolved)*
| obligation_code | class | obligation | freq/period_key | proposed standard rule (legacy 1961 basis) | current-law (Act2025/Rules2026/form) | verification_status |
|---|---|---|---|---|---|---|
| `TDS_PAY` | `PAYMENT` | TDS deposit | MONTHLY / `FY:Mnn` | 7 days from month-end; **March→30 Apr** (Rule 30, 1962) | **HOLD — new Rule no. + form unverified** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `TDS_24Q` | `RETURN_FILING` | Quarterly stmt — salary (was 24Q) | QUARTERLY / `FY:Qn` | Q1 31Jul·Q2 31Oct·Q3 31Jan·Q4 31May (Rule 31A) | new **Form 138**; new rule no. **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `TDS_26Q` | `RETURN_FILING` | Quarterly stmt — other resident (was 26Q) | QUARTERLY / `FY:Qn` | same as 24Q | new **Form 140**; **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `TDS_27Q` | `RETURN_FILING` | Quarterly stmt — non-resident (was 27Q) | QUARTERLY / `FY:Qn` | same as 24Q | new **Form 144**; **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `TDS_FORM16` | `CERTIFICATE` | Form 16 (annual salary cert) | ANNUAL / `FY:ANNUAL` | **15 June** of next FY (Rule 31(1)(a)) — *not verbatim* | new **Form 130-family**; **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `TDS_FORM16A` | `CERTIFICATE` | Form 16A (quarterly non-salary cert) | QUARTERLY / `FY:Qn` | 15 days after stmt due (Rule 31(1)(b)) — *not verbatim* | new **Form 131**; **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
- **27EQ is TCS (Rule 31AA / new Form 143) — NOT TDS.** Excluded; see Decision 4.

### 2.4 PAYROLL → payroll_tracker  *(EPF/ESI PDFs not machine-readable → HOLD)*
| obligation_code | class | obligation | freq/period_key | standard rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `PAY_EPF_ECR` | `RETURN_FILING` (combined challan-cum-return; payment embedded) | EPF contribution + ECR | MONTHLY / `FY:Mnn` | **15th** of following month (EPF Scheme para 38) | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `PAY_ESIC_CONTRIB` | `PAYMENT` | ESI monthly contribution | MONTHLY / `FY:Mnn` | **15th** of following month (ESI Genl Regs, Reg 31) | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `PAY_PT` | `PAYMENT` | Professional Tax (state) | STATE-CONFIG | **state statute governs — no national date** | `INTERNAL_RULE_PJ_TO_DEFINE` |
- **EPF payment vs ECR filing (Decision 3/split):** ECR is legally a **combined challan-cum-return** → default **ONE** code `PAY_EPF_ECR`. PJ may split into `PAY_EPF_CONTRIB`(PAYMENT) + `PAY_EPF_ECR_FILE`(RETURN_FILING) if separate tracking is wanted. **ESI:** monthly file+pay combined; the old half-yearly Return of Contributions is dispensed → **ONE** PAYMENT code.

### 2.5 INCOME_TAX → income_tax_tracker  *(HOLD — new law)*
| obligation_code | class | obligation | freq/period_key | proposed standard rule (legacy 1961) | current-law | verification_status |
|---|---|---|---|---|---|---|
| `ITR_139_1` | `RETURN_FILING` | ITR filing | ANNUAL / `FY:ANNUAL` | non-audit **31 Jul** · audit **31 Oct** · TP(92E) **30 Nov** (Expl.2 to s.139(1)) | new-Act s.139 equivalent **HOLD**; TP date **HOLD (not verbatim)** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
- Category (non-audit/audit/TP) not derivable from period alone → Decision 2 (one conditional code vs three codes).

### 2.6 STATUTORY_AUDIT → financials_tracker + audit_tracker (ONE shared) — see §3
| obligation_code | class | obligation | freq/period_key | standard rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `SAUD_COAUDIT` | `EVENT_BASED` (audit workflow) | Companies Act statutory audit engagement | ANNUAL / `FY:EVENT:AGM` | **No independent statutory calendar date** — audit is **completed/signed before the AGM** for adoption; **NOT the AOC-4 filing date.** Milestone tied to AGM/board cycle. | `OFFICIAL_PORTAL_VERIFIED` (legal basis; **produces no fixed date**) |
- **`financials_tracker` + `audit_tracker` share ONE code → ONE calendar obligation** (default; §3). **Do NOT use the AOC-4 due date as the audit completion date** (that is a separate ROC filing, `ROC_AOC4`).

### 2.7 TAX_AUDIT → audit_tracker  *(HOLD — new law + applicability)*
| obligation_code | class | obligation | freq/period_key | proposed standard rule (legacy 1961) | current-law | verification_status |
|---|---|---|---|---|---|---|
| `TAUD_44AB` | `STATUTORY_REPORT` | Tax audit report (3CA/3CB+3CD) | ANNUAL / `FY:ANNUAL` | **30 September** of AY (= 1 month before ITR audit date) (s.44AB, Rule 6G) | new-Act s.44AB equivalent **HOLD** | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
- 44AB applicability (turnover/receipts thresholds) not derivable from period alone → Decision 2/3.

### 2.8 ROC → roc_tracker
| obligation_code | class | obligation | freq/period_key | standard rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `ROC_DPT3` | `RETURN_FILING` | DPT-3 (deposits return) | ANNUAL / `FY:ANNUAL` | **30 June** (Rule 16 Deposit Rules) | `OFFICIAL_PORTAL_VERIFIED` |
| `ROC_DIR3KYC` | `RETURN_FILING` | DIR-3 KYC | ANNUAL / `FY:ANNUAL` | **30 September** (Rule 12A) | `OFFICIAL_PORTAL_VERIFIED` |
| `ROC_AOC4` | `EVENT_BASED` | AOC-4 (financial statements filing) | ANNUAL / `FY:EVENT:AGM` | **within 30 days of AGM** (s.137, Rule 12) — needs AGM date | `OFFICIAL_PORTAL_VERIFIED` |
| `ROC_MGT7` | `EVENT_BASED` | MGT-7/7A (annual return) | ANNUAL / `FY:EVENT:AGM` | **within 60 days of AGM** (s.92(4)) — *60-day clause not verbatim* | `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` |
| `ROC_ADT1` | `EVENT_BASED` | ADT-1 (auditor appointment notice) | EVENT / `FY:EVENT:APPT` | **within 15 days of appointment meeting** (s.139(1), Rule 4(2)) — needs meeting date | `OFFICIAL_PORTAL_VERIFIED` |

### 2.9 LLP → llp_tracker
| obligation_code | class | obligation | freq/period_key | standard rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `LLP_FORM11` | `RETURN_FILING` | LLP Form 11 (annual return) | ANNUAL / `FY:ANNUAL` | **30 May** (s.35, Rule 25(1)) | `OFFICIAL_PORTAL_VERIFIED` |
| `LLP_FORM8` | `RETURN_FILING` | LLP Form 8 (Account & Solvency) | ANNUAL / `FY:ANNUAL` | **30 October** (s.34, Rule 24) | `OFFICIAL_PORTAL_VERIFIED` |

### 2.10 SECRETARIAL → roc_tracker (INTERIM)
| obligation_code | class | obligation | freq/period_key | standard rule (proposed) | verification_status |
|---|---|---|---|---|---|
| `SEC_MR3` | `STATUTORY_REPORT` **or** `INTERNAL_WORKFLOW` (Decision 7) | Secretarial audit report MR-3 | ANNUAL / `FY:EVENT:AGM` | **No standalone filing date** — annexed to Board's Report; reaches ROC via AOC-4/MGT-7 cycle (s.204, Rule 9) | `OFFICIAL_PORTAL_VERIFIED` (no fixed date) |

### 2.11 OTHER
| obligation_code | class | verification_status |
|---|---|---|
| — (none) | `OUT_OF_SCOPE` | `OUT_OF_SCOPE` — OTHER does not auto-generate (D-01/D-17 approved) |

### 2.12 TCS (NOT in the current service set) — Decision 4
`TCS_*` family (e.g. `TCS_27EQ`/new Form 143, Rule 31AA) is **OUT_OF_SCOPE** unless PJ creates a separate TCS
service/obligation family; its Q4 date is UNVERIFIED. `verification_status = OUT_OF_SCOPE`.

---

## 3. STATUTORY_AUDIT — one obligation or two? (recommendation unchanged)
**Recommend: keep ONE shared `SAUD_COAUDIT`** for `financials_tracker` + `audit_tracker` (they are two workflow
representations of the single statutory-audit engagement; no separate statutory dates). **Do NOT use the AOC-4
filing date as the audit-completion date** — AOC-4 (`ROC_AOC4`) is a distinct ROC filing obligation. Split only if
PJ approves distinct milestones + separate codes (Decision 8).

## 4. Out-of-scope / manual / config / event-based summary
- **INTERNAL/config:** `ACC_MONTH_CLOSE`, `PAY_PT`. **Optional/out-of-scope (pending PJ):** `GST_IFF`, `GST_PMT06`, TCS. **No generation:** OTHER.
- **EVENT_BASED (need AGM/appointment/event date):** `ROC_AOC4`, `ROC_MGT7`, `ROC_ADT1`, `SAUD_COAUDIT`, `SEC_MR3` — BLOCKED without the event date (Decision 9).

## 5. Verification-status tally (this draft)
- `PRIMARY_TEXT_VERIFIED` (7): GST_GSTR1_M, GST_GSTR1_Q, GST_GSTR3B_M, GST_GSTR3B_Q, GST_CMP08, GST_GSTR9, GST_GSTR9C.
- `OFFICIAL_PORTAL_VERIFIED` (9): GST_GSTR4, ROC_DPT3, ROC_DIR3KYC, ROC_AOC4, ROC_ADT1, LLP_FORM11, LLP_FORM8, SEC_MR3, SAUD_COAUDIT *(SAUD_COAUDIT counted here as legal-basis verified though it yields no fixed date)*.
- `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` (11): TDS_PAY, TDS_24Q, TDS_26Q, TDS_27Q, TDS_FORM16, TDS_FORM16A, ITR_139_1, TAUD_44AB, ROC_MGT7, PAY_EPF_ECR, PAY_ESIC_CONTRIB.
- `INTERNAL_RULE_PJ_TO_DEFINE` (2): ACC_MONTH_CLOSE, PAY_PT.
- `OUT_OF_SCOPE` (3+): GST_IFF, GST_PMT06, TCS(family), OTHER.

**No HOLD row may be presented to PJ for approval until upgraded to PRIMARY_TEXT_VERIFIED / OFFICIAL_PORTAL_VERIFIED.**

## 6. Extension Register (temporary — NOT part of any standard rule)
- **MCA CCFS-2026** (General Circular 01/2026): additional-fee waiver for delayed filings (incl. AOC-4/MGT-7), eff. 15 Apr 2026, extended to **31 Aug 2026** — **fee relief only; standard due dates unchanged.**
- **CBDT/CBIC/EPFO/ESIC:** periodic one-off period/state extensions occur; **none confirmed in force** altering the standard rules above as of 2026-07-22. Standard dates preserved regardless.

## 7. Cross-references
- Full official-source citations per code → `docs/M1B_P6_Statutory_Source_Evidence_Register.md`.
- Genuine PJ decisions → `docs/M1B_P6_PJ_Due_Date_Decision_Sheet.md`.
- Design conformance (five-part key, one calendar row per distinct obligation) → Rev8 design docs.

## Sign-off (PJ) — do NOT approve HOLD rows
- Non-HOLD rows reviewed and approved/amended/rejected: ☐ · PJ: __________ · IST: __________
- HOLD rows: upgraded to verified before any approval: ☐
- ChatGPT independent review of rules + source evidence (before PJ approval): ☐
- **Until this completes, all obligations remain PROPOSED and fail-closed; backend implementation NOT authorised.**
