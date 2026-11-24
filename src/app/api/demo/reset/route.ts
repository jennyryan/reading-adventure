import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { sameSecret } from "@/lib/editAccess";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { resetToSampleShelf, SAMPLE } from "@/lib/sampleShelf";
import { getSeriesShelf } from "@/lib/seriesShelf";
import { getShelf } from "@/lib/shelf";

/**
 * Puts the portfolio demo back to the sample shelf. Vercel's cron calls
 * this every night (vercel.json), sending CRON_SECRET as a bearer token.
 *
 * Only on a site with DEMO_RESET_SECRET set: everywhere else (Norah's site)
 * this route doesn't exist, whatever is sent. The bearer token has to be
 * DEMO_RESET_SECRET, or CRON_SECRET if Vercel's is set to something else.
 */
export async function GET(req: NextRequest) {
  const secret = env().demoResetSecret;
  if (!secret) return jsonError(404, "Not found.");

  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "";
  const cron = process.env.CRON_SECRET?.trim();
  if (!sameSecret(token, secret) && !(cron && cron.length >= 16 && sameSecret(token, cron))) {
    return jsonError(401, "Not allowed.");
  }

  await resetToSampleShelf(db());
  // Fetch the series' book lists now, so they're cached before visitors
  // come (Open Library can be slow the first time). Best effort.
  await getShelf()
    .then(({ books }) => getSeriesShelf(books))
    .catch(() => {});
  return NextResponse.json({ ok: true, books: SAMPLE.length });
}
