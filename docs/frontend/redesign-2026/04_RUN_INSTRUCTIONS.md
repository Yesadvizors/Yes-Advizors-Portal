# Local Run Instructions

**Design prototype only — not approved for portal-wide migration or merge.**

Worktree: `D:\Claude\Claude Code\YAV2-2026-Design-Prototype`
Branch: `design/yav2-2026-premium-prototype` (from `sync/integration` @ `9a5810e`)

## Prerequisites

```bash
cd "D:\Claude\Claude Code\YAV2-2026-Design-Prototype"
npm install          # already run in this worktree
```

## Option A — Standalone preview (no login, mock data) ⭐ recommended

No Supabase credentials required. The prototype mounts with a mock user.

```bash
npm run dev
# open the DEV-ONLY preview entry (port may vary if 5173 is busy):
#   http://localhost:5173/prototype.html      → full prototype (Dashboard default)
#   http://localhost:5173/responsive.html     → tablet 960px + mobile 390px gallery
```

In `prototype.html`, use the left sidebar to switch **Dashboard → Client Master → Client 360**.
Try the sidebar **Collapse** button (desktop), and narrow the window to see the drawer.

## Option B — Behind the flag inside the real app

Renders the prototype for an **authenticated** user (requires a working Supabase env + login;
those credentials are out of scope for this design package).

```bash
# PowerShell (process-scoped, no .env file change):
$env:VITE_REDESIGN_2026 = "true"; npm run dev
# then sign in → the flagged prototype shell replaces the legacy shell.
# Unset / omit the flag → the legacy portal renders exactly as today.
```

The flag is **dark by default**: with it unset, behaviour is identical to `sync/integration`.

## Verify

```bash
npm test          # 533 tests (521 baseline + 12 prototype guards) — all pass
npm run build     # clean; RedesignApp is a separate lazy chunk (~28kB js / ~22kB css)
```

## Notes

- `prototype.html` and `responsive.html` are **dev-only**; only `index.html` is a production
  build input, so neither ships in `dist/`.
- Everything is mock-driven: no network calls, no data writes.
