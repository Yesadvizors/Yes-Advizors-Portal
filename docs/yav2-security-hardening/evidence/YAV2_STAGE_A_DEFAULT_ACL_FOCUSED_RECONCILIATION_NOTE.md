# YAV2 Portal V2 — Stage A — Focused Default-ACL Reconciliation Note

**Status:** evidence record. **No Supabase access by Claude, no SQL executed.** PJ ran the focused SELECT-only
default-ACL reconciliation live.
**Target:** `yav2-dev` / ref `ogjrwemjefvccpyjwxuo`. **V1/Production `zcszesuvjrryxtigjglt` NOT used.**
**Method:** SELECT-only. **No database change.**
**Raw evidence (verbatim):** `YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`
(SHA-256 `309760ea680adc677a6ba656fc0cf36b58a0cc5d6d1f53b2aea9d8d2fc85801e`).

---

## Purpose

This focused query **reconciles the incomplete 100-row [D1] capture against [D2]**. The earlier 100-row D1
export was **truncated relative to the full default-ACL catalogue** (it did not include the
`supabase_admin`/`public` and `graphql_public` rows). This focused, scope-specific query supplies the
**decisive public-scope facts**.

## Result (counts)

| Scope | anon object-level default rows |
|---|---|
| `postgres` / `public` (control) | **4** |
| `supabase_admin` / `public` only | **4** |
| `supabase_admin` / `graphql` only | **4** |
| `supabase_admin` / `graphql_public` | **4** (in the all-scopes list) |
| `supabase_admin` global / all-schemas (`defaclnamespace = 0`) | **0** |

The `supabase_admin_anon_object_defaults_all_scopes` list contains **12 rows** (graphql 4, graphql_public 4,
public 4), each `is_grantable=false`, privilege ∈ {MAINTAIN, REFERENCES, TRIGGER, TRUNCATE}, with
`schema_oid` public=`2200` / graphql=`16578` / graphql_public=`16567` and `default_acl_oid`
public=`16496` / graphql=`16589` / graphql_public=`16569`.

## Confirmed conclusions

- **[D2] is CONFIRMED:** `supabase_admin` / `public` / `anon` object-level defaults = **4** (matching the
  recorded D2 `supabase_admin = 4`, which is public-scoped).
- **Part B public scope is CONFIRMED valid:**
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE … FROM anon` targets a real,
  existing public-scoped default (4 object rows).
- **Part A remains valid:** `postgres` / `public` / `anon` object defaults = **4**.
- **`graphql` and `graphql_public` defaults exist but are OUTSIDE Stage A** (public-schema only) and **must
  remain untouched** by this package.
- **No global/all-schema (`defaclnamespace = 0`) supabase_admin anon object default** exists (count = 0).

## Relationship to the 100-row D1 capture

The 100-row [D1] capture is **preserved verbatim** as the exact captured/exported output. It is labelled as an
**incomplete/truncated** catalogue capture (the truncation was in the captured/exported result, **not** in
PJ's process). The absence of `supabase_admin`/`public` rows in that 100-row export does **not** prove those
defaults are absent — this focused reconciliation shows they exist (4). This note + the focused raw JSON are
the authoritative public-scope evidence.
