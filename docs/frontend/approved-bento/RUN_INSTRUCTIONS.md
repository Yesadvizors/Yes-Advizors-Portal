# Local Run Instructions

**Design implementation only — not approved for merge or deploy.**

Worktree: `D:\Claude\Claude Code\YAV2-Approved-Bento-Implementation`
Branch: `design/yav2-approved-bento-implementation` (from `sync/integration` @ `9a5810e`).

```bash
cd "D:\Claude\Claude Code\YAV2-Approved-Bento-Implementation"
npm install        # already run in this worktree
```

## Option A — Standalone preview (no login, presentational data) ⭐ recommended
```bash
npm run dev
# open (port may vary if 5173 busy):
#   http://localhost:5173/approved-bento.html
```
Shows the approved Bento shell + dashboard with the presentational adapter. Use the sidebar to
navigate (non-Dashboard items show a Phase-1 placeholder). Narrow the window for tablet (icon
rail) and mobile (drawer) behaviour.

## Option B — Behind the flag in the real app (authenticated)
```powershell
# PowerShell, process-scoped (no .env file change); requires a working Supabase env + login:
$env:VITE_APPROVED_BENTO_UI = "true"; npm run dev
# sign in → the approved Bento dashboard replaces the legacy shell.
# Unset / omit the flag → the legacy portal renders exactly as today (dark by default).
```

## Verify
```bash
npm test        # 530 pass (521 baseline + 9 bento guards)
npm run build   # clean; BentoApp is a separate lazy chunk (~21kB js / ~16kB css)
```

## Notes
- `approved-bento.html` is **dev-only**; only `index.html` is a production build input, so it is
  excluded from `dist/`.
- The preview performs no network calls and no data writes.
