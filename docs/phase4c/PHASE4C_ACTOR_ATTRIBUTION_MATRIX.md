# Phase 4C v6 — Actor-Attribution Matrix

| Event path | Actor type | Database-verified identity | Backend-asserted identity | Current limitation |
|---|---|---|---|---|
| Trusted backend (all service events: auth/user/access/data/security/audit-export/whatsapp/ingestion-failure) | service | none — only that the caller holds `service_role` | `actor_service='trusted-backend'` (hard-coded) | service_role proves trusted backend access, NOT which component called; per-component provenance needs later app/Edge Function design |
| Sensitive audit read (audit.log.read_requested / read_completed) | user | `actor_user_id = auth.uid()`, `actor_app_role = get_app_role_for_user(auth.uid())` from the SAME identity; Admin enforced | none | written only by the self-contained reader about its own execution; not a generic logger |

## Honest statements
- `service_role` proves **trusted backend access**. It does **not** prove which internal component (ai-agent, whatsapp-bot, n8n, cron, admin-backend) made the call. v6 records a single honest `trusted-backend` identity rather than multiple labels implying stronger verification.
- The only **database-verified** identity is the user behind the Admin audit read, via `auth.uid()`.
- Service-specific provenance, and any user-attributed *business* event, require a later application/Edge Function architecture change (verified JWT forwarding or per-service credentials). These are **Blocked / future integration** and are not implemented in SQL here.
- `target_user_id` is canonical top-level and separate from the actor; never duplicated in metadata.
