/*
 * Reads the CSRF token out of the XSRF-TOKEN cookie Spring sets, for echoing
 * back in the X-XSRF-TOKEN header on any request that changes something.
 */

/**
 * Reads the CSRF token out of the cookie Spring set. It is a function called
 * at the moment of each request, and a missing cookie gives an empty string
 * rather than a thrown error.
 *
 * @return (string) the token, or an empty string if the cookie is not there.
 */
export function readCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}
