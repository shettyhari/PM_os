# PerformanceOS AI

An AI-powered marketing operating system that unifies Google Ads, Meta Ads, LinkedIn, Microsoft Ads, GA4, and GTM into a single premium dark-mode dashboard with Athena AI chat insights.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routes under `/api`)
- `pnpm --filter @workspace/performance-os run dev` — run the frontend (port 19890, preview path `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (no SESSION_SECRET needed — auth uses OIDC sessions)
- Auth: Replit Auth (OIDC) — `GET /api/login` → Replit OIDC → `GET /api/callback` → session cookie → app

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, Wouter (routing)
- API: Express 5 (port 8080, base path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `lib/api-client-react/`
- Build: esbuild (CJS bundle)
- Icons: lucide-react + react-icons/si (v5)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (source of truth for DB)
- `lib/api-client-react/` — generated React Query hooks (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers per domain
- `artifacts/performance-os/src/pages/` — one file per page/route
- `artifacts/performance-os/src/components/` — shared UI components (AppLayout, Sidebar, TopNav)
- `artifacts/performance-os/src/index.css` — Tailwind + CSS variables (dark-mode-first, HSL values)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks. Never write fetch calls manually.
- Dark-mode default: `next-themes` with `storageKey="performanceos-theme"`, class strategy on `<html>`.
- All platform brand colours are inline Tailwind arbitrary values (e.g. `text-[#4285F4]` for Google).
- react-icons v5 breaking change: `SiLinkedin` and `SiMicrosoftbing` do NOT exist — use `Linkedin` and `Globe` from lucide-react instead.
- DB enums defined as Drizzle `pgEnum` (campaigns, leads, alerts, integrations, reports, conversations).
- Auth: Replit Auth (OIDC via openid-client v6). Sessions stored in `sessions` table (Drizzle). User shape: `{ id: string (UUID), email, firstName, lastName, profileImageUrl }`. Use `req.isAuthenticated()` in Express routes, `useAuth()` from `@workspace/replit-auth-web` in the frontend. Do NOT use generated API client for auth.
- usersTable.id is `varchar` (UUID string from Replit OIDC `sub` claim), not `serial` integer. All FK columns (campaigns.userId, leads.userId, alerts.userId, oauth_tokens.userId) are `varchar`.

## Product

- **Dashboard**: KPI cards (spend, revenue, ROAS, leads, CPL, CTR, CPC) with trend indicators + Athena AI executive summary + platform comparison charts
- **Campaigns**: Full data table across Google / Meta / LinkedIn / Microsoft with search, status badges, and per-row metrics
- **Analytics**: Attribution model selector, customer journey funnel, AI-predicted performance forecast
- **Athena AI**: Chat UI with conversation history, suggested prompts, typing indicators
- **CRM**: Lead pipeline with status, source, campaign mapping, and revenue tracking
- **Alerts**: Severity-coded feed (critical / high / medium / low) with mark-read actions
- **Integrations**: Connection status cards for all 7 platforms with sync triggers
- **Reports**: Report list with generation and download support
- **Settings**: Profile, theme switcher

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- react-icons v5 renamed many icons; always verify exports exist before using `Si*` names
- `SiLinkedin` → use `Linkedin` from lucide-react; `SiMicrosoftbing` → use `Globe` from lucide-react
- Never run `pnpm run dev` at workspace root — use `restart_workflow` or filter commands
- After any schema change: run `pnpm --filter @workspace/db run push` then reseed if needed
- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
