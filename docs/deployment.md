# Vercel Deployment

## Overview

SY-PH3R is structured so the frontend can deploy independently on Vercel.

- `apps/web` is the Vercel-hosted client
- `packages/shared` provides build-time shared types and contracts
- `apps/relay` is not deployed to Vercel as part of the frontend build

This keeps deployment simple and avoids coupling the UI to an always-on custom server inside the Vercel project.

## What Runs Where

### Client-side on Vercel

- chat UI and navigation
- theme switching and appearance customization
- local session token storage
- local draft vault handling
- message encryption/decryption boundaries in the client
- optional future sound settings and other preferences

### Server-side outside the client bundle

- invite issuance and redemption
- device/session verification
- ciphertext envelope relay
- relay-side metadata persistence

The backend boundary remains relay-only: readable message plaintext should never be stored on the backend.

## Vercel Build Configuration

Root config is defined in `vercel.json`.

- install command: `npm ci --workspaces --include-workspace-root`
- build command: `npm run build --workspace @sy-ph3r/web`
- output directory: `apps/web/dist`

This keeps the build pinned to the monorepo root and makes npm workspace resolution explicit, which is required so `apps/web` can resolve `packages/shared` and the frontend dependency graph consistently on Vercel.

## Environment Variables

### Public client variables

These are exposed to the client bundle and must not contain secrets.

- `VITE_RELAY_URL`
  Base URL for the relay or external backend service used by the frontend.

Example:

```env
VITE_RELAY_URL=https://your-relay-service.example.com
```

### Server-only variables

These belong on the relay deployment only, not in the Vercel frontend project.

- `SESSION_SECRET`
- `DB_PATH`
- any future signing keys, operator credentials, or server-side service tokens

## Routing Notes

The current frontend does not use React Router path-based navigation. It is a single Vite entry with in-app view switching, so no SPA rewrite rule is required for refreshes right now.

If path-based client-side routing is added later, add a Vercel rewrite so direct navigation resolves to the frontend entry point.

## Deployment Steps

1. Import the GitHub repo into Vercel.
2. Leave the project root at the repo root so workspace resolution continues to work.
3. Set `VITE_RELAY_URL` in the Vercel project settings.
4. Deploy.

## Caveats

- The frontend deploys cleanly on Vercel, but the relay is a separate service boundary.
- The frontend will fail gracefully with a clear error if `VITE_RELAY_URL` is missing in production.
- Do not place relay secrets in `VITE_*` variables.
- If future backend logic is moved closer to Vercel, prefer minimal Vercel Functions for narrow privacy-aware tasks, not a plaintext message backend.
