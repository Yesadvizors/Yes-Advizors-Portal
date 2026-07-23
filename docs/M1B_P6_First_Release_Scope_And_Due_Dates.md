# YAV2 Portal — Module 1 — P6 First-Release Scope & Standard Due-Date Proposal (PROPOSED — PJ TO APPROVE)

**Status:** **PROPOSED — PJ TO APPROVE. NOTHING HERE IS APPROVED.** Documentation-only. Governed by **Issue #14**
("P6 business scope — simple first-release compliance calendar"). Prepared via the collaboration workflow in
`AI_GOVERNANCE.md` / `docs/AI_COLLABORATION_WORKFLOW.md`. Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Base branch:** `ui/redesign-v1` · **Base commit:** `e6b7ec6b50695a992a08f841b9e0dd309ec696ad`.

> **This is a SIMPLE first release** — a calendar of common recurring statutory filings, **not** a comprehensive
> legal-compliance / payment / certificate / event-management / internal-workflow engine. **Business scope (Issue
> #14) overrides technical completeness.** The earlier broad "Rev10" due-date matrix approach is **superseded / not
> governing.** No P6 implementation, migration, SQL, database, generation, merge or deployment is authorised here.

## 1. In scope (Issue #14 obligations only)
For each obligation the portal needs only the minimum business inputs to decide **whether it applies** and its
**standard due date**, then creates **one readable calendar item + one linked tracker entry** per client per period.

### GST (`gst_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum business inputs | Status |
|---|---|---|---|---|---|---|
| GSTR-1 | GSTR-1 | Monthly / Quarterly (QRMP) | month / quarter | **11th** of next month (monthly); **13th** of month after quarter (QRMP) | filing frequency (monthly vs QRMP) | Proposed |
| GSTR-3B | GSTR-3B | Monthly / Quarterly (QRMP) | month / quarter | **20th** of next month (monthly); **22nd** or **24th** of month after quarter (QRMP, by state group) | frequency; **State** (QRMP 22/24) | Proposed |
| CMP-08 | CMP-08 | Quarterly | quarter | **18th** of month after quarter | composition registration | Proposed |
| GSTR-4 | GSTR-4 | Annual | FY | **30 June** of next FY | composition registration | Proposed |
| GSTR-9 | GSTR-9 | Annual | FY | **31 December** of next FY | turnover (exempt ≤ ₹2 cr) | Proposed |
| GSTR-9C | GSTR-9C | Annual | FY | **31 December** of next FY | turnover > ₹5 cr | Proposed |

### TDS — quarterly statements only (`tds_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| TDS statement (salary) | 24Q | Quarterly | quarter | Q1 **31 Jul** · Q2 **31 Oct** · Q3 **31 Jan** · Q4 **31 May** | deductor has TDS obligation | **HOLD — verify** |
| TDS statement (other resident) | 26Q | Quarterly | quarter | as 24Q | " | **HOLD — verify** |
| TDS statement (non-resident) | 27Q | Quarterly | quarter | as 24Q | " | **HOLD — verify** |
- **HOLD reason:** the **Income-tax Act 2025 / Rules 2026** govern AY 2026-27 and renumber the TDS statement forms
  (24Q→138, 26Q→140, 27Q→144); the current section/rule numbers and the Q4 date must be confirmed from primary text
  before approval. **TDS payment dates, Form 16/16A and TCS are excluded (Issue #14).**

### Income Tax (`income_tax_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| Income-tax return filing | ITR | Annual | FY (assessment year) | non-audit **31 Jul** · audit case **31 Oct** · transfer-pricing **30 Nov** | audit applicability; TP applicability (category) | **HOLD — verify** |
- **HOLD reason:** new-law (Act 2025 / Rules 2026) section mapping to confirm; the applicable date depends on the
  client's category (audit / TP), which must be a business input.

### Tax Audit (`audit_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| Tax audit report | 3CA/3CB + 3CD | Annual | FY | **30 September** of the assessment year | tax-audit applicability | **HOLD — verify** |

### ROC (`roc_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| AOC-4 | AOC-4 | Annual | FY | **within 30 days of the AGM** | **AGM date** | **Event-based** |
| MGT-7 / MGT-7A | MGT-7 / 7A | Annual | FY | **within 60 days of the AGM** | **AGM date**; company type (OPC/small → 7A) | **Event-based — verify 60d** |
| DPT-3 | DPT-3 | Annual | FY | **30 June** | company holds deposits/loans | Proposed |
| DIR-3 KYC | DIR-3 KYC | Annual | FY | **30 September** | individual holds a DIN | Proposed |

### LLP (`llp_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| LLP annual return | Form 11 | Annual | FY | **30 May** | registered LLP | Proposed |
| LLP Statement of Account & Solvency | Form 8 | Annual | FY | **30 October** | registered LLP | Proposed |

### Payroll (`payroll_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Status |
|---|---|---|---|---|---|---|
| EPF monthly compliance | ECR | Monthly | month | **15th** of the following month | EPF-covered establishment | Proposed — verify |
| ESIC monthly compliance | contribution | Monthly | month | **15th** of the following month | ESI-covered establishment | Proposed — verify |

## 2. Explicitly out of scope (Issue #14 — later phases only, after separate PJ approval)
Accounting month-close generation · TDS payment dates · Form 16 / 16A · TCS · GST IFF · GST PMT-06 · Professional
Tax · ADT-1 · MR-3 · statutory-audit internal milestones · SECRETARIAL auto-generation · OTHER auto-generation ·
uncommon/optional/highly event-dependent compliances · full legal-compliance-engine features.

## 3. Due-date approach (per Issue #14)
- **Configuration-driven standard due dates** — held in a simple, PJ-approved reference table (service, obligation,
  frequency, period, standard due-date rule), not hard-coded across the app.
- **Government extensions are separate** and **must not overwrite** the standard due date.
- **Missing or unapproved rule → no automatic generation** for that obligation (fail-closed).
- **Avoid complex legal classifications** beyond what the included scope needs.
- **`HOLD` and `Event-based` rows** are **not generated** until, respectively, their rule is verified/approved, or
  the required date input (e.g. AGM date) is supplied.

## 4. Duplicate prevention & safe writes (simple)
- **One calendar item + one linked tracker entry per (client, obligation, period).** The tracker's existing
  business-unique key and a single calendar row per obligation prevent duplicates.
- **Re-running generation for the same inputs creates nothing new** (idempotent; existing items are left as-is).
- Generation is **preview-first** and **fail-closed**; nothing is written for HOLD/event-based/missing-rule items.

## 5. User experience (plain language, per Issue #14)
Each calendar item shows, in plain language: **compliance name · return/form · period · standard due date · current
status · responsible team member · client name.** No rule-engine complexity is exposed to users.

## 6. Governance & next steps
- **Nothing here is approved.** No P6 implementation; no Migration `0023`; no SQL/database execution; no Supabase
  access; no compliance/tracker/calendar generation; no merge; no deployment; V1/Production untouched.
- **Next:** ChatGPT reviews this simplified scope + standard due dates in this draft PR (adherence to the simple
  scope; correctness of included dates; duplicate/unsafe-write prevention; clear UX; no expansion into excluded
  areas) → PJ approves the standard due dates (HOLD rows only after primary-text verification) → separate written
  PJ authorisation before any implementation, migration/SQL authoring or execution, commit to base, merge or deploy.
