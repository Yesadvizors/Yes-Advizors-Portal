# Package A — POST-DATA rollback treatment (non-destructive)
Once director_kyc_calc_snapshot or director_kyc_upload_intents hold rows, or evidence
columns are populated:
- DO NOT drop columns/tables (evidence/audit loss).
- Disable the new RPCs (Packages B/C) by restoring their prior version / revoking EXECUTE,
  leaving the data in place.
- For an unwanted column, stop writing to it (RPC change) rather than dropping it.
- director_kyc_calc_snapshot is append-only and is never dropped post-data.
- Use a forward corrective migration for any schema change that would otherwise risk
  evidence loss. CHECK catalogues may be widened (drop+recreate superset) non-destructively;
  never narrowed below stored values.
