// Next.js calls register() once when a server instance boots, before it
// handles any request. Validating env here makes a misconfigured deploy fail
// immediately with a readable message.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("./lib/env");
  const { hardcoverToken } = env();
  if (!hardcoverToken) {
    console.warn(
      "HARDCOVER_TOKEN is not set: series are only detected from search titles, and the Up Next series shelf will be hidden.",
    );
  }
}
