// middleware.js — Vercel Edge Middleware
//
// Runs before every request on /app and /account.
// If the __session cookie is absent, redirects to /signin.
// The cookie is only ever set by api/session.js (server-side, after Admin SDK
// verification), so its presence is a reliable proxy for a valid Firebase session.
//
// The Firebase client SDK in boot.js performs a second, full auth check after
// the page loads — this edge check is the first line of defence that prevents
// the HTML from being served at all to unauthenticated requests.

export function middleware(request) {
  const session = request.cookies.get('__session');

  if (!session || !session.value) {
    const signinUrl = new URL('/signin', request.url);
    // Preserve the original destination so signin can redirect back after auth
    signinUrl.searchParams.set('next', request.nextUrl.pathname);
    return Response.redirect(signinUrl, 302);
  }
}

// Only run on protected routes
export const config = {
  matcher: ['/app', '/account'],
};
