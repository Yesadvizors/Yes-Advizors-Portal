# Live V2 relation/view absence evidence

Environment: Supabase V2 / yav2-dev
Project ref: ogjrwemjefvccpyjwxuo
Collection method: PJ-executed SELECT-only queries.

## Query A: pg_views check

Requested names:
- public.v_client_overview
- public.v_client_service_applicability
- public.v_sensitive_audit_log

Observed result: No rows returned.

## Query B: pg_class broader relation-type check

Requested names:
- public.v_client_overview
- public.v_client_service_applicability
- public.v_sensitive_audit_log

Observed result: No rows returned.

Conclusion supported by the two outputs:
The three names were absent from public as ordinary views and also absent as relations in pg_class at collection time.

## Separate v_team_workload check

Observed raw result:

```json
[
  {
    "v_team_workload_present": 0
  }
]
```

Conclusion supported by the result:
public.v_team_workload was absent at collection time.
