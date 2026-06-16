# Package E — Edge Function security specification (REVIEW ONLY — NOT DEPLOYED)
# No Edge Function deployment and no service-role expansion is approved by this document.
# Blocker 2: exactly ONE identity architecture is specified and locked below. No others remain.

## Function
- Name: `dkyc-verify-upload`
- Files: `supabase/functions/dkyc-verify-upload/index.ts`, `supabase/functions/_shared/cors.ts`
- Single responsibility: verify an uploaded object in `secure-docs` against an upload intent, then
  call the service-role-only finalise RPC. Nothing else.
- `verify_jwt`: TRUE (this is an authenticated end-user function, not a public webhook).

## THE ONE IDENTITY ARCHITECTURE (locked)
1. **Calling client:** the browser (DirectorKYCDetailModal) calls `POST /functions/v1/dkyc-verify-upload`
   with the END USER's Supabase access token in `Authorization: Bearer <jwt>` (forwarded from
   supabase.auth.getSession()). Body: `{ intent_id, doc_name }`.
2. **JWT / credential at the edge:** the function creates TWO clients:
   - an *auth client* using the forwarded user JWT (anon key + Authorization header) — used ONLY to
     resolve identity: `auth.getUser()` -> the end user's `auth.uid()`;
   - a *service client* using `SUPABASE_SERVICE_ROLE_KEY` (from function secrets) — used for storage
     metadata read, orphan-object delete, and the finalise RPC call.
3. **Resulting auth.uid():** comes from the forwarded user JWT (step 2 auth client). The service client
   is NOT used to impersonate; it has no `auth.uid()`.
4. **Actor binding:** the function maps `auth.uid()` -> active Admin/Manager `team` row, taking
   `team.id` as the **verifier actor**. It passes that `team.id` as `p_verifier_actor` to the finalise
   RPC. The RPC independently re-validates that `p_verifier_actor` is an active Admin/Manager AND equals
   `intent.created_by`. Thus the service role does NOT auto-map to a team member — the originating actor
   is explicit, bound to the intent creator, and re-checked in SQL.
5. **Verifier proof:** the proof that verification happened is structural, not a bearer secret:
   finalise is `service_role`-EXECUTE-only (authenticated is revoked), so ONLY this function can call it;
   and it must present a valid `(intent_id, p_verifier_actor=intent.created_by)` pair plus
   storage-reported size/mime that match the intent. A browser cannot call finalise at all.
6. **Replay protection:** the intent is single-use. Finalise flips PREPARED->FINALIZED atomically;
   a replayed request hits the FINALIZED branch and returns the existing bridge row (idempotent no-op).
   Expired/cancelled intents are rejected (INTENT_EXPIRED / INTENT_CANCELLED).

## Step sequence (and where each check lives)
1. CORS preflight (shared).
2. JWT verification (auth client `auth.getUser()`); reject if missing/invalid -> 401.
3. Active Admin/Manager check on the `team` row for that uid; else 403. Capture `team.id` (verifier actor).
4. Load intent (service client) by `intent_id`; 404 if absent.
5. Ownership + state + expiry: `intent.created_by == team.id`; `status=='PREPARED'`; `expires_at>now`.
   Wrong owner -> 403; expired -> mark EXPIRED + 410; finalized -> treat as idempotent success (re-read).
6. Bucket + exact path: object must be in `secure-docs` at EXACTLY `intent.approved_storage_path`
   (no prefix/wildcard; reject traversal).
7. Object existence + metadata (service client Storage API): 404 if missing; read size + content-type.
8. MIME allowlist + size cap: content-type in {application/pdf,image/jpeg,image/png};
   0 < size <= min(intent.expected_file_size, 5 MB); content-type == intent.expected_mime_type.
9. Optional checksum: if client supplied a SHA-256, compare to storage-reported hash.
10. Finalise: call `dkyc_finalize_document_upload(intent_id, team.id, doc_name, object_size, object_mime)`
    via the SERVICE client (service_role EXECUTE). RPC re-validates everything and writes the documents
    row + director_kyc_documents bridge row, flips the intent, logs KYC_DOCUMENT_ATTACHED.
11. Cleanup on failure (steps 6-9): delete the orphan object (service client) or enqueue a cleanup item;
    never leave a documents/bridge row. Abandoned PREPARED intents are swept to EXPIRED by a scheduled task.

## Service-role secret handling
- `SUPABASE_SERVICE_ROLE_KEY` only in function secrets; never in client, repo, or chat.
- Used solely for: storage metadata read, orphan-object delete, finalise RPC. No table writes outside the RPC.
- Least privilege: no schema changes; no storage policy changes; no other RPC granted to service_role.

## Logging & audit
- Success -> finalise RPC emits KYC_DOCUMENT_ATTACHED to activity_logs.
- Verify failure -> function structured log; never logs secrets or file bytes.

## Deployment & rollback
- Deploy as its own versioned function; frontend keeps the upload UI behind a flag until live.
- Rollback = disable/redeploy prior version. No DB destructive action. Prepared intents simply expire.
- Because finalise is service_role-only, disabling the function fully stops new finalisations.

## Explicitly NOT in scope / NOT approved here
- No widening of any `storage` schema grant to the SQL `postgres` role.
- No change to the existing WhatsApp Edge Function or its token.
- No service-role use beyond the three operations above. No second deployment shape.
