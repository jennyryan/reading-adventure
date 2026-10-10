# Norah's Reading Adventure

A storybook-style reading log for one young reader. Visitors can look; a
grown-up unlocks editing with a passcode.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (see comments there).
3. `npm run db:migrate` to create the tables, then `npm run db:seed` for sample books.
4. `npm run dev` and open http://localhost:3000.

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
