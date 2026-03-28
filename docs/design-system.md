# SY-PH3R Design System

## 1. Design System Overview

SY-PH3R uses a restrained cyberpunk command-room language: black and green surfaces, terminal metadata, tactical framing, low-opacity ambient motion, and readable content zones. The shell carries the atmosphere. Message-heavy areas stay calmer, flatter, and more legible.

Core principles:

- cinematic shell, quiet reading surface
- dark premium materials with controlled glow
- terminal metadata and monospace accents without full hacker parody
- safe expressive modules for identity and profile presence
- motion as signal, not decoration

## 2. CSS Variable Tokens

Core tokens now live in [`apps/web/src/globals.css`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/globals.css#L1).

Primary token groups:

- surfaces: `--background`, `--background-elevated`, `--panel`, `--panel-2`
- structure: `--border`, `--border-strong`, `--shadow`
- type: `--text-primary`, `--text-secondary`, `--text-muted`
- signals: `--accent-primary`, `--accent-secondary`, `--alert`
- ambient: `--grid-line`, `--scan-line`

## 3. Tailwind Theme Extension Suggestions

Current implementation uses Tailwind v4 inline theme tokens rather than a separate `tailwind.config.ts`.

Recommended future extension groups:

- spacing aliases: `panel`, `module`, `shell`
- radius aliases: `terminal`, `module`, `shell`
- shadow aliases: `signal`, `panel`, `hero`
- animation aliases: `signal-pulse`, `scan-sweep`, `panel-reveal`, `ambient-scroll`
- semantic colors: `success`, `secure`, `warning`, `device`, `relay`

Suggested future utilities:

- `bg-shell`
- `bg-terminal`
- `border-signal`
- `text-signal`
- `shadow-signal`
- `animate-scan`
- `animate-signal-pulse`

## 4. Component Style Map

Implemented example primitives:

- app shell: [`app-shell.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/app-shell.tsx#L1)
- profile card: [`profile-card.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/profile-card.tsx#L1)
- chat panel: [`chat-panel.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/chat-panel.tsx#L1)
- message item: [`message-item.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/message-item.tsx#L1)
- security status badge: [`security-status-badge.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/security-status-badge.tsx#L1)
- invite / verification card: [`invite-verification-card.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/components/ui/invite-verification-card.tsx#L1)

Visual behavior map:

- shell: strongest atmosphere, animated data field, status framing
- profile modules: expressive but bounded, framed and high-contrast
- chat panel: calmer panel contrast and simpler card hierarchy
- message items: highest readability, lowest visual noise
- badges: small signal-state objects, monospace metadata, glow-driven states
- invite / verification: segmented terminal blocks and security-state emphasis

## 5. Motion Guidelines

Motion implementation uses `motion/react`.

Rules:

- panel reveals: 180ms to 500ms, eased, mostly fade + slight rise
- status pulses: slow opacity breathing, 3s to 5s loop
- ambient motion: long linear loops, low-opacity only
- hover behavior: subtle glow increase, 2px to 4px movement max
- route transitions: panel dissolve and rise, not aggressive zoom
- message timeline: avoid jitter, springy motion, or constant animation

Allowed effects:

- reveal
- fade
- pulse
- line sweep
- ambient scroll
- hover glow

Avoid:

- rapid flashing
- blinking text
- constant motion behind reading areas
- noisy particle clouds over content

## 6. Layout Guidance For Key Screens

Splash / welcome:

- full atmospheric shell
- large title block
- signal badges
- motion-heavy background layer

Invite / onboarding:

- terminal card stack
- security status strip
- form areas with segmented module framing

Main room:

- two-zone hierarchy
- stable message feed
- narrow composition input band
- reduced ambient effects behind the timeline

Profile / identity:

- framed media card
- preset theme surfaces
- metadata chips and signal-state slots

Settings / security:

- denser grid
- more monospace labels
- segmented device/session rows
- stronger indicator language

## 7. Reusable Class Naming Strategy

Use `sy-` prefixed semantic classes for visual identity primitives and Tailwind utilities for structure.

Examples:

- `sy-shell`
- `sy-panel`
- `sy-panel-glow`
- `sy-divider`
- `sy-terminal-label`
- `sy-code-text`
- `sy-noise`

Guideline:

- semantic classes own atmosphere and repeated identity styling
- Tailwind utilities handle layout, spacing, sizing, and responsive behavior
- component files define variants with `class-variance-authority`

## 8. Starter globals.css

Starter globals are implemented in [`apps/web/src/globals.css`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/globals.css#L1).

It provides:

- root tokens
- Tailwind v4 inline theme mapping
- shell and panel identity classes
- scanline / noise / grid ambience
- terminal label and code-text utilities

## 9. Example Themed Components

Foundation examples now render in [`apps/web/src/App.tsx`](/C:/Users/Jonathan/SY-PH3R/apps/web/src/App.tsx#L1).

Included examples:

- app shell with ambient grid and signal lines
- profile card module
- chat panel with message items
- security status badge
- invite / verification card
- token blocks and terminal strips for system framing

## Notes

- This pass establishes the visual foundation and reusable primitives.
- It does not yet convert the full messaging/product workflow into Tailwind-based production screens.
- The next UI pass should migrate the active invite, device, vault, and room flows onto these primitives instead of the previous mixed scaffolding.

