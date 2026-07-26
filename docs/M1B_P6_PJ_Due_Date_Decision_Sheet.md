# YAV2 Portal V2 — Module 1 — P6 PJ Due-Date Decision Sheet (PROPOSED — PJ TO DECIDE)

**Status:** OPEN — genuine PJ business decisions arising from the due-date matrix draft. **Nothing here is approved;
no option is pre-selected as approved.** Each carries a **recommendation** + options. Author: Claude Code · Approver:
PJ · Reviewer: ChatGPT. **HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`. Companion:
`docs/M1B_P6_Service_Due_Date_Matrix.md` (Rev10), `docs/M1B_P6_Statutory_Source_Evidence_Register.md`.

> **Sequencing:** these decisions are taken **after** ChatGPT reviews the proposed rules + source evidence, and
> **PJ must not be asked to decide rows still marked `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED`** until they are
> upgraded to a verified status. Deciding an option here does **not** authorise implementation.

| # | Decision | Options | Recommendation | RULING (PJ) |
|---|---|---|---|---|
| **1** | **ACCOUNTING** (`ACC_MONTH_CLOSE`) | (a) exclude from statutory auto-generation; (b) generate an **internal target** date PJ configures | **(a) exclude** — bookkeeping has no statutory date; treat as internal/manual | ☐ |
| **2** | **INCOME_TAX** category | (a) one conditional `ITR_139_1` + a required **category input** (non-audit/audit/TP); (b) three codes `ITR_139_NONAUDIT` / `_AUDIT` / `_TP` | **(b) three codes** — cleaner, deterministic dates; avoids a runtime category dependency | ☐ |
| **3** | **TDS scope** | which of **payment** (`TDS_PAY`), **statements** (`TDS_24Q/26Q/27Q`), **certificates** (`TDS_FORM16/16A`) are in P6 scope | **All three families in scope** (distinct codes/classes), **but all currently HOLD** pending new-law verification | ☐ |
| **4** | **TCS** | (a) exclude from P6; (b) create a separate **TCS service/obligation family** (`TCS_*`, Rule 31AA / Form 143) | **(a) exclude for v1** (Q4 date UNVERIFIED; distinct from TDS) | ☐ |
| **5** | **GST optional facilities** | keep **IFF** (`GST_IFF`) and **PMT-06** (`GST_PMT06`) **out of P6 calendar** | **Keep out of scope** — they are optional/payment, not statutory returns | ☐ |
| **6** | **Professional Tax** (`PAY_PT`) | which **states** are initially supported (config-driven per state) | **Start with the firm's actual client states only**; PT is per-state config, no national date | ☐ |
| **7** | **SECRETARIAL MR-3** (`SEC_MR3`) | (a) standalone calendar obligation; (b) **workflow-only**, linked to the annual (AOC-4/MGT-7) cycle | **(b) workflow-only** — MR-3 has no independent statutory filing date | ☐ |
| **8** | **STATUTORY_AUDIT** (`SAUD_COAUDIT`) | (a) retain **one shared** obligation for financials_tracker + audit_tracker; (b) split into distinct milestones/codes | **(a) one shared** — single statutory engagement; **do NOT use the AOC-4 date as audit completion** | ☐ |
| **9** | **Event-based dates** (AOC-4/MGT-7/ADT-1/statutory-audit/MR-3) | source of the **AGM / appointment / event date** input (which the due date derives from) | Require the event date as an explicit input; obligation **BLOCKED** until supplied | ☐ |
| **10** | **Non-working-day treatment** | (a) **no automatic shift**; (b) separately-approved obligation-specific adjustment rules | **(a) no auto-shift** — no official source specifies a rollover; only shift where PJ approves a specific rule | ☐ |
| **11** *(sub of 3)* | **EPF payment vs ECR filing** | (a) **one combined** `PAY_EPF_ECR` (challan-cum-return); (b) split `PAY_EPF_CONTRIB` (PAYMENT) + `PAY_EPF_ECR_FILE` (RETURN_FILING) | **(a) one combined** — ECR is legally a single challan-cum-return | ☐ |

**Gate:** no option becomes effective until PJ rules it AND (for HOLD-affected obligations) the underlying rule is
verified AND ChatGPT performs the final conformance review. Implementation authoring then still needs separate
written PJ authorisation.
