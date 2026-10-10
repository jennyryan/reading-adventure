# Norah's Reading Adventure

A storybook-style reading log for one young reader. Visitors can look; a
grown-up unlocks editing with a passcode.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (see comments there).
3. `npm run db:migrate` to create the tables, then `npm run db:seed` for sample books.
4. `npm run dev` and open http://localhost:3000.

### Local database (optional)

Instead of a Neon dev branch you can run Postgres in Docker. This follows
[Neon's local development guide](https://neon.com/guides/local-development-with-neon):
a small proxy lets the same Neon driver used in production talk to it.

```sh
docker compose up -d
# in .env.local:
DATABASE_URL=postgresql://postgres:postgres@db.localtest.me:5432/main
```

## How unlocking works

Visitors see a read-only shelf. The footer "Grown-ups" button takes the
passcode; on success the server sets a signed, httpOnly cookie for 30 days.
Every write route checks that cookie (and the request's Origin) on the
server, see `src/lib/auth/guard.ts`. Passcode tries are limited to 5 per
device and 30 overall per 15 minutes. Changing `SESSION_SECRET` signs
everyone out.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Replace all data with sample books (dev only) |
