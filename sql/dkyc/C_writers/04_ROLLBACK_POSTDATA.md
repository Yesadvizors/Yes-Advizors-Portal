# Package C — POST-DATA rollback (non-destructive)
Once DIRECTOR_KYC documents, upload intents, or snapshots exist:
- DO NOT drop the delete-block trigger casually if you want to preserve deletion protection;
  to intentionally remove protection, drop trg_dkyc_block_doc_delete only.
- DO NOT drop dkyc_finalize_document_upload/prepare while intents are mid-flight; instead REVOKE
  EXECUTE from authenticated to disable new uploads, leaving existing documents intact.
- Snapshots are append-only (Package A trigger) and are never deleted by rollback.
- All C functions are NEW (no prior definition existed), so there is nothing to restore; disabling =
  REVOKE EXECUTE, removal = DROP FUNCTION by the exact signatures in 04_ROLLBACK_PREDATA.sql.
- To reverse only the document-ownership behaviour without data loss, replace
  dkyc_finalize_document_upload with a corrective forward version; do not delete documents rows.
- Reused functions (dkyc_create_kyc_record, dkyc_override_due_date, dkyc_advance_stage,
  dkyc_assign_record, dkyc_log) are NOT modified by Package C and must NOT be dropped by its rollback.
