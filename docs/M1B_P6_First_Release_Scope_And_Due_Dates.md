# YAV2 Portal — Module 1 — P6 First-Release Scope & Standard Due-Date Proposal (PROPOSED — PJ TO APPROVE)

**Status:** **PROPOSED — PJ TO APPROVE. NOTHING HERE IS APPROVED.** Documentation-only. Governed by **Issue #14**
("P6 business scope — simple first-release compliance calendar"). Prepared via the collaboration workflow in
`AI_GOVERNANCE.md` / `docs/AI_COLLABORATION_WORKFLOW.md`. Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Base branch:** `ui/redesign-v1` · **Base commit:** `e6b7ec6b50695a992a08f841b9e0dd309ec696ad`.

> **Simple first release** — a calendar of common recurring statutory filings, **not** a comprehensive
> legal-compliance / payment / certificate / event-management / internal-workflow engine. **Business scope (Issue
> #14) overrides technical completeness.** The earlier broad "Rev10" matrix approach is **superseded / not
> governing.** No P6 implementation, migration, SQL, database, generation, merge or deployment is authorised here.

**Row `Status` values:** `Verified proposal` (standard date proposed with primary authority) · `Event-input
required` (generate only when the event date, e.g. AGM, is supplied) · `Manual review required` (no safe automatic
date; route to a person). **Government extensions are separate overrides and never overwrite the standard date.**

## 1. In scope (Issue #14 obligations only)
Minimum business inputs decide **whether an obligation applies** and its **standard due date**; then **one readable
calendar item + one linked tracker entry** per client per period.

### GST (`gst_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Source (primary authority) | Status |
|---|---|---|---|---|---|---|---|
| GSTR-1 | GSTR-1 | Monthly / QRMP | month / quarter | **11th** of next month (monthly); **13th** of month after quarter (QRMP) | filing frequency (monthly vs QRMP) | CGST Rules r.59; Notif 83/2020-CT; GST portal | Verified proposal |
| GSTR-3B | GSTR-3B | Monthly / QRMP | month / quarter | **20th** of next month (monthly); **22nd** or **24th** of month after quarter (QRMP, by state group) | frequency; **State** (QRMP 22/24) | CGST Rules r.61; Notif 82/2020-CT | Verified proposal |
| CMP-08 | CMP-08 | Quarterly | quarter | **18th** of month after quarter | composition registration | CGST Rules r.62(1)(i) | Verified proposal |
| GSTR-4 | GSTR-4 | Annual | FY | **30 April** following the FY | composition registration | CGST Rules r.62(1)(ii); GST portal | Verified proposal |
| GSTR-9 | GSTR-9 | Annual | FY | **31 December** following the FY | **annual-return exemption applicable for the relevant FY?** (config input) | CGST Act s.44; Rules r.80(1) | Verified proposal |
| GSTR-9C | GSTR-9C | Annual | FY | **31 December** following the FY | **aggregate turnover ≥ configurable statutory threshold for the FY** | CGST Rules r.80(3) | Verified proposal |
- **GSTR-4 note:** a government notification (12/2024-CT) moved the date to 30 June for FY 2024-25 onward — recorded
  **separately** as a notified change for PJ to confirm; it does not overwrite the standard 30 April here.
- **GSTR-9 / 9C applicability is a per-FY configuration** (exemption may be prescribed/notified for a given FY;
  the 9C turnover threshold is a configurable statutory value) — not hard-coded as permanent prose.

### TDS — quarterly statements only (`tds_tracker`)
| Obligation | Return/Form (new-law equivalent) | Frequency | Period | Proposed standard due date | Minimum inputs | Source | Status |
|---|---|---|---|---|---|---|---|
| TDS statement (salary) | **24Q** (new-law Form 138) | Quarterly | quarter | Q1 **31 Jul** · Q2 **31 Oct** · Q3 **31 Jan** · Q4 **31 May** | deductor has TDS obligation | Income-tax Rules r.31A; Income Tax Dept guidance | Verified proposal |
| TDS statement (other resident) | **26Q** (Form 140) | Quarterly | quarter | as 24Q | " | as above | Verified proposal |
| TDS statement (non-resident) | **27Q** (Form 144) | Quarterly | quarter | as 24Q | " | as above | Verified proposal |
- User-facing labels remain **24Q / 26Q / 27Q**; the new-law (Income-tax Act 2025 / Rules 2026) form numbers
  138/140/144 are recorded in the mapping column only and **do not block calendar generation**. **TDS payment
  dates, Form 16/16A and TCS remain excluded (Issue #14).**

### Income Tax (`income_tax_tracker`)
| Obligation | Category | Frequency | Period | Proposed standard due date | Minimum inputs | Source | Status |
|---|---|---|---|---|---|---|---|
| Income-tax return (ITR) | **Non-audit** | Annual | AY | **31 July** of the AY | category | IT Act s.139(1) Expl.2; Income Tax Dept | Verified proposal |
| Income-tax return (ITR) | **Audit case** | Annual | AY | **31 October** of the AY | audit applicability | as above | Verified proposal |
| Income-tax return (ITR) | **Transfer-pricing (s.92E)** | Annual | AY | **30 November** of the AY | TP applicability (Form 3CEB) | as above | Verified proposal |
- The applicable category (non-audit / audit / TP) is a business input; the standard rule above sets the date per
  category. Government extensions remain separate overrides.

### Tax Audit (`audit_tracker`)
| Obligation | Category | Frequency | Period | Proposed standard due date | Rule | Source | Status |
|---|---|---|---|---|---|---|---|
| Tax audit report (3CA/3CB + 3CD) | **Audit case** | Annual | FY | **30 September** of the AY | one month before the 31-Oct return date | IT Act s.44AB; Rule 6G | Verified proposal |
| Tax audit report (3CA/3CB + 3CD) | **Transfer-pricing case** | Annual | FY | **31 October** of the AY | one month before the 30-Nov TP return date | s.44AB (specified date) | Verified proposal |

### ROC (`roc_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Source | Status |
|---|---|---|---|---|---|---|---|
| AOC-4 | AOC-4 | Annual | FY | **within 30 days of the AGM** | **AGM date** | Companies Act s.137; Accounts Rules r.12 | **Event-input required** |
| MGT-7 / MGT-7A | MGT-7 / 7A | Annual | FY | **within 60 days of the AGM** | **AGM date**; company type (OPC/small → 7A) | Companies Act s.92; Mgmt&Admin Rules r.11 | **Event-input required** |
| DPT-3 | DPT-3 | Annual | FY | **30 June** | company holds deposits/loans | Deposit Rules r.16 | Verified proposal |
| DIR-3 KYC | DIR-3 KYC | Annual | FY | **30 September** | individual holds a DIN | Directors Rules r.12A | Verified proposal |
- **AOC-4 and MGT-7/7A are explicitly included by Issue #14.** They **generate only when the AGM date is supplied**
  (`Event-input required`); they are **not** treated as "highly event-dependent compliances" (which are excluded).
  **Fallback:** where an **AGM is not held**, or a special statutory situation applies, the item is **`Manual review
  required`** — the system **must not silently generate a guessed date**; it routes to a responsible person.

### LLP (`llp_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Source | Status |
|---|---|---|---|---|---|---|
| LLP annual return | Form 11 | Annual | FY | **30 May** | LLP Act s.35; LLP Rules r.25(1) | Verified proposal |
| LLP Statement of Account & Solvency | Form 8 | Annual | FY | **30 October** | LLP Act s.34; LLP Rules r.24 | Verified proposal |

### Payroll (`payroll_tracker`)
| Obligation | Return/Form | Frequency | Period | Proposed standard due date | Minimum inputs | Source | Status |
|---|---|---|---|---|---|---|---|
| EPF monthly compliance | ECR | Monthly | month | **15th** of the following month | EPF-covered establishment | EPF Scheme para 38; EPFO | Verified proposal |
| ESIC monthly compliance | contribution | Monthly | month | **15th** of the following month | ESI-covered establishment | ESI (General) Regs r.31; ESIC | Verified proposal |

## 2. Explicitly out of scope (Issue #14 — later phases only, after separate PJ approval)
Accounting month-close generation · TDS payment dates · Form 16 / 16A · TCS · GST IFF · GST PMT-06 · Professional
Tax · ADT-1 · MR-3 · statutory-audit internal milestones · SECRETARIAL auto-generation · OTHER auto-generation ·
uncommon/optional/highly event-dependent compliances · full legal-compliance-engine features.

## 3. Due-date approach (per Issue #14)
- **Configuration-driven standard due dates** — held in a simple PJ-approved reference table (service, obligation,
  frequency, period, standard due-date rule, applicability inputs), not hard-coded across the app.
- **Government extensions are separate overrides** and **must not overwrite** the standard due date.
- **Missing or unapproved rule → no automatic generation** for that obligation (fail-closed).
- `Event-input required` rows generate **only** when the required date (e.g. AGM) is supplied; otherwise they wait.
- `Manual review required` situations (e.g. AGM not held) **route to a person; no guessed date is generated.**
- **Avoid complex legal classifications** beyond what the included scope needs.

## 4. Duplicate prevention & safe writes (REQUIRED future implementation controls — not yet built)
> These are **requirements for the future implementation package**, not claims about the current schema. This PR
> does not verify or create any database constraint.
- **Idempotency key (required):** generation must be protected by a **database-enforced unique/idempotency key**
  over the **authoritative client identifier (`clients.id` UUID) + obligation code + period** (plus any genuinely
  necessary discriminator). *(The exact current constraint/index is not asserted here; the implementation package
  must define and cite it.)*
- **One calendar item + one linked tracker entry per (client, obligation, period).**
- **Re-running generation for the same inputs must create nothing new** (idempotent).
- Generation must be **preview-first** and **fail-closed**; nothing is written for `Manual review required`,
  `Event-input required` (without the event date), or missing/unapproved-rule items.

## 5. User experience (plain language, per Issue #14)
Each calendar item shows, in plain language: **compliance name · return/form · period · standard due date · current
status · responsible team member · client name.** No rule-engine complexity is exposed to users.

## 6. Governance & next steps
- **Nothing here is approved.** No P6 implementation; no Migration `0023` (or any migration) authored/executed; no
  SQL/database execution; no Supabase access; no compliance/tracker/calendar generation; no merge; no deployment;
  V1/Production untouched.
- **Next:** ChatGPT reviews this simplified scope + standard due dates in this draft PR → PJ approves the standard
  due dates and applicability inputs → separate written PJ authorisation before any implementation, migration/SQL
  authoring or execution, commit to base, merge or deploy.
