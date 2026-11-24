"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookDialog, FormError, inputStyle, labelTextStyle, primaryButtonStyle } from "./BookDialogParts";

// When the site has an editing passcode (Norah's does), a device that
// hasn't entered it is "locked". Add Book asks for the passcode before
// opening (unlockFirst). The server also answers any change from a locked
// device with 401 "locked"; changes go through writeFetch, which then asks
// and tries again, so a book being added is never lost.

/** Set by the mounted PasscodeDialog: asks, and resolves true once unlocked. */
let askForPasscode: (() => Promise<boolean>) | null = null;
/** Whether this device still needs the passcode, as far as the page knows. */
let locked = false;

/** Asks for the passcode if this device needs it. Resolves false if it was closed without unlocking. */
export async function unlockFirst(): Promise<boolean> {
  if (!locked || !askForPasscode) return true;
  return askForPasscode();
}

/** fetch for requests that change the shelf. */
export async function writeFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401 || !askForPasscode) return res;
  const body = (await res.clone().json().catch(() => ({}))) as { error?: string };
  if (body.error !== "locked") return res;
  locked = true;
  if (await askForPasscode()) return fetch(url, init);
  return Response.json({ error: "Changing the shelf needs the passcode." }, { status: 401 });
}

/**
 * The passcode prompt. Mount it once on the page; `locked` says whether
 * this device needs the passcode (from its cookie, checked on the server).
 */
export function PasscodeDialog({ locked: startLocked }: { locked: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resolve = useRef<((unlocked: boolean) => void) | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    locked = startLocked;
  }, [startLocked]);

  useEffect(() => {
    const el = dialog.current;
    // Closed without unlocking (Escape, or the close button).
    const onClose = () => {
      resolve.current?.(false);
      resolve.current = null;
    };
    el?.addEventListener("close", onClose);
    askForPasscode = () =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setFormKey((k) => k + 1);
        el?.showModal();
      });
    return () => {
      el?.removeEventListener("close", onClose);
      askForPasscode = null;
    };
  }, []);

  return (
    <BookDialog ref={dialog} titleId="passcode-title" title="Passcode, Please">
      <PasscodeForm
        key={formKey}
        onUnlocked={() => {
          locked = false;
          resolve.current?.(true);
          resolve.current = null;
          dialog.current?.close();
        }}
      />
    </BookDialog>
  );
}

function PasscodeForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const passcode = String(new FormData(e.currentTarget).get("passcode") ?? "");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't check the passcode. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-ink-soft">Adding and changing books needs the family passcode. This device will remember it.</p>
      <label className="block space-y-1 text-left">
        <span className={labelTextStyle}>Passcode</span>
        <input name="passcode" type="password" required autoFocus autoComplete="current-password" className={inputStyle} />
      </label>
      <FormError message={error} />
      <div className="flex justify-center">
        <button type="submit" disabled={busy} className={primaryButtonStyle}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
    </form>
  );
}
