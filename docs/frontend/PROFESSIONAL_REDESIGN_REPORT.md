# YAV2 — Professional Frontend Redesign (Design-Only Package)

**Status:** Draft — for ChatGPT independent review and PJ approval.
**Scope:** Strictly presentational. No functional, behavioural, query, RPC, permission,
calculation, data-source, storage or audit change is included or retained.

---

## 1. Provenance

| Item | Value |
|---|---|
| Governing base SHA | `2ca7a6576a3452b91ddb00bad01bf85a58242897` (origin/sync/integration, PR #46 merge) |
| Worktree | `D:/Claude/Claude Code/YAV2-Professional-Redesign-Launch` |
| Branch | `feature/yav2-professional-redesign-launch` |
| Backend touched | **None** — no `supabase/`, migration, `.sql`, `.env`, or secret file changed |
| Supabase project access | **None** |

---

## 2. Design-system summary

A new, restrained "premium advisory" design system was introduced and coexists with the
legacy tokens in `src/index.css` (which are preserved, so unmigrated screens keep rendering).

- **`src/styles/design-system.css`** — design tokens (colour ramps, brand green `#0D7A53`,
  navy chrome, semantic status colours, typography scale, 4px spacing scale, radius, restrained
  shadows, motion, z-index) plus reusable component classes for: app shell (sidebar / topbar /
  content), page & section headers, cards, metric cards, buttons (primary/secondary/ghost/danger/
  danger-soft + sizes), form controls (input/select/textarea/field/fieldset with error + focus),
  badges (6 tones), tables (+ wrap/pagination), in-page tabs, filter bar, loading/empty/error
  states, spinner/skeleton, modal + confirm dialog, toasts, and responsive breakpoints.
- **`src/components/ui/`** — thin, **presentational-only** React wrappers (no Supabase, no data
  access): `Button`, `Badge`, `StatusBadge`, `Card`, `CardHeader`, `MetricCard`, `PageHeader`,
  `SectionHeader`, `Field`, `Input`, `Select`, `Textarea`, `LoadingState`, `EmptyState`,
  `ErrorState`, `Skeleton`, `Modal` (WAI-ARIA focus-trap, mirrors the proven
  `ServiceApplicabilityModalShell`), `ConfirmDialog`, `ToastProvider` + `useToast`.

Accessibility built in: visible `:focus-visible` rings on all interactive elements, dialog
focus-trap + focus restoration, `role`/`aria-live` on states and toasts, semantic labels,
`aria-current` on active nav, keyboard-operable metric tiles.

---

## 3. App shell (Phase 3)

The top-tab bar was replaced by a professional **sidebar console** (navy) + **topbar**
(section title, financial-year chip, user menu with logout), with collapse and a mobile
off-canvas drawer. **Preserved exactly**: the `tab`/`setTab` view-state model; every tab id,
label, icon and mount branch; the `is_admin === true` route guards (list + double-guard at
mount); `loadUser` fail-closed behaviour; unconditional `<ChatAgent />`; the
`v_firm_dashboard` select (no `due_soon`). All nine destinations remain reachable; nav labels
and icons are unchanged from baseline. Verified by `tests/appShellRuntime.test.js` (R1–R7 pass).

---

## 4. Pages redesigned

| # | Page / module | Depth | Notes |
|---|---|---|---|
| 1 | App shell (`App.jsx`) | Full | Sidebar + topbar + user menu + FY chip; auth/reset screens restyled |
| 2 | Login | Full | Premium dark sign-in; all three modes + handlers preserved |
| 3 | Dashboard | Full | Metric grid, attention banner, workload & due-week panels, states |
| 4 | Clients (list) | Full | Register **table**, filter bar, states, pagination; detail modal preserved |
| 5 | Tasks | Full | Header, filter bar, work-type/quick chips, task rows, checklist, states |
| 6 | Team | Full | Header, member cards, admin login actions, feedback, banners |
| 7 | Firm Overview (`AdminHome`) | Full | Accent unified to brand green; `PageHeader`; metrics/panels/alerts |
| 8 | API Usage | Full | Header + range control, stat cards, feature/day bars, states |
| 9 | Documents (`DocumentsHub`) | Full | Header, stats, filter toolbar, table, states; upload modal restyled |
| 10 | Compliance | Header/nav | Page header + segmented tabs restyled; dense internal trackers retain layout |
| 11 | Audit Log | Header | Page header restyled; dense event table retains layout |

**Remaining visual gaps (recommended follow-up, design-only):** deep restyle of the internal
Compliance tracker tables, `AuditLog` event table, `OnboardingWizard`, `WorkDocuments`,
`DocumentManager`, `ChatAgent`, and the remaining task/compliance modals
(`AddTaskModal`, `FollowUpModal`, `HistoryModal`, `MarkFiledModal`). These already inherit the
refined shell, tokens and fonts; they were left structurally intact this pass to keep the
package strictly presentational and low-risk.

---

## 5. Feature-preservation matrix (page-level)

Every row: **Query/handler changed? = No · Permission changed? = No · Result = Preserved.**

| Page/Module | Existing features (retained) | Redesigned presentation | Query/handler changed? | Permission changed? | Result |
|---|---|---|---|---|---|
| App shell | tab nav, admin gates, loadUser, ChatAgent, logout | sidebar/topbar/user-menu | No | No | Preserved |
| Login | sign-in, forgot, sent; domain guard; team fail-closed | premium dark card | No | No | Preserved |
| Dashboard | 3 queries + view, metrics, error/retry, workload, due-week | metric cards + panels | No | No | Preserved |
| Clients | load, search, pagination, view/edit, PIN reset, resync, directors, docs | table register + states | No | No | Preserved |
| Tasks | load, filters, markDone, checklist toggle, follow-up/history modals | filter bar + rows | No | No | Preserved |
| Team | load, taskCount, reset password, create-login (flag off) | member cards | No | No | Preserved |
| AdminHome | 8 parallel counts, definitions, alerts, upcoming | brand-aligned panels | No | No | Preserved |
| Usage | load, pricing/aggregation, range filter | stat cards + bars | No | No | Preserved |
| DocumentsHub | load, filters, view/download/delete, upload+rollback | table + toolbar | No | No | Preserved |
| Compliance | 3 sub-views, trackers, FY logic, mark-filed | header + tabs | No | No | Preserved |
| Audit Log | query, filters, admin gate, self-audit | header | No | No | Preserved |

## 6. Feature-preservation matrix (file-level)

| File | Visual changes | Functional changes | Tests protecting it | Result |
|---|---|---|---|---|
| `src/styles/design-system.css` | NEW tokens/classes | none | — | Visual only |
| `src/components/ui/*` | NEW presentational components | none | full suite (scanned) | Visual only |
| `src/main.jsx` | + CSS import | none | — | Visual only |
| `src/App.jsx` | sidebar shell | none | appShellRuntime R1–R7 | Visual only |
| `src/components/Dashboard.jsx` | cards/panels/states | none | rapidLaunchFrontendFixes FE-H2 | Visual only |
| `src/components/Clients.jsx` | table/filter/states | none | rapidLaunchFrontendFixes FE-H1/H2/L1 | Visual only |
| `src/components/Tasks.jsx` | filter/rows/checklist | none | (AddTaskModal guarded separately) | Visual only |
| `src/components/Team.jsx` | cards/banners | none | — | Visual only |
| `src/components/AdminHome.jsx` | header/accent | none | — | Visual only |
| `src/components/Usage.jsx` | header/cards/bars | none | — | Visual only |
| `src/components/DocumentsHub.jsx` | header/table/states | none | — | Visual only |
| `src/components/Compliance.jsx` | header/tabs | none | compliance*/complianceTabs | Visual only |
| `src/components/AuditLog.jsx` | header | none | phase4cAuditReconciliation | Visual only |

---

## 7. Functional changes reverted during scope correction

An earlier exploratory pass introduced five functional edits; all were reverted to baseline so
this package is strictly design-only:

1. `helpers.js` — removed a new central `getComplianceDueMeta` helper (file restored to baseline).
2. `Clients.jsx` — restored the original director-source precedence (`client_directors ‖ clients.directors`).
3. `Clients.jsx` — restored the original PIN-reset error handling.
4. `Dashboard.jsx` — restored the original workload bar-width calculation; removed a "View all" nav button.
5. `App.jsx` — restored the original password-reset error message.

---

## 8. Observed but not addressed — outside design-only scope

Read-only findings from the earlier investigation, **explicitly not implemented** here. Each
requires functional and/or backend work under a separate governed package:

- **FE-H3 (client lifecycle):** `OnboardingWizard.jsx` coerces non-draft saves to `status='Active'`;
  a safe, audited Deactivate/Reactivate needs a new `client_set_status` RPC emitting the already-seeded
  `client.status_transition` audit event. **Not implemented.**
- **FE-H4 (director/promoter sources):** `clients.directors` (jsonb) is the only source the write
  path maintains; `client_directors` is read first but never written (stale); `client_persons` is
  empty (no backfill). Canonical reconciliation needs the deferred D3 backfill migration. **Not implemented.**
- **Compliance definitions:** overdue/due-soon rules diverge across panels (excluded-status sets and
  date field); two items (stale `compliance_calendar` snapshot columns; runner seeding from
  `standard_due_date` only) require server-side fixes. **Not implemented / no calc changed.**
- **Documents:** `WorkDocuments.jsx` lacks a storage rollback on insert failure, and several upload
  paths surface raw `error.message`. Rollback for `completed-work` is also backend-blocked (bucket not
  provisioned live). **Not implemented / no upload/error flow changed.**

*(The "Deactivate client" modal in the showcase is a design-system demonstration of the ConfirmDialog
component only; it is not wired to any action and no lifecycle behaviour ships.)*

---

## 9. Tests, build, gates

- **Full test suite:** `npm test` → **383 pass / 0 fail** (unchanged from this branch's baseline;
  no test added, removed, or weakened).
- **Production build:** `npm run build` → success (~2.2s). CSS bundle 0.55 kB → ~21 kB (design system).
- **Gates:** `git diff --check` clean; no `supabase/`/migration/`.sql` change; no `.env`/secret file;
  no hardcoded secret in diff; no Supabase project access.

---

## 10. Accessibility & responsive

- **Accessibility:** visible focus rings; dialog focus-trap + restoration; `role`/`aria-live` on
  states & toasts; `aria-current` on active nav; semantic labels; keyboard-operable tiles; status is
  never colour-only (dot + text); destructive actions use confirm dialogs.
- **Responsive:** `@media max-width:900px` collapses the sidebar to an off-canvas drawer with a
  hamburger + scrim; `max-width:560px` stacks the metric grid to two columns, stacks modal footers,
  hides the FY chip / user name. Wide content (tables) scrolls inside `overflow-x:auto` wrappers.

---

## 11. Visual evidence (local render, no deploy)

Rendered locally via `npm run dev` against `docs/frontend/redesign-evidence/showcase.html` — a
standalone page that links the **actual shipped** `src/styles/design-system.css` (no app boot, no
Supabase). Verified at desktop width (1440px):

- App shell (sidebar + topbar + FY chip + user), dashboard metric cards with accent rails,
  attention banner, team-workload bars, due-this-week list, clients register table + pagination.
- Component gallery: buttons, badges, form fields (incl. inline error), loading/empty/error states,
  and the confirmation modal.

Reproduce: `npm run dev`, open `http://localhost:5173/docs/frontend/redesign-evidence/showcase.html`.

*Note: the real authenticated app cannot be rendered without Supabase credentials
(`src/supabase.js` throws on missing env by design), which is out of scope; hence the
credential-free showcase.*

---

## 12. Recommendation

**PASS WITH SPECIFIC CORRECTIONS** — the package is a substantial, coherent, strictly-visual
redesign with all features preserved, all tests green, and a clean build. Suggested corrections
before merge are limited to **visual follow-ups** (Section 4 "remaining gaps": deep restyle of
Compliance/Audit internal tables and the remaining modals/wizard) and **independent visual QA**
across live authenticated screens once a non-production preview with approved credentials is
available. No functional or backend change is proposed by this package.
