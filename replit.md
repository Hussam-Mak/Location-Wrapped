# Location Wrapped

A mobile-first personal location-history app that begins recording when the visitor grants browser location access, with a separate sample experience.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/location-wrapped run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The Wave 1 web app is frontend-only and does not require a database connection. The template API server has its own database dependency.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/location-wrapped/src/App.tsx` — screens, navigation, and reusable UI patterns
- `artifacts/location-wrapped/src/index.css` — visual styles and responsive behavior
- `artifacts/location-wrapped/src/services/` — browser tracking, demo locations, and future processing boundaries

## Architecture decisions

- Wave 1 stores raw location readings only in this browser; it does not send coordinates to a server.
- Browser geolocation watches operate only while the page is open. Do not present this as continuous background tracking.
- Demo places and statistics are illustrative and must not be shown as the visitor's real history. Real place inference and Wrapped generation are deferred.

## Product

Visitors can onboard, request location permission, pause/resume recording, remove their saved coordinates, or explore a separate demo dashboard, schematic map, and three-card Wrapped preview.

## User preferences

- Keep core screens restrained, dark, and map-focused; use expressive gradients mainly in landing/onboarding and Wrapped.
- Preserve the 8px spacing rhythm, 16px mobile page gutters, consistent card radius, and reusable patterns.
- Wave 1 excludes Google Timeline import, family tracking, social features, payments, AI chat, and leaderboards.

## Gotchas

- Geolocation requires a secure context and user permission; denial is a normal, recoverable state.
- Coordinates are not automatically converted into named places in Wave 1.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
