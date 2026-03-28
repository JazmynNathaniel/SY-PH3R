# SY-PH3R

SY-PH3R is a privacy-first, invite-only communication app for a trusted circle of up to five members. This repository contains a production-minded MVP scaffold focused on clear trust boundaries, end-to-end-encryption-ready transport, and a minimal attack surface.

## Product Summary

SY-PH3R is a private digital room for thoughtful conversation between a tiny approved group. The MVP centers on one shared room, optional direct messages, per-device identity, controlled member expression, and secure onboarding without public discovery.

## Tagline

Quiet minds. Trusted circle.

## Brand Description

SY-PH3R should feel calm, discreet, modern, and slightly mysterious. The visual language takes cues from early-2000s personal web culture, but filtered through a clean premium interface: soft gradients, panels, badges, and profile expression inside tightly controlled safe templates.

## Recommended Tech Stack

- Client: React, TypeScript, Vite, CSS variables, local encrypted storage abstraction
- Relay API: Fastify, TypeScript, Zod for config validation
- Shared contracts: TypeScript package for domain types and trust-model constants
- Storage: SQLite for relay metadata and invite/device/session records in the MVP
- Realtime transport: WebSocket relay for encrypted envelopes
- Crypto path: audited browser/device crypto primitives via Web Crypto and vetted libraries in a later hardening pass

## Architecture Overview

- Client-first application logic with strict separation between UI, domain logic, storage, and transport
- Relay-only backend that stores metadata and encrypted envelopes, never readable plaintext messages
- Per-device identity and invite flow as the root of trust for membership
- Local-first drafts and encrypted local persistence for better offline behavior
- Constrained personalization model with predefined themes/layouts and no arbitrary code execution

## Folder Structure

```text
apps/
  relay/      Fastify relay API and service layer
  web/        React client shell and screen architecture
docs/
  architecture.md
packages/
  shared/     Shared types, limits, and domain contracts
```

## Deployment Summary

- Frontend deploy target: Vercel
- Frontend app: `apps/web`
- Shared workspace dependency: `packages/shared`
- Relay boundary: separate service from the Vercel-hosted frontend
- Required frontend env var: `VITE_RELAY_URL`

Vercel configuration is defined in `vercel.json`. Frontend deployment notes are documented in `docs/deployment.md`.

## MVP Scope

- Invite-only onboarding for up to five total members
- Single private room for the group
- Optional direct messages between approved members
- Device registration and verification flow design
- Session/device revocation model
- Disappearing-message policy metadata
- Privacy-safe notification placeholders
- Offline-friendly drafting
- Controlled profile personalization
- Client-side encrypted room messaging using a shared room secret

## Storage Plan

- Relay stores only the minimum metadata required for invites, members, devices, sessions, and encrypted message envelopes
- Message bodies are treated as ciphertext payloads from the relay perspective
- Client owns draft state and local encrypted cache
- Drafts can be encrypted locally before browser persistence using a user-provided unlock phrase
- Room messages are encrypted client-side before relay submission and decrypted client-side after sync
- No cloud backup by default
- No plaintext message storage on the backend

## Security Model

- Privacy-first and invite-only by default
- End-to-end encrypted by design, with relay boundaries documented explicitly
- No public signups, searchable usernames, or public profiles
- No third-party trackers or analytics in this scaffold
- Secrets stay in environment variables and `.env` files are ignored by git
- Known limitation: this scaffold defines secure boundaries and interfaces, but full audited message crypto, key rotation, and cross-device recovery remain future hardening work
- Current local draft protection is browser-based passphrase encryption, not OS-backed secure enclave storage
- Device verification now uses per-device signing keys, but the operator bootstrap session route is development-only scaffolding and must be replaced before production
- Room encryption currently depends on a manually shared room secret rather than a full multi-device key exchange protocol

## API and Service Design

- `GET /health` service health and deployment sanity check
- `POST /v1/invites` create invite metadata for an approved member slot
- `POST /v1/invites/redeem` redeem invite and register a member/device
- `POST /v1/devices/verify` verify a device using QR or secure code flow metadata
- `POST /v1/sessions/revoke` revoke an active device or session
- `GET /v1/rooms/main` fetch room metadata and approved membership state
- `POST /v1/messages/envelopes` accept encrypted message envelopes only
- `GET /v1/messages/envelopes` fetch encrypted envelopes for sync

## UI Screen Map

- Landing / trust summary
- Invite acceptance
- Device verification
- Main private room
- Direct message thread
- Member profile card and safe personalization settings
- Devices and sessions management
- Security and disappearing message preferences

## Implementation Roadmap

1. Lock the trust model, limits, and service boundaries.
2. Scaffold client, relay, and shared package structure.
3. Implement invite/member/device/session domain models.
4. Build the app shell and key screens with constrained personalization.
5. Add relay routes and storage interfaces for encrypted envelopes.
6. Integrate real crypto and delivery guarantees in a hardening phase.

## Risk Notes

- This MVP scaffold is encryption-ready, not yet a full audited secure messenger.
- For a serious production deployment, add independent security review, key backup strategy, abuse recovery planning, and stronger transport authentication.
- If mobile clients are required, a native secure-storage strategy should be chosen before broad rollout.
- For Vercel deployment, do not put relay secrets into client-side `VITE_*` variables. Keep server-only configuration on the relay deployment.
