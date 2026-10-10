import { NextRequest } from "next/server";

export const ORIGIN = "http://localhost:3000";

export function makeRequest(
  path: string,
  {
    method = "POST",
    body,
    cookie,
    origin = ORIGIN,
    ip = "203.0.113.7",
  }: {
    method?: string;
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    ip?: string;
  } = {},
) {
  const headers = new Headers({ host: "localhost:3000", "x-real-ip": ip });
  if (origin) headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(path, ORIGIN), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
