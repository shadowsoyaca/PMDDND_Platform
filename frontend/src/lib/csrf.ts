/*
 * Phase 2 Story 5: reading the CSRF token, in one place.
 *
 * WHY THIS FILE EXISTS
 *
 * This function was written twice, once in LoginPage and once in HomePage, and
 * Story 5 needs it in a third and fourth place: signing out, and every change the
 * account screen makes. Four copies of a security detail is three too many, so it
 * moved here before the third was written rather than after the fourth.
 *
 * WHAT THE TOKEN IS FOR
 *
 * SecurityConfig uses the cookie-based CSRF token repository, which writes the
 * token into a cookie named XSRF-TOKEN that JavaScript is allowed to read. Spring
 * then expects the same value back in the X-XSRF-TOKEN header on any request that
 * changes something: POST, PUT, DELETE.
 *
 * That echo is the whole mechanism. Another website can make your browser send a
 * request here while you are signed in, but the browser's same-origin rules stop
 * it reading this site's cookies, so it cannot supply a matching token and the
 * request is refused.
 */

/*
 * Reads the CSRF token out of the cookie Spring set.
 *
 * Returns the token, or an empty string if the cookie is not there.
 *
 * Raises nothing. An empty string is returned deliberately rather than throwing,
 * so the request still goes out and is refused by the server, which is a failure
 * that can be seen in the network panel. Throwing here would fail silently inside
 * the browser with nothing to look at.
 *
 * This is a function rather than a value read once at startup, on purpose. Spring
 * issues a fresh token when a session begins, so a value captured earlier can
 * already be out of date by the time it is used.
 */
export function readCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}
