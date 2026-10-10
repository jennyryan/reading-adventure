"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

/**
 * The discreet footer control. Opens a small passcode dialog; on success
 * the server sets the unlock cookie and we re-render the page.
 * Uses a native <dialog>, which traps focus and closes on Escape for free.
 */
export function GrownupUnlock({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(path: string, body?: unknown) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const passcode = new FormData(form).get("passcode");
    setBusy(true);
    setError(null);
    try {
      const res = await post("/api/auth/unlock", { passcode });
      if (res.ok) {
        form.reset();
        dialog.current?.close();
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    await post("/api/auth/lock");
    router.refresh();
  }

  const linkStyle =
    "rounded-full px-4 py-3 text-sm text-white/85 underline-offset-4 hover:text-white hover:underline";

  if (unlocked) {
    return (
      <button type="button" onClick={lock} className={linkStyle}>
        🔓 Grown-up mode is on · Lock
      </button>
    );
  }

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={linkStyle}>
        🔑 Grown-ups
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="unlock-title"
        className="m-auto w-[min(92vw,24rem)] rounded-3xl bg-cream p-6 text-ink shadow-2xl backdrop:bg-ink/50"
        onClose={() => setError(null)}
      >
        <form onSubmit={unlock} className="space-y-4">
          <h2 id="unlock-title" className="text-xl font-semibold">
            Grown-up unlock
          </h2>
          <label className="block space-y-1">
            <span className="text-sm text-ink-soft">Passcode</span>
            <input
              name="passcode"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border-2 border-cream-deep bg-white px-4 py-3 text-lg focus:border-pink focus:outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-[#b4235f]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-12 rounded-full px-5 font-medium text-ink-soft hover:bg-cream-deep"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 rounded-full bg-pink px-6 font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Checking…" : "Unlock"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
