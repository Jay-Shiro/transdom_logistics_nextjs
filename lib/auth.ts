/**
 * Authentication utilities for secure JWT token management
 * Backend JWT is stored in HTTP-only cookies (set by server, auto-sent to API)
 * User data is stored in regular cookie (accessible to client-side code)
 */

const USER_COOKIE = "auth_user";

export interface AuthUser {
  firstname: string;
  lastname: string;
  gender: string;
  email: string;
  phone_number?: string;
  country: string;
  referral_code?: string | null;
  photo_url?: string | null;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user?: AuthUser;
}

/**
 * Get authenticated user from cookie
 */
export function getAuthUser(): AuthUser | null {
  if (typeof window !== "undefined") {
    const userCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(USER_COOKIE + "="));

    if (userCookie) {
      try {
        const userData = userCookie.split("=")[1];
        return JSON.parse(decodeURIComponent(userData));
      } catch (e) {
        console.error("Failed to parse auth user:", e);
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if user is authenticated (has user cookie)
 */
export function hasValidAuth(): boolean {
  if (typeof window !== "undefined") {
    const userCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(USER_COOKIE + "="));
    return !!userCookie;
  }
  return false;
}

/**
 * Resolve the post-authentication destination from a `redirect` query param.
 *
 * Pages send users to `/sign-in?redirect=booking` when they hit a gate, and the
 * param has to survive the hop to `/sign-up` too. Only same-origin paths are
 * accepted - anything absolute, protocol-relative, or containing a backslash is
 * discarded so the param can never be used as an open redirect.
 *
 * @returns a path beginning with "/", or null when there is nothing safe to use
 */
export function getSafeRedirect(redirect: string | null): string | null {
  if (!redirect) return null;

  const trimmed = redirect.trim();
  if (!trimmed) return null;

  // Reject absolute URLs ("https://evil.com"), protocol-relative ("//evil.com"),
  // and backslash tricks some browsers normalise to slashes
  if (trimmed.includes(":") || trimmed.includes("\\")) return null;
  if (trimmed.startsWith("//")) return null;

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return path.startsWith("//") ? null : path;
}

/**
 * Build a link to another auth page that preserves the current redirect target,
 * so a user who switches between sign-in and sign-up still lands where they
 * were originally headed.
 */
export function withRedirect(path: string, redirect: string | null): string {
  const safe = getSafeRedirect(redirect);
  return safe ? `${path}?redirect=${encodeURIComponent(safe.slice(1))}` : path;
}

/**
 * Build the sign-in URL for the page the user is currently on, so that after
 * authenticating they land back where they were instead of on the dashboard.
 *
 * Route protection is enforced in middleware.ts; this is for the client-side
 * checks that remain as a second line of defence (e.g. a session that expires
 * while the tab is open).
 */
export function signInPath(): string {
  if (typeof window === "undefined") return "/sign-in";
  const current = window.location.pathname + window.location.search;
  return `/sign-in?redirect=${encodeURIComponent(current)}`;
}

/**
 * Clear auth session.
 *
 * `backend_auth_token` is HTTP-only, so it CANNOT be removed from
 * `document.cookie` - only the server that set it can expire it. This calls
 * POST /api/auth/logout to do that, then clears the readable user cookie
 * locally so the UI updates immediately without waiting for the round trip.
 *
 * Always await this before navigating, otherwise the session cookie may still
 * be present when the next route is evaluated.
 */
export async function clearAuthSession(): Promise<void> {
  if (typeof window === "undefined") return;

  // Clear the client-readable cookie up front so the UI reflects the logout
  // even if the network call fails
  document.cookie = `${USER_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    // Network failure - the HTTP-only cookie survives until it expires on its
    // own. Surface it rather than pretending the logout fully succeeded.
    console.error("Failed to clear server session:", e);
  }
}
