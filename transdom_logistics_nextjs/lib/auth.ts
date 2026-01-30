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
 * Clear auth session (cookies)
 */
export function clearAuthSession(): void {
  if (typeof window !== "undefined") {
    // Clear cookies by setting expires to past date
    document.cookie = `${USER_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `backend_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}
