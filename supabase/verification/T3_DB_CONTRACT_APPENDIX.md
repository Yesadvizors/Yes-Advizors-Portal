# T3 — DB Contract Appendix: full column & RPC-argument detail

Companion to `T3_DB_CONTRACT_PROPOSAL.md`. Source-derived from authored migrations (AUTHORED NOT
APPLIED). Types/nullability/defaults quoted verbatim. **No SQL executed. No V1 access.**

Legend: `NN` = NOT NULL · default shown in `code`. Schema `public` throughout.

## A. Base tables (0002–0005)

### `financial_years` (0002)
`id uuid NN gen_random_uuid()` PK · `fy_label varchar(10) NN` UNIQUE · `fy_start_date date NN` ·
`fy_end_date date NN` · `assessment_year varchar(10)` · `is_current boolean false` · `is_active boolean true` ·
`created_at timestamptz now()`.

### `team` (0002)  — Auth↔app-role mapping (G-07)
`id uuid NN gen_random_uuid()` PK · `name text NN` · `email text` UNIQUE(team_email_key, 0007) · `mobile text` ·
`role text 'Staff'` · `initials text` · `color text '#0D7A53'` · `is_active boolean true` · `created_at timestamptz now()` ·
`is_admin boolean NN false` · `designation text` · `auth_user_id uuid` · `display_name text` · `ct_role text 'Team Member'` ·
`portal_role portal_role_enum 'Staff'` · `chatbot_role text`.
CHECK `chk_team_chatbot_role`: `chatbot_role IS NULL OR chatbot_role = ANY (ARRAY['Admin','Manager','Staff','Intern','Developer_Test','Client'])`.

### `clients` (0002)
`id uuid NN gen_random_uuid()` PK · `client_id text` UNIQUE · `name text NN` · `client_type text` · `mobile text` ·
`email text` · `pan text` · `gstin text` · `tan text` · `address text` · `status text 'Active'` · `quick_onboarded boolean false` ·
`onboarded_by text` · `drive_folder_url text` · `created_at timestamptz now()` · `updated_at timestamptz now()` ·
`date_of_incorporation date` · `cin text` · `contact_person text` · `contact_designation text` · `secondary_email text` ·
`city text` · `state text` · `pincode text` · `directors jsonb '[]'` · `services jsonb '[]'` · `bank_name text` ·
`bank_account text` · `engagement_start date` · `notes text` · `pf_no text` · `esi_no text` · `udyam_no text` ·
`num_directors integer 0` · `is_draft boolean false` · `iec_no text` · `doc_pin text` · `gst_registration_date date` ·
`pf_registration_date date` · `esi_registration_date date` · `shop_estb_no text` · `shop_estb_state text` · `is_test_client boolean false`.

### `client_directors` (0002)
`id uuid NN gen_random_uuid()` PK · `client_id text NN` (no FK) · `name text NN` · `role text 'Director'` · `din text` ·
`pan text` · `aadhaar_last4 text` · `aadhaar_masked text` · `mobile text` · `email text` · `dsc_expiry date` ·
`dsc_status text 'Unknown'` · `is_active boolean true` · `is_primary_contact boolean false` · `appointment_date date` ·
`cessation_date date` · `nationality text 'Indian'` · `designation text` · `remarks text` · `created_at/updated_at timestamptz now()`.

### `tasks` (0003)
`id uuid NN gen_random_uuid()` PK · `task_id text` · `task_name text NN` · `client_id text` · `client_name text` ·
`assigned_to text` · `assigned_by text` · `due_date date` · `priority text 'Normal'` · `status text 'Pending'` · `notes text` ·
`latest_update text` · `next_action text` · `next_followup_date date` · `last_updated timestamptz now()` · `completed_on timestamptz` ·
`completed_by text` · `created_at timestamptz now()` · `work_type text 'General Task'` · `checklist jsonb '[]'` ·
`checklist_1/2/3 boolean false`.

### `follow_ups` (0003)
`id uuid NN gen_random_uuid()` PK · `followup_id text` · `task_id text` · `client_id text` · `client_name text` ·
`updated_by text` · `note text` · `next_action text` · `next_followup_date date` · `status_at_time text` · `attachment_url text` ·
`created_at timestamptz now()`.

### `documents` (0003)
`id uuid NN gen_random_uuid()` PK · `client_id text` · `client_name text` · `doc_type text` · `doc_name text` · `file_path text` ·
`file_url text` · `file_size integer` · `mime_type text` · `uploaded_by text` · `created_at timestamptz now()` ·
`scope text NN 'client'` · `director_name text` · `compliance_type text` · `compliance_ref_id uuid` · `compliance_period text` ·
`fy_label text` · `doc_category text 'kyc'`. CHECK `documents_scope_chk`: `scope = ANY (ARRAY['client','director','compliance'])`.

### `completed_documents` (0003)
`id uuid NN gen_random_uuid()` PK · `client_id text NN` · `client_name text NN` · `client_type text` · `pan text` · `gstin text` ·
`financial_year text NN` · `month text` · `quarter text` · `category text NN` · `doc_type text NN` · `doc_name text NN` ·
`file_path text NN` · `file_name text` · `file_size bigint` · `mime_type text` · `uploaded_by text NN` · `visibility text 'internal'` ·
`status text 'Final Uploaded'` · `remarks text` · `version integer 1` · `original_id uuid` · `created_at/updated_at timestamptz now()`.
CHECK `completed_documents_visibility_check`: `visibility = ANY (ARRAY['internal','client'])`.

### `extracted_document_data` (0003)
`id uuid NN gen_random_uuid()` PK · `document_id uuid` · `client_id text NN` · `fy_label text` · `doc_type text` ·
`field_name text NN` · `extracted_value text` · `source_page integer` · `confidence_score text` · `extraction_engine text` ·
`edited_value text` · `final_value text` · `reviewed boolean false` · `reviewed_by text` · `reviewed_at timestamptz` · `created_at timestamptz now()`.

### `client_financials` (0003) — UNIQUE `(client_id, fy_label)` (0007)
`id uuid NN gen_random_uuid()` PK · `client_id text NN` · `fy_label text NN` · ~30 `numeric` financial figures
(`turnover, other_income, total_income, purchases, employee_cost, finance_cost, depreciation, other_expenses, pbt,
tax_expense, pat, ebitda, equity_capital, reserves, net_worth, borrowings, trade_payables, fixed_assets, investments,
trade_receivables, cash_bank, loans_advances, total_assets, total_liabilities, gross_total_income, total_deductions,
taxable_income, tax_payable, tax_paid, refund`) · `tax_audit_applicable boolean` · `udin text` · `auditor_name text` ·
`audit_firm_frn text` · `source_document_id uuid` · `extraction_mode/engine text` · `overall_confidence text` ·
`raw_extracted jsonb` · `reviewed boolean false` · `reviewed_by text` · `reviewed_at/scanned_at timestamptz` ·
`created_at/updated_at timestamptz now()` · `data_source text 'primary'` · `source_fy_label text` · `verification_status text` ·
`verification_note text` · `currency_unit text 'absolute'` · `unit_detected boolean true`.

### `financials_tracker` (0003) — UNIQUE `(client_id, fy_label, doc_type)` (0007)
`id uuid NN gen_random_uuid()` PK · `client_id text NN` · `fy_label text NN` · `doc_type text NN` · `status text NN 'Not Uploaded'` ·
`document_id uuid` · `due_date/filing_date date` · `uploaded_by text` · `remarks text` · `created_at/updated_at timestamptz now()` ·
`udin_number text` · `udin_date date` · `document_date/board_approval_date date` · `auditor_name text` · `audit_firm_frn text` ·
`audit_opinion text` · `caro_applicable boolean` · `tax_audit_form text` · `tax_audit_applicable boolean` · `itr_filing_date date` ·
`ack_number text` · `refund_demand numeric` · `turnover numeric` · `pdf_type text` · `extraction_status text 'pending'` ·
`extraction_engine text` · `extracted_at timestamptz` · `acknowledgement_number text`.

### `claude_usage_log` (0003)
`id uuid NN gen_random_uuid()` PK · `function_name text NN` · `model text` · `purpose text` · `input_tokens/output_tokens/total_tokens integer` ·
`client_id text` · `created_at timestamptz now()` · `tier text` · `provider text 'anthropic'` · `cost_estimate numeric`.

### Trackers (0004) — every one: `id uuid NN gen_random_uuid()` PK · `client_id uuid NN` · `fy_label varchar(10) NN` (calendar/notice vary) · `workflow_stage workflow_stage_enum 'Assigned'` · `status compliance_status_enum 'Not Started'` · stage actor(uuid)+date cols · `remarks text` · `created_at/updated_at timestamptz now()`
Business-key UNIQUE constraints added in 0007:
- `gst_tracker` → `(client_id, gstin, return_type, fy_label, period)`
- `income_tax_tracker` → `(client_id, fy_label)`
- `tds_tracker` → `(client_id, form_type, quarter, fy_label)`
- `audit_tracker` → `(client_id, audit_type, fy_label)` · actor col `assigned_auditor`
- `accounting_tracker` → `(client_id, fy_label, month)`
- `compliance_calendar`, `roc_tracker`, `notice_tracker` → no 0007 UNIQUE. `notice_tracker` has no `filed_*` cols.
(Domain-typed cols per tracker: `gst_tracker.return_type gst_return_type_enum`, `.filing_frequency gst_frequency_enum`,
`.period_month month_enum`, `.period_quarter quarter_enum`; `tds_tracker.form_type tds_form_enum`, `.quarter quarter_enum`;
`roc_tracker.filing_type roc_filing_type_enum`; `notice_tracker.authority notice_authority_enum`;
`audit_tracker.audit_type audit_type_enum`; `accounting_tracker.month month_enum`.)

### Audit tables (0005) — FORCE RLS
`audit_log`: `id uuid NN (no default)` PK · `occurred_at timestamptz NN now()` · `initiated_by_type text NN` ·
`actor_user_id uuid` · `actor_service text` · `actor_app_role text` · `target_user_id uuid` · `client_uuid uuid` ·
`client_code_snapshot text` · `resource_type text` · `resource_id text` · `event_name text NN` · `event_category text` ·
`action text` · `description text` · `risk_tier text` · `sensitivity_tier text` · `metadata jsonb NN '{}'`.
CHECKs: `initiated_by_type IN ('user','service')`; `risk_tier IN ('LOW','MEDIUM','HIGH','CRITICAL')`;
`sensitivity_tier IN ('S1','S2','S3','S4')`; `chk_actor_user`; `chk_actor_service`.
`audit_event_contract`: `event_name text PK` · `risk_tier text NN` · `sensitivity text NN` · `required_keys text[] NN '{}'` ·
`optional_keys text[] NN '{}'` · `allow_empty_metadata boolean NN false` · `client_requirement text NN` ·
`target_user_requirement text NN` · `permitted_actor_types text[] NN` · `permitted_actions text[] NN '{}'` ·
`permitted_resource_types text[] NN '{}'`. CHECKs on requirement/tier fields.
`audit_ingestion_failures`: `id uuid NN (no default)` PK · `failed_at timestamptz NN now()` · `triggering_event text` ·
`failure_reason_code text` · `field_names_only text[]` · `sqlstate_code text`.

## B. Dependency-closure tables (0007)
`ct_team_members`: `id uuid PK` · `auth_user_id uuid` · `full_name varchar(100) NN` · `display_name varchar(50)` ·
`email varchar(150) NN` UNIQUE · `mobile varchar(15)` · `role user_role_enum NN 'Team Member'` · `designation varchar(100)` ·
`is_active boolean true` · `joining_date date` · `profile_photo text` · `created_at/updated_at timestamptz now()`.
`llp_tracker`, `payroll_tracker` (UNIQUE `(client_id, fy_label, month)`), `tds_client_config` (UNIQUE `client_id`;
`form_24q/26q/27q/27eq boolean false`), `trust_ngo_tracker` — all `client_id uuid NN`, standard workflow/status/actor columns.

## C. M1-A client-master tables (0015) — all FK → `clients(id) ON DELETE RESTRICT`, `row_version int NN 1`, `created_by/updated_by uuid`, FORCE RLS
- `entity_type_catalogue`: `code text PK` · `label text NN` · `sort_order int NN 0` · `is_active boolean NN true` · `created_at timestamptz NN now()`. Seed: INDIVIDUAL, PROPRIETORSHIP, PARTNERSHIP_FIRM, LLP, PVT_LTD, PUB_LTD, SECTION_8, HUF, TRUST, SOCIETY, OTHER.
- `client_persons`: `id uuid PK` · `client_id uuid NN` · `person_type text NN 'Director'` · `full_name text NN` · `designation/pan/din/mobile/email text` · `nationality text 'Indian'` · `is_primary_contact boolean NN false` · `appointment_date/cessation_date date` · `aadhaar_verification_status text NN 'Not Provided'` CHECK `IN ('Not Provided','Masked Only','Verified','Exception')` · aadhaar evidence/verified/exception cols · `is_active boolean NN true`.
- `client_registrations`: `id uuid PK` · `client_id uuid NN` · `reg_type text NN` · `jurisdiction text NN 'IN'` · `reg_number text` · `status text NN 'Active'` CHECK `IN ('Applied','Active','Suspended','Cancelled')` · effective/registered dates · partial UNIQUE `(client_id, reg_type, upper(reg_number)) WHERE reg_number IS NOT NULL` · **UNIQUE `(id, client_id)` added 0021** · dates CHECK.
- `gst_registration_details`: `registration_id uuid PK` → `client_registrations(id) ON DELETE CASCADE` · `gstin text` · `state_code text` · `filing_frequency text` CHECK `IN ('Monthly','Quarterly_QRMP')` · `composition boolean NN false` · registration/cancellation dates + CHECK.
- `client_identifiers`: `id uuid PK` · `client_id uuid NN` · `id_type text NN` · `id_value text NN` · `issued_on date` · `status text NN 'Active'` CHECK `IN ('Active','Inactive')` · UNIQUE `(client_id, id_type, upper(id_value))`.
- `client_contacts`: `id uuid PK` · `client_id uuid NN` · `contact_type text NN 'Primary'` · `person_name/designation/email/phone text` · `is_primary boolean NN false` · `linked_person_id uuid` → `client_persons(id) ON DELETE SET NULL`.
- `client_addresses`: `id uuid PK` · `client_id uuid NN` · `address_type text NN 'Registered'` · `line1/line2/city/state text` · `country text 'India'` · `pincode text` · `is_primary boolean NN false` · effective dates + CHECK.
- `client_relationships`: `id uuid PK` · `client_id uuid NN` · `related_client_id uuid` → clients · `related_person_id uuid` → client_persons · `relationship_type text NN` · `ownership_pct numeric(5,2)` · CHECKs: client-XOR-person target, `ownership_pct 0..100`, dates.
- `client_remediation_flags`: `id uuid PK` · `client_id uuid NN` · `flag_type text NN` · `severity text NN 'warn'` CHECK `IN ('info','warn','block-on-edit')` · `detail jsonb NN '{}'` · `resolved boolean NN false` · resolver cols.

## D. P5 service-applicability tables (0021, DRAFT) — FORCE RLS
- `service_catalogue`: `code text PK` · `label text NN` · `requires_registration boolean NN false` · `default_frequency text` CHECK `IS NULL OR IN ('MONTHLY','QUARTERLY','HALF_YEARLY','ANNUAL','EVENT_BASED','ONE_TIME','AS_REQUIRED')` · `sort_order int NN 0` · `is_active boolean NN true` · `created_at timestamptz NN now()`. Seed: ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP, STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER.
- `client_service_applicability`: `id uuid PK` · `client_id uuid NN` → clients · `service_code text NN` → service_catalogue · effective dates · `frequency text` (same CHECK domain) · `linked_registration_id uuid` · `owner_team_id uuid` → team · `status text NN 'Draft'` CHECK `IN ('Draft','Approved','Inactive')` · `approved_by uuid` · `approved_at timestamptz` · `notes text` · `row_version int NN 1`. CHECKs: `csa_dates_chk`, `csa_effective_from_gate_chk`, `csa_effective_to_null_when_approved_chk`, `csa_approval_actor_chk`, composite FK `csa_registration_same_client_fk (linked_registration_id, client_id) → client_registrations(id, client_id)`, **`csa_other_notes_required_chk` (added 0022)**. Partial UNIQUE `(client_id, service_code) WHERE status <> 'Inactive'`.

## E. Complete RPC argument lists (0017 CRUD; 0016 audit) — verbatim
```
audit_write_event(p_event_name text, p_action text, p_resource_type text, p_resource_id text, p_client_id uuid, p_metadata jsonb) → uuid
client_person_create(p_client_id uuid, p_person_type text, p_full_name text, p_designation text, p_pan text, p_din text, p_mobile text, p_email text, p_nationality text, p_is_primary_contact boolean, p_appointment_date date, p_cessation_date date) → uuid
client_person_update(p_id uuid, p_expected_row_version integer, p_person_type text, p_full_name text, p_designation text, p_pan text, p_din text, p_mobile text, p_email text, p_nationality text, p_is_primary_contact boolean, p_appointment_date date, p_cessation_date date) → integer
client_person_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
client_identifier_create(p_client_id uuid, p_id_type text, p_id_value text, p_issued_on date, p_status text) → uuid
client_identifier_update(p_id uuid, p_expected_row_version integer, p_id_type text, p_id_value text, p_issued_on date, p_status text) → integer
client_identifier_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
client_contact_create(p_client_id uuid, p_contact_type text, p_person_name text, p_designation text, p_email text, p_phone text, p_is_primary boolean, p_linked_person_id uuid) → uuid
client_contact_update(p_id uuid, p_expected_row_version integer, p_contact_type text, p_person_name text, p_designation text, p_email text, p_phone text, p_is_primary boolean, p_linked_person_id uuid) → integer
client_contact_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
client_address_create(p_client_id uuid, p_address_type text, p_line1 text, p_line2 text, p_city text, p_state text, p_country text, p_pincode text, p_is_primary boolean, p_effective_from date, p_effective_to date) → uuid
client_address_update(p_id uuid, p_expected_row_version integer, p_address_type text, p_line1 text, p_line2 text, p_city text, p_state text, p_country text, p_pincode text, p_is_primary boolean, p_effective_from date, p_effective_to date) → integer
client_address_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
client_relationship_create(p_client_id uuid, p_related_client_id uuid, p_related_person_id uuid, p_relationship_type text, p_ownership_pct numeric, p_effective_from date, p_effective_to date) → uuid
client_relationship_update(p_id uuid, p_expected_row_version integer, p_related_client_id uuid, p_related_person_id uuid, p_relationship_type text, p_ownership_pct numeric, p_effective_from date, p_effective_to date) → integer
client_relationship_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
client_registration_create(p_client_id uuid, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text, p_effective_from date, p_effective_to date, p_registered_on date) → jsonb
client_registration_update(p_id uuid, p_expected_row_version integer, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text, p_effective_from date, p_effective_to date, p_registered_on date) → integer
client_registration_set_active(p_id uuid, p_is_active boolean, p_expected_row_version integer) → integer
gst_detail_create(p_registration_id uuid, p_gstin text, p_state_code text, p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date) → uuid
gst_detail_update(p_registration_id uuid, p_expected_row_version integer, p_gstin text, p_state_code text, p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date) → integer
client_registration_create_with_gst(p_client_id uuid, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text, p_effective_from date, p_effective_to date, p_registered_on date, p_gstin text, p_state_code text, p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date) → jsonb
client_registration_update_with_gst(p_id uuid, p_expected_row_version integer, p_reg_type text, p_jurisdiction text, p_reg_number text, p_status text, p_effective_from date, p_effective_to date, p_registered_on date, p_gst_expected_row_version integer, p_gstin text, p_state_code text, p_filing_frequency text, p_composition boolean, p_registration_date date, p_cancellation_date date) → jsonb
```
All 0017 RPCs: `SECURITY DEFINER`, `SET search_path = pg_catalog, public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, service_role; GRANT EXECUTE TO authenticated`.
