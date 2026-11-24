// Who may add, edit and delete books. When EDIT_PASSCODE is set (Norah's
// site), only devices that have entered it once; viewing is always open.
// Without one (local dev, the portfolio demo), anyone.
//
// The cookie holds an HMAC of the passcode, not the passcode itself, so it
// can't be read back out of a browser, and changing the passcode signs
// every device out.

import { createHmac, timingSafeEqual } from "node:crypto";

export const EDIT_COOKIE = "edit_access";
/** A year: Norah shouldn't have to type it again. */
export const EDIT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The cookie value for a passcode. */
export function editToken(passcode: string) {
  return createHmac("sha256", passcode).update("reading-adventure:edit").digest("base64url");
}

/** Whether `given` matches `expected`, taking the same time whatever they are. */
export function sameSecret(given: string, expected: string) {
  // Hashing both first makes them the same length, which timingSafeEqual needs.
  const a = createHmac("sha256", "compare").update(given).digest();
  const b = createHmac("sha256", "compare").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Whether a request with this cookie may change the shelf. */
export function mayEdit(passcode: string | null, cookie: string | undefined) {
  if (!passcode) return true;
  return cookie !== undefined && sameSecret(cookie, editToken(passcode));
}
