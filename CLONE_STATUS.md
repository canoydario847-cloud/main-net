# Main Net desk — clone status

**Repo:** https://github.com/canoydario847-cloud/main-net  
**As of:** 2026-11-25  
**Verdict:** source is incomplete for a fresh `npm install && npm run dev`

## What is already on `main` (size-matched)

- Desk UI (`src/components/mainnet/*`) — networks, tape, cost, trace, detail
- Live snapshot model (`src/mainnet/*`)
- Preview host bridge, embedder origin, path prefix
- Shared SQL client (`src/lib/db.ts`) and migration helpers
- Auth client, gates, middleware, isolation, verify, PGLite dialect
- App-data readiness / login helpers
- Vite config, package.json (`main-net`), install-page template

## Missing before a clone boots

These paths are required by the published imports but are **not** on GitHub yet:

| Path | Why it blocks |
| --- | --- |
| `scripts/grok-pwa-shared.mjs` | Imported by `scripts/grok-pwa-plugin.mjs` / Vite PWA plugin |
| `scripts/sign-out-plan.mjs` | Imported by `src/lib/auth/client.ts` |
| `src/lib/auth/server.ts` | Imported by `verify.server.ts` |
| `src/lib/auth/popup.server.ts` | Auth popup path used in live preview |
| `src/lib/auth/gate-session.server.ts` | Gate session materialization |
| `src/lib/auth/gate-identity.server.ts` | Imported by `verify.server.ts` |
| `src/lib/auth/preview.ts` | Preview OAuth client (secret must stay **out** of public source; use env) |
| `src/lib/app-data/client.server.ts` | Connector server helpers |

Optional / non-blocking for the desk UI itself: multiplayer `p2p.ts`, browser smoke scripts, brand-check, package-lock.

## How to finish the publish

1. Restore the original workspace that still has those files (or paste them).
2. Push each file alone and verify the Git blob SHA matches local (`git hash-object`).
3. For `preview.ts`, publish only env-based placeholders — do **not** commit the preview client secret.
4. Run `npm install && npm run typecheck && npm run build` on a clean clone.

This document is an inventory only. It does not ship the missing modules.
