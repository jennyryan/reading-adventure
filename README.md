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

## Editing passcode

Anyone with the address can view the shelf. When `EDIT_PASSCODE` is set,
adding, editing and deleting books asks for it once; that device then
remembers it for a year (an `httpOnly` cookie holding a signed copy, not
the passcode). Changing the passcode signs every device out. With no
passcode, anyone can edit: fine locally and on the portfolio demo.

## Portfolio demo

The demo is this same app deployed a second time, with its own database,
a made-up reader and a sample shelf visitors can play with. It goes back
to the sample books every night. Every push to `main` updates both sites.

Setting it up (once):

1. **Database:** in Neon, create a new branch or database for the demo
   (never Norah's). Apply the schema with
   `DATABASE_URL='<demo database URL>' npm run db:migrate`.
2. **Vercel:** Add New > Project, pick this same GitHub repo, and set these
   environment variables:
   - `DATABASE_URL`: the demo database
   - `READER_NAME`: the made-up name, e.g. `Maya`
   - `DEMO_RESET_SECRET` and `CRON_SECRET`: the same random value, 16+
     characters (e.g. from `openssl rand -hex 24`)
   - optionally `GOOGLE_BOOKS_API_KEY` and `HARDCOVER_TOKEN`
   - **not** `EDIT_PASSCODE`, so visitors can try adding books
3. **Fill the shelf:** after the first deploy, run
   `curl -H "Authorization: Bearer <secret>" https://<demo>/api/demo/reset`.
   After that, Vercel's cron (`vercel.json`) does it daily at 08:00 UTC.
4. **Norah's site:** add `EDIT_PASSCODE` to her Vercel project and redeploy.

The cron also runs on Norah's project, where `/api/demo/reset` answers
404 because `DEMO_RESET_SECRET` isn't set. **Never set `DEMO_RESET_SECRET`
on Norah's site:** the reset wipes the shelf.

The sample books are in `src/lib/sampleShelf.ts` (also used by `npm run db:seed`).

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
