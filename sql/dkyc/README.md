# Director KYC — SQL Review Packages

> **These files are for review only.**
> SQL execution on hosted Supabase is **separately approval-gated** and has NOT been authorised by this PR.
> Do not apply these migrations until Pankaj gives explicit approval for the SQL execution stage.

## Apply sequence (when approved)

Each package has four files. Run them in order, each in its own transaction:

```
01_PREFLIGHT.sql   → read-only checks that preconditions are met; aborts if anything is wrong
02_MIGRATION.sql   → the actual schema / function changes  (BEGIN … COMMIT)
03_VALIDATION.sql  → post-apply assertions confirming every object landed correctly
04_ROLLBACK_PREDATA.sql → reversal script (safe before any live data is written)
04_ROLLBACK_POSTDATA.md → non-destructive recovery notes (after data exists)
```

Apply packages in this order:
1. **A_database** — new columns on `director_kyc_records`; `director_kyc_calc_snapshot`;
   `director_kyc_upload_intents`; `director_kyc_documents` bridge table;
   `uq_dkyc_periodic_holder_cycle` unique index.
2. **B_rpcs** — classification engine, status resolvers, list readers, document reader.
3. **C_writers** — filing, verification, interpretation, upload prepare/finalise, cancel,
   initial-obligation creation.

Package D (frontend) is in `src/components/` — deployed by Vercel on merge.
Package E (Edge Function) is in `supabase/functions/dkyc-verify-upload/SECURITY_SPEC.md` — deployment is separately gated.

## Frozen baseline

This SQL is derived from review archive **v5** (SHA-256 `96c3f8dc1457...`), approved by Pankaj on 16 June 2026.
