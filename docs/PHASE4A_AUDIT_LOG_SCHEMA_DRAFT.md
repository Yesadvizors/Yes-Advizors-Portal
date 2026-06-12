# Phase 4A — Audit Log Schema Draft

**Status:** PLANNING ONLY — NOT IMPLEMENTED

This document proposes a future audit-log data model for the Yes Advizors Portal and its AI/WhatsApp workflows. It is a design draft only.

## Strict non-implementation statement

This document does **not**:

- create any database table;
- run SQL;
- add a migration;
- change Supabase;
- change any Edge Function;
- change application/runtime logic;
- change users, roles, permissions, or assignments;
- deploy anything;
- add secrets or API keys.

Any future implementation requires a separate branch, separate pull request, security review, database review, test plan, rollback plan, and explicit approval.

## 1. Objective

Design a future audit-log structure that can answer:

- who performed an action;
- what action was performed;
- when it happened;
- which client, document, task, compliance item, or system resource was affected;
- whether the action succeeded, failed, or was denied;
- how sensitive or risky the event was;
- which application channel generated the event;
- what minimum technical context is needed for investigation without storing unnecessary sensitive data.

## 2. Proposed logical table

Proposed future logical name: `audit_log`

This name is illustrative only. The table does not exist as a result of this document.

### Proposed columns

| Column | Suggested type | Required | Purpose |
|---|---|---:|---|
| `id` | UUID | Yes | Unique immutable audit-event identifier. |
| `occurred_at` | Timestamp with timezone | Yes | Server-recorded event time in UTC. |
| `recorded_at` | Timestamp with timezone | Yes | Time the platform persisted the audit event. |
| `actor_type` | Controlled text/enum | Yes | Actor category: user, system, service, ai_agent, whatsapp_user, or anonymous. |
| `actor_user_id` | UUID, nullable | No | Authenticated portal user identifier when available. |
| `actor_team_member_id` | UUID, nullable | No | Internal team-member reference when relevant. |
| `actor_display_name_snapshot` | Text, nullable | No | Limited display-name snapshot for investigation. |
| `actor_role_snapshot` | Text, nullable | No | Role at event time. |
| `actor_mobile_masked` | Text, nullable | No | Masked WhatsApp/mobile reference. |
| `session_id` | UUID/text, nullable | No | Session correlation identifier; never an access token. |
| `request_id` | UUID/text, nullable | No | Request or workflow correlation identifier. |
| `channel` | Controlled text/enum | Yes | Origin such as web, whatsapp, api, edge_function, n8n, scheduled_job, or admin_tool. |
| `event_category` | Controlled text/enum | Yes | High-level area such as authentication, client, compliance, document, task, permission, AI, integration, or system. |
| `event_action` | Controlled text/enum | Yes | Action such as login, view, create, update, delete, download, upload, assign, approve, deny, export, share, or permission_change. |
| `event_name` | Text | Yes | Stable machine-readable event name, for example `document.file.downloaded`. |
| `event_version` | Small integer | Yes | Version of the event contract. |
| `outcome` | Controlled text/enum | Yes | success, failure, denied, partial, or unknown. |
| `risk_tier` | Controlled text/enum | Yes | low, medium, high, or critical. |
| `sensitivity_tier` | Controlled text/enum | Yes | public, internal, confidential, or restricted. |
| `client_id` | UUID, nullable | No | Client master reference when applicable. |
| `director_id` | UUID, nullable | No | Director/person reference when applicable. |
| `resource_type` | Controlled text | Yes | Resource class such as client, document, task, compliance_item, director, invoice, user, role, or setting. |
| `resource_id` | UUID/text, nullable | No | Identifier of the affected resource. |
| `parent_resource_type` | Controlled text, nullable | No | Optional parent resource class. |
| `parent_resource_id` | UUID/text, nullable | No | Optional parent identifier. |
| `field_names_changed` | Text array, nullable | No | Names of changed fields only; not sensitive values. |
| `change_summary` | Text, nullable | No | Short masked summary of the change. |
| `metadata` | JSON object | Yes | Allow-listed, size-limited, validated technical metadata only. |
| `ip_address_masked` | Text, nullable | No | Privacy-preserving network indicator, subject to legal review. |
| `user_agent_summary` | Text, nullable | No | Normalised browser/device summary. |
| `source_service` | Text | Yes | Component that generated the event. |
| `source_environment` | Controlled text/enum | Yes | production, staging, development, or test. |
| `integrity_hash` | Text, nullable | No | Future optional tamper-evidence field requiring separate review. |
| `retention_class` | Controlled text/enum | Yes | short, standard, extended, or legal_hold. |
| `expires_at` | Timestamp with timezone, nullable | No | Proposed disposal date where applicable. |
| `created_by_system` | Boolean | Yes | Indicates system-generated, non-manual record creation. |

## 3. Proposed risk-tier model

### Low
- normal login success;
- viewing a non-sensitive dashboard;
- routine system health event.

### Medium
- viewing client profile details;
- uploading a routine working document;
- editing task or compliance status;
- exporting a normal report.

### High
- downloading restricted client documents;
- changing client ownership or staff assignment;
- repeated failed login attempts;
- changing compliance due dates or filing status;
- bulk export;
- AI response involving restricted client information.

### Critical
- role or permission changes;
- admin access changes;
- attempted unauthorised access to another client/director;
- deletion of restricted records;
- secret/configuration changes;
- disabling audit logging;
- suspected data exfiltration or mass download.

Risk classification should be rule-driven and centrally maintained.

## 4. Proposed event naming convention

Use stable lowercase names in this format:

`domain.resource.action`

Examples:

- `auth.session.login_success`
- `auth.session.login_failed`
- `client.profile.viewed`
- `client.profile.updated`
- `document.file.uploaded`
- `document.file.downloaded`
- `document.file.deleted`
- `compliance.item.status_changed`
- `task.assignment.changed`
- `permission.user_role.changed`
- `whatsapp.document.requested`
- `ai.client_query.answered`
- `ai.client_query.denied`

## 5. Actor model

The future design should distinguish:

1. Authenticated internal user.
2. Authenticated client user.
3. WhatsApp user identified through approved mapping.
4. AI agent.
5. System/service such as scheduled job, Edge Function, n8n workflow, webhook, or integration.
6. Anonymous/unknown access attempt.

For automated actions, record both the initiating human actor, when known, and the executing service or agent.

## 6. Client and resource linkage

Audit records should link to canonical resource IDs rather than duplicate sensitive business data.

Examples:

- client profile view → `client_id` + resource type `client`;
- director document view → `client_id` + `director_id` + resource type `document`;
- compliance status update → `client_id` + resource type `compliance_item` + resource ID;
- role change → resource type `user_role` + affected user ID;
- WhatsApp request → client/director mapping identifiers plus masked mobile reference.

Complete PAN, Aadhaar, GSTIN, passport, bank, or document contents should not be copied into the audit log.

## 7. Metadata rules

Suggested safe metadata:

- workflow name;
- API route name;
- file category;
- document financial year;
- previous and new status labels;
- number of records exported;
- denial reason code;
- AI model/provider label without prompt contents;
- response latency;
- correlation IDs;
- safe error code.

### Metadata must never contain

- passwords;
- OTPs;
- access tokens;
- refresh tokens;
- API keys;
- session cookies;
- complete PAN, Aadhaar, GSTIN, passport, bank account, or card details;
- raw document contents;
- unrestricted AI prompts or responses containing client data;
- full WhatsApp message bodies unless separately approved;
- encryption keys;
- private URLs with embedded credentials;
- Supabase service-role credentials;
- webhook secrets.

## 8. Proposed Row Level Security approach

**NOT IMPLEMENTED.** Future principles:

- normal portal users should not directly insert, update, or delete audit rows;
- trusted server-side functions or controlled service identities should write events;
- audit records should be append-only;
- standard staff should not have unrestricted audit access;
- designated admin/compliance reviewers may receive read-only access by least privilege;
- client users should not see internal audit logs unless separately designed and approved;
- access to critical audit events should itself create an audit event;
- service-role use must be minimised and isolated;
- no policy should rely only on frontend hiding.

Every future RLS policy requires independent review against existing user, team, client, director, WhatsApp-access, and assignment models.

## 9. Proposed indexes

**NOT IMPLEMENTED.** Future indexes may be considered for:

- `occurred_at`;
- `actor_user_id` + `occurred_at`;
- `client_id` + `occurred_at`;
- `resource_type` + `resource_id` + `occurred_at`;
- `event_name` + `occurred_at`;
- `risk_tier` + `occurred_at`;
- `outcome` + `occurred_at`;
- `request_id`;
- `session_id`;
- `expires_at`.

Index selection must follow measured query patterns and storage impact.

## 10. Retention proposal

**NOT IMPLEMENTED.** Final retention requires legal, contractual, security, privacy, and operational review.

| Retention class | Example use | Illustrative duration only |
|---|---|---|
| `short` | low-risk technical events | 30–90 days |
| `standard` | normal client, document, compliance, and task activity | 1–3 years |
| `extended` | permission changes, restricted downloads, security events | 5–8 years |
| `legal_hold` | investigation or legal requirement | until authorised release |

Retention should include controlled disposal, deletion evidence, and legal-hold override.

## 11. Immutability and integrity proposal

**NOT IMPLEMENTED.** Future controls may include:

- append-only writes;
- prohibition of normal update/delete operations;
- restricted maintenance procedures;
- integrity checks;
- archival to a separate controlled store;
- alerting when audit collection stops;
- monitoring for unexpected gaps or timestamp anomalies;
- audit of audit-log access.

## 12. Priority events for a future first implementation

1. Login success, failure, logout, and session revocation.
2. Client profile viewed and updated.
3. Document uploaded, downloaded, shared, replaced, and deleted.
4. Compliance status, due date, assignee, and filing-reference changes.
5. Task assignment and status changes.
6. User, role, permission, and client-assignment changes.
7. WhatsApp authentication, document request, access grant, and denial.
8. AI query received, permitted, denied, and answered using safe metadata only.
9. Bulk export and mass download.
10. Security configuration and integration changes.

Each event needs a separate event contract before implementation.

## 13. Reporting and monitoring proposal

**NOT IMPLEMENTED.** Future read-only views may include:

- recent critical events;
- failed and denied access attempts;
- permission changes;
- high-volume downloads;
- cross-client access attempts;
- activity by user, client, director, resource, and date;
- audit ingestion failures;
- unusual activity alerts;
- events missing required context;
- retention and legal-hold status.

## 14. Open design decisions before implementation

- exact table and enum names;
- whether actor chain needs a related table;
- exact event catalogue and ownership;
- final RLS policies;
- trusted write path;
- failure behaviour if audit recording fails;
- retention durations and legal-hold process;
- masking standards;
- alert thresholds;
- archive strategy;
- monitoring ownership;
- performance and storage estimates;
- whether audit data belongs in a separate schema or project;
- disaster-recovery requirements;
- client-contract and data-subject considerations.

## 15. Future implementation gates

No implementation may begin until a separate PR provides and receives approval for:

1. final event catalogue;
2. final schema and data dictionary;
3. SQL migration script for review only;
4. RLS and permission test matrix;
5. data-masking rules;
6. retention and deletion policy;
7. application integration plan;
8. performance impact assessment;
9. rollback and incident plan;
10. staging test evidence;
11. explicit approval for database change;
12. explicit approval for deployment.

## 16. Final status

**Phase 4A is a schema draft only.**

- Database table created: **No**
- SQL executed: **No**
- Migration added: **No**
- Supabase changed: **No**
- Edge Function changed: **No**
- App/runtime changed: **No**
- Users/roles/permissions changed: **No**
- Secrets added: **No**
- Deployment performed: **No**

All future technical work remains **NOT IMPLEMENTED** until separately approved.
