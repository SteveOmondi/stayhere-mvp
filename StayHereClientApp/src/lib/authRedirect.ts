/**
 * Shared helpers so every "please sign in first" gate (route guard or in-page check) sends the
 * user to the same place after login: back to exactly what they were doing, not /dashboard.
 */

/** Build a /login URL that remembers where to return to afterward. */
export function loginUrlWithRedirect(targetPathAndSearch: string): string {
  return `/login?redirect=${encodeURIComponent(targetPathAndSearch)}`;
}

/** Read the `redirect` param back out of LoginPage's own location.search.
 * Only ever returns an in-app relative path (must start with exactly one "/") - guards against
 * an open-redirect via a crafted `?redirect=https://evil.example` or `?redirect=//evil.example`. */
export function readLoginRedirect(search: string, fallback = "/dashboard"): string {
  const raw = new URLSearchParams(search).get("redirect");
  if (!raw) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    // malformed encoding - fall through to the safe default
  }
  return fallback;
}
