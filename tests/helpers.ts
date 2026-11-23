import { NextRequest } from "next/server";

export const ORIGIN = "http://localhost:3000";

export function makeRequest(path: string, { method = "POST", body }: { method?: string; body?: unknown } = {}) {
  const headers = new Headers({ host: "localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(path, ORIGIN), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
