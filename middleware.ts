import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSafeRedirect } from '@/lib/auth';

/**
 * Session cookie set by /api/auth/login and /api/auth/signup.
 * It is HTTP-only, so unlike the `auth_user` cookie the client cannot forge it.
 */
const AUTH_COOKIE = 'backend_auth_token';

/** Routes that require a signed-in user. Prefix match, so /receipt/abc is covered. */
const PROTECTED_ROUTES = ['/booking', '/dashboard', '/payment', '/receipt'];

/** Auth pages a signed-in user has no reason to see. */
const AUTH_ROUTES = ['/sign-in', '/sign-up'];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = !!request.cookies.get(AUTH_COOKIE)?.value;
  const isProtected = matchesRoute(pathname, PROTECTED_ROUTES);

  // ── Route protection ────────────────────────────────────────────────────────
  // Gate before the page renders, so protected content never flashes on screen
  // and the check cannot be bypassed by editing the client-readable cookie.
  if (isProtected && !isAuthenticated) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/sign-in';
    signInUrl.search = '';
    // Send them back to exactly where they were headed, query string included
    signInUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  // Already signed in? Skip the auth pages and honour any pending redirect.
  if (matchesRoute(pathname, AUTH_ROUTES) && isAuthenticated) {
    const target =
      getSafeRedirect(request.nextUrl.searchParams.get('redirect')) ??
      '/dashboard';
    const targetUrl = request.nextUrl.clone();
    const [targetPath, targetQuery] = target.split('?');
    targetUrl.pathname = targetPath;
    targetUrl.search = targetQuery ? `?${targetQuery}` : '';
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.next();

  // Cache static assets for 1 year
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache CSS and JS for 1 year
  if (pathname.match(/\.(css|js)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache HTML pages for 1 hour (ISR compatible), but never the pages that
  // render a specific user's orders, receipts or payment details
  if (pathname.match(/\.(html|htm)$/) || !pathname.includes('.')) {
    response.headers.set(
      'Cache-Control',
      isProtected
        ? 'private, no-store, must-revalidate'
        : 'public, max-age=3600, stale-while-revalidate=86400',
    );
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    // Exclude /api - those routes authenticate themselves and must return JSON
    // 401s, never an HTML redirect to the sign-in page
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
