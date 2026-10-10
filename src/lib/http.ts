import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

export function jsonError(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

/** Parse a JSON body against a Zod schema, or return a 400 response. */
export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: jsonError(400, "Request body must be JSON.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return { response: jsonError(400, message.join("; ")) };
  }
  return { data: result.data };
}

/** Parse a positive integer id from a dynamic route segment. */
export function parseId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}
