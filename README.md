# Norah's Reading Adventure

A storybook-style reading log for one young reader.

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

## No sign-in

There's no lock: anyone who can open the site can add, edit and delete
books. Keep the address private, or put the deployment behind Vercel's
password protection if strangers shouldn't be able to change the shelf.

## Book search

Add Book searches Google Books when `GOOGLE_BOOKS_API_KEY` is set (fast,
good on recent children's books), and Open Library otherwise or if Google
fails. Either way the search runs on our server and each search is cached
for a day. When a book is saved, its cover comes from Open Library by ISBN
if Open Library has one, since those are larger; otherwise Google's.

Google lists every edition separately, so "already on the shelf" is decided
by ISBN, or by title and author (ignoring subtitles and punctuation); see
`src/lib/bookMatch.ts`.

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
