# CiteGuard — Frontend

The web surface for **CiteGuard**, a paid Output & Citation Verifier agent in the
[CROO](https://croo.network) agent economy. Three jobs: **sell trust** (landing),
**convert buyers** (public verify tool + shareable verdict report), and **run the
cockpit** (builder dashboard with reward-eligibility metrics).

Built with **Next.js (App Router) + TypeScript (strict) + Tailwind v4 + TanStack
Query + Recharts + lucide-react**. The UI is intentionally calm, high-contrast, and
credible — one restrained teal-blue accent reads as "trust / verification".

## Quick start

```bash
cd client
pnpm install
cp .env.local.example .env.local     # point NEXT_PUBLIC_API_BASE_URL at the backend
pnpm dev                             # http://localhost:3000
```

The backend (see `../server`) must be running for `/verify`, `/verdict/[id]`, and the
dashboard to return live data. Scripts: `pnpm build`, `pnpm start`, `pnpm lint`,
`pnpm typecheck`.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — value prop, how-it-works, price, acceptance schema, copy-paste HTTP + CAP integration snippets. |
| `/verify` | Public verify tool — content textarea, repeatable typed source rows, `allowWebCrossCheck` toggle, progressive loading state → redirect to the report. |
| `/verdict/[id]` | Shareable verdict report — large trust score with color band, per-claim labels/confidence/evidence, flagged statements, copy-link, embeddable badge snippet. |
| `/dashboard` | Builder cockpit — metrics panel with explicit progress to ≥3 counterparties / ≥5 buyers, self-trade indicator, cumulative-earnings trend (Recharts), orders table. Optional passphrase gate. |
| `/verdicts` | History/explorer — verdicts viewed on this device (filterable) + lookup by ID. |

## Backend contract

All calls are centralized in [`lib/api.ts`](lib/api.ts) (no direct DeepSeek or chain
calls from the frontend). Consumes: `POST /api/verify`, `GET /api/verdicts/:id`,
`GET /api/orders`, `GET /api/metrics`. Types mirror the acceptance schema in
[`lib/types.ts`](lib/types.ts).

## Design system

- **Label colors are consistent everywhere** ([`lib/labels.ts`](lib/labels.ts)):
  supported = green, contradicted = red, unsupported = amber, not_enough_info = grey.
  Defined as CSS variables in [`app/globals.css`](app/globals.css) and exposed as
  Tailwind tokens (`bg-label-supported`, etc.).
- **Trust band:** red `< 50 ≤` amber `< 75 ≤` green.
- Fully responsive; light/dark (press `d` to toggle).

## Components

`AppShell`, `TrustScoreBadge`, `ClaimRow`, `SourceInputList`, `MetricCard`,
`SelfTradeIndicator`, `OrdersTable`, `CodeBlock`, `TrendChart`, `VerdictReport`,
`DashboardGate`.

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL (default `http://localhost:8080`). |
| `NEXT_PUBLIC_PRICE_USDC` | Price shown on the landing page (display only). |
| `NEXT_PUBLIC_DASHBOARD_PASSPHRASE` | Optional passphrase to gate `/dashboard`. Empty = open. Client-side gate for the hackathon (the `NEXT_PUBLIC_` prefix is required for the browser to read it). |

## Notes

- **History (`/verdicts`)** is backed by client-side `localStorage` because the backend
  exposes verdicts by ID, not as a list — honest given the contract.
- The "Verified by CiteGuard" badge snippet references a `/badge/[id].svg` endpoint that
  the backend can implement later; the embed markup is ready.

## Demo screenshot

> Add a screenshot of `/verdict/[id]` here for the demo — it's the hero, shareable screen.
> `docs/verdict-report.png`

## License

MIT — see [LICENSE](LICENSE).
