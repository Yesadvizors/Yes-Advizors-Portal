# BLOCKED — `get_client_activity()` Client/Director Activity Feed

> **Status:** BLOCKED. Not implemented in Phase 4C. No function is created.
> This is a design note only. There is no migration for this feature.

## Summary

A client/director-facing activity feed (`get_client_activity()`) was proposed in Phase 4B. It is **blocked** and intentionally excluded from the Phase 4C migration set. No placeholder RPC and no intentionally-failing migration exist for it.

## Why it is blocked

A live, read-only inspection of the Yes Advizors schema established the following facts:

1. **There is no `client_members` table.** An earlier draft assumed one; that assumption was incorrect and has been removed everywhere.

2. **Client/director access is WhatsApp- and mobile-based, not auth-based.** The relevant tables are:
   - `whatsapp_access(mobile, client_id TEXT, director_id, access_level, is_active)`
   - `client_directors(id, client_id TEXT, mobile, email, ...)`
   - `wa_director_pins(mobile, client_id TEXT, pin_hash, ...)`
   These key access by **mobile number**, not by a Supabase auth user.

3. **Directors and clients currently have no reliable Supabase `auth.users` identity.** They do not log into the portal; they interact through the WhatsApp bot. For these users, inside the database:
   - `auth.uid()` is `NULL`
   - `get_app_role()` resolves to `'anon'`

4. **A JWT-based ownership check therefore cannot be safely implemented.** The Phase 4B design assumed a director/client would present a Supabase JWT carrying `app_metadata.app_role` and be identifiable via `auth.uid()`. That identity does not exist for these users, so a JWT/RPC ownership check cannot map a director/client to their client. Building the RPC against a non-existent identity (or the non-existent `client_members` table) would be unsafe and misleading.

5. **No `get_client_activity()` function is created in Phase 4C.** The feature remains blocked.

## What must be confirmed before unblocking

Choose and approve one path:

- **(a) Client web-login:** introduce real Supabase auth identities for directors/clients plus an explicit, trusted `auth_user → client` mapping table. Then a hardened SECURITY DEFINER RPC can validate `auth.uid()` and ownership.
- **(b) WhatsApp edge path:** expose client activity **only** through the `whatsapp-bot` edge function, which verifies mobile + PIN/session server-side and calls a service-side function with the resolved client. This is **not** a public JWT RPC and needs its own auth design (mobile → `whatsapp_access` → `client_id`).
- **(c) Defer:** omit a client/director activity feed entirely for now.

## Redacted output contract (for when unblocked)

When (and only when) an approved identity path exists, the feed must return a redacted, compliance-only projection of the caller's **own** client:

- Columns: `occurred_at`, `event_display`, `compliance_type`, `filing_period`, `new_status`
- Filter: `event_category = 'compliance'` and the caller's own client only
- Excluded: all actor identity fields, `metadata`, `risk_tier`, internal reference IDs, and all non-compliance categories (`auth`, `access_control`, `whatsapp_bot`, `ai_agent`, `data_export`, `audit`, `security`)

A plain SQL view is **not** acceptable unless it later passes an explicit `security_invoker = true` + RLS review.
