# YAV2 Portal V2 — Module 1 — P6 Statutory Source Evidence Register (PROPOSED — for verification)

**Purpose:** map every proposed `obligation_code` to its **authoritative primary source** so an independent
reviewer can verify each rule directly. **Nothing here is approved.** Where the value was not read from primary
statutory text, `verification_status = HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` and the reviewer must open the
primary source to confirm. **Access/verified date for all rows: 2026-07-22 IST.** Author: Claude Code · Reviewer:
ChatGPT · Approver: PJ. **HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

> Method note: several official domains blocked automated full-text fetch during research —
> `incometaxindia.gov.in` (HTTP 403), `mca.gov.in`/`ebook.mca.gov.in` (403/DNS), EPFO/ESIC PDFs (binary/not
> machine-readable), `taxinformation.cbic.gov.in` (TLS). Rows confirmed only via official-page **search extracts**
> or **portal FAQ** (not raw statute text) are marked `OFFICIAL_PORTAL_VERIFIED` or `HOLD`. GST CGST-rule text
> (Rules 59/61/62/80) WAS retrieved → `PRIMARY_TEXT_VERIFIED`. Reviewer should re-open each URL to confirm.

## Legend
`PTV` = PRIMARY_TEXT_VERIFIED · `OPV` = OFFICIAL_PORTAL_VERIFIED · `HOLD` = HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED ·
`INT` = INTERNAL_RULE_PJ_TO_DEFINE · `OOS` = OUT_OF_SCOPE.

---

## GST (CGST Act 2017 + CGST Rules 2017; not affected by the Income-tax Act 2025)
| obligation_code | Act & section | Rule | Notification/Form | Notif/publn date | Effective | Clause/para | Official URL | Status |
|---|---|---|---|---|---|---|---|---|
| `GST_GSTR1_M` / `_Q` | CGST Act s.37 | Rule 59 (& 59(2) IFF) | Notif **83/2020-CT** | 10.11.2020 | 01.01.2021 | proviso to s.37(1); Rule 59 | CBIC Rule 59: `https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter8/rule59_v1.00.html` ; FAQ `https://tutorial.gst.gov.in/userguide/returns/FAQs_change_profile.htm` | PTV |
| `GST_GSTR3B_M` / `_Q` | CGST Act s.39 | **Rule 61(1)** (monthly 61(1)(i); QRMP state-table 61(1)(ii)) | Notif **82/2020-CT** | 10.11.2020 | 01.01.2021 | Rule 61(1)(i)/(ii) Table; PMT-06 = 61(3) | CBIC Rule 61 (full text read): `https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter8/rule61_v1.00.html` | PTV |
| `GST_CMP08` | CGST Act s.39 | Rule 62(1)(i) | Form GST CMP-08 | — | — | Rule 62(1)(i) | CBIC Rule 62: `https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter8/rule62_v1.00.html` | PTV |
| `GST_GSTR4` | CGST Act s.39 | Rule 62(1)(ii) | **Notif 12/2024-CT** (30 Apr→30 Jun) | 10.07.2024 | FY 2024-25 | Rule 62(1)(ii) as amended | CBIC Rule 62 (above); Notif index `https://cbic-gst.gov.in/central-tax-notifications.html` ; *(portal FAQ `https://tutorial.gst.gov.in/userguide/returns/faq_GSTR4annual.htm` is OUTDATED — shows 30 Apr)* | OPV |
| `GST_GSTR9` / `_9C` | CGST Act s.44 | Rule 80(1) / 80(3) | GSTR-9 / GSTR-9C | — | current | Rule 80(1); 80(3) (₹5cr) | CBIC Rule 80: `https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter8/rule80_v1.00.html` ; FAQ `https://tutorial.gst.gov.in/userguide/returns/FAQs_gstr9.htm` | PTV |
| `GST_IFF` / `GST_PMT06` | CGST Act s.37/39 | Rule 59(2) / 61(3) | IFF / PMT-06 | — | 01.01.2021 | — | as GSTR-1/3B above | OOS (pending PJ, Decision 5) |

## Income Tax & TDS (Income-tax Act 2025 + Income-tax Rules 2026 govern AY 2026-27) — **ALL HOLD**
> Current-law section/rule numbers under the 2025 Act / 2026 Rules were **not independently verified from primary
> text**; the 1961-Act/1962-Rules references below are **legacy reconciliation only** and must NOT be the
> implementation authority. Form renumbering (24Q→138, 26Q→140, 27Q→144, 27EQ→143, 16/16A→130/131 family) per the
> transition FAQ. Every row below = **HOLD**.
| obligation_code | Legacy 1961/1962 ref | Current-law (2025/2026) | Current form | Publn/effective | Official URL | Status |
|---|---|---|---|---|---|---|
| `ITR_139_1` | s.139(1) Expl.2 (31Jul/31Oct/30Nov) | **HOLD — new-Act s.139 equivalent unverified** | ITR (renumbered TBC) | AY 2026-27 | `https://www.incometaxindia.gov.in/w/section-139-1` ; `https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1` | HOLD |
| `TAUD_44AB` | s.44AB + Rule 6G (30 Sep) | **HOLD — new-Act equivalent unverified** | 3CA/3CB+3CD (TBC) | AY 2026-27 | `https://www.incometaxindia.gov.in/w/section-44ab-38` ; `https://www.incometax.gov.in/iec/foportal/help/statutory-forms/popular-form/form3ca-3cd-um` | HOLD |
| `TDS_PAY` | Rule 30 (7 days; Mar→30 Apr) | **HOLD** | challan | — | `https://www.incometaxindia.gov.in/w/rule-30-7` ; `https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance` | HOLD |
| `TDS_24Q`/`26Q`/`27Q` | Rule 31A (31Jul/31Oct/31Jan/31May) | **HOLD — new rule no.** | 138 / 140 / 144 | Rule-31A PDF dated 2025-12-13 | `https://www.incometaxindia.gov.in/documents/20117/42998/Rule-31A_2025-12-13_12-26-43_d99bf8_en.pdf` ; `https://www.incometaxindia.gov.in/tax-services/file-tds-return` | HOLD |
| `TDS_FORM16` | Rule 31(1)(a) (15 Jun) *(not verbatim)* | **HOLD** | 130-family | — | `https://www.incometaxindia.gov.in/w/form-16-and-form-16a` | HOLD |
| `TDS_FORM16A` | Rule 31(1)(b) (15 days after stmt) *(not verbatim)* | **HOLD** | 131 | — | `https://www.incometaxindia.gov.in/w/form-16-and-form-16a` | HOLD |
| Transition basis | — | Act 2025 / Rules 2026 in force AY 2026-27 | form renumbering | 2026 | `https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf` | HOLD |
| *(TCS `TCS_27EQ`)* | Rule 31AA (15Jul/15Oct/15Jan/Q4 UNVERIFIED) | HOLD | 143 | — | `https://www.incometaxindia.gov.in/w/rule-31aa` | OOS (Decision 4) |

## MCA / ROC (Companies Act 2013 + Rules) and LLP (LLP Act 2008 + Rules)
| obligation_code | Act & section | Rule | Form | Publn/effective | Official URL | Status |
|---|---|---|---|---|---|---|
| `ROC_DPT3` | Companies Act — Deposit provisions | Rule 16 Deposit Rules 2014 | DPT-3 (30 Jun) | Circular 12.04.2019 | `https://www.mca.gov.in/MCA21/dca/downloadeforms/eformTemplates/NCA/Form_DPT-3.pdf` ; `https://www.mca.gov.in/Ministry/pdf/CircularDPT-3Form_12042019.pdf` | OPV |
| `ROC_DIR3KYC` | Companies Act (DIN) | Rule 12A Appt & Qual. Directors Rules | DIR-3 KYC (30 Sep) | msg 13.04.2019; FY2019-20 form | `https://www.mca.gov.in/Ministry/pdf/DIR3KYCcompleteMessage_13042019.pdf` ; `https://www.mca.gov.in/content/mca/global/en/help-faq/faqs/din-related/dir-3-kyc.html` | OPV |
| `ROC_AOC4` | **s.137** | Rule 12 Accounts Rules 2014 | AOC-4 (30 days of AGM) | s.137 in force 01.04.2014 | `http://ebook.mca.gov.in/Actpagedisplay.aspx?PAGENAME=17521` ; `https://www.mca.gov.in/MinistryV2/annualefiling.html` | OPV (EVENT_BASED) |
| `ROC_MGT7` | **s.92(4)** | Rule 11 Mgmt&Admin Rules 2014 | MGT-7/7A (60 days of AGM) | MGT-7A eff FY2020-21 | `http://ebook.mca.gov.in/Actpagedisplay.aspx?PAGENAME=17475` ; `https://www.mca.gov.in/Ministry/pdf/CompaniesMgmtAdminAmndtRules_05032021.pdf` | **HOLD** (60-day clause not verbatim) |
| `ROC_ADT1` | **s.139(1)** | Rule 4(2) Audit & Auditors Rules 2014 | ADT-1 (15 days of appt) | in force 01.04.2014 | `https://www.mca.gov.in/content/mca/global/en/mca/e-filing/complianceServices/ADT-1.html` ; `https://www.mca.gov.in/Ministry/pdf/NCARules_Chapter10.pdf` | OPV (EVENT_BASED) |
| `SAUD_COAUDIT` | **ss.129/143** (audit) / s.137 (filing via AOC-4) | — | audit engagement | in force 01.04.2014 | `http://ebook.mca.gov.in/Actpagedisplay.aspx?PAGENAME=17523` (s.139/audit) | OPV — **no fixed date; NOT the AOC-4 date** |
| `SEC_MR3` | **s.204** | Rule 9 Managerial Personnel Rules 2014 | MR-3 | ₹100cr threshold eff 03.01.2020 | `http://ebook.mca.gov.in/Actpagedisplay.aspx?PAGENAME=17598` | OPV — no standalone date (Decision 7) |
| `LLP_FORM11` | LLP Act **s.35** | Rule 25(1) LLP Rules 2009 | Form 11 (30 May) | LLP Act 2008 | `https://www.mca.gov.in/content/mca/global/en/mca/llp-e-filling/Form-11.html` ; kit `https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction_Kit_LLP_Form_No_11.pdf` | OPV |
| `LLP_FORM8` | LLP Act **s.34** | Rule 24 LLP Rules 2009 | Form 8 (30 Oct) | LLP Act 2008 | `https://www.mca.gov.in/content/mca/global/en/mca/llp-e-filling/Form-8.html` ; kit `https://www.mca.gov.in/content/dam/mca-aem-forms/instructionkits/Instruction%20Kit_LLP%20Form%20No.%208.pdf` | OPV |
| *(extension)* CCFS-2026 | Gen. Circular 01/2026 | — | fee waiver | eff 15.04.2026 → 31.08.2026 | `https://www.mca.gov.in/bin/dms/getdocument?mds=ZojVoJLpnPM35BP6QFpABA%3D%3D` | Extension Register only |

## Payroll (EPFO / ESIC / State PT)
| obligation_code | Act & section | Rule/Reg | Publn/effective | Clause | Official URL | Status |
|---|---|---|---|---|---|---|
| `PAY_EPF_ECR` | EPF & MP Act 1952 (s.1(3) coverage; 7Q/14B for default) | EPF Scheme 1952 **Para 38** | 15th; grace withdrawn eff Feb-2016 | Para 38 | `https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/EPFScheme.pdf` ; grace: `https://www.epfindia.gov.in/site_docs/PDFs/Updates/PressRelease_12012016.pdf` | **HOLD** (PDF not machine-readable) |
| `PAY_ESIC_CONTRIB` | ESI Act 1948 | ESI (General) Regs 1950 **Reg 31** | 15-day rule eff Jun-2017; ceiling ₹21,000 eff 01.01.2017 | Reg 31 | `https://esic.gov.in/contribution` ; FAQ `https://esic.gov.in/attachments/files/faq.pdf` | **HOLD** (site not directly fetchable) |
| `PAY_PT` | State PT Acts (enabled by **Constitution Art. 276**, cap ₹2,500/yr) | per-state | state-specific | — | respective State finance/commercial-tax portals (no national URL) | INT (state-config, Decision 6) |

## Notes for the reviewer
1. **Open each URL** and confirm the value; upgrade `HOLD` rows to `PRIMARY_TEXT_VERIFIED`/`OFFICIAL_PORTAL_VERIFIED` only after reading the primary text.
2. For Income Tax/TDS, **obtain the Income-tax Act 2025 / Rules 2026 section & rule numbers and current form numbers** before any backend rule is authored.
3. Distinguish **standard vs extension** — the CCFS-2026 fee waiver and any CBDT/CBIC/EPFO/ESIC one-off extensions are in the Extension Register, never in the standard rule.
4. This register is **evidence for verification, not approval.**
