# SmartLogBook

Logbook and virtual-airline economics for a flight-sim pilot. A flight is
detected from a SimBrief plan plus a live VATSIM connection, tracked
automatically from pushback to gate, and priced by one deterministic engine;
the pilot only enters the GSX costs and the landing FPM.

Live: https://smart-log-book-eta.vercel.app (private, single user)

## Layout

| Path | What |
|---|---|
| `web/` | Next.js 16 app on Vercel: flight screen, logbook, analysis, settings. Neon Postgres. |
| `tracker/` | Cloudflare Worker (cron every minute) + D1: finds the pilot in the VATSIM feed and runs the flight state machine. |
| `tools/` | Local scripts: record a VATSIM flight, benchmark the feed lookup, check a SimBrief OFP. |
| `docs/` | Brief, decisions (ADR log), data model, work packages, status, approved sketches. |

Version 1.x (Express + MongoDB) is kept only as the git tag `legacy-final`.

## Development

```bash
cd web && npm install && npm run dev -- -p 3100   # needs web/.env.local, see web/.env.example
cd web && npm test                                 # engine, filters, analysis SQL (PGlite), backup
cd tracker && npm test                             # state machine, replay of a real flight
```

Deploy: pushing `main` deploys `web/` to Vercel. The Worker deploys with
`npx wrangler deploy` from `tracker/`; D1 migrations first, with
`CI=true npx wrangler d1 migrations apply smartlogbook-tracker --remote`.

Start with `docs/STATUS.md`.
