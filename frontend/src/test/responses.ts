/*
 * Phase 2 Story 4.7: builders for the answers the server sends back.
 *
 * WHY THESE EXIST
 *
 * Every screen that talks to the backend has to cope with the same two shapes
 * of answer, and both are easy to get subtly wrong by hand. Building them in one
 * place means a test says which of the two it wants and nothing else.
 *
 * WHY THEY BUILD A REAL RESPONSE
 *
 * The obvious shortcut is a plain object carrying the two or three fields a
 * screen happens to read today. That shortcut goes stale silently: the screen
 * starts reading a fourth field, the stand-in never had it, and the test carries
 * on passing while agreeing only with itself. A real Response has everything a
 * real one has, so the test keeps testing the same thing after the screen
 * changes.
 *
 * Response is built into Node and needs no import.
 */

/*
 * An answer carrying JSON, as the server sends when the request was allowed.
 *
 * body - anything that survives JSON.stringify. Usually the object the endpoint
 *        would really return.
 *
 * Returns a Response with status 200 and a JSON content type. Screens in this
 * project check that content type, so it has to be right rather than merely
 * present.
 */
export function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

/*
 * An answer carrying HTML, with a status of 200.
 *
 * This is the awkward one, and the reason both screens check content types.
 * When there is no session, Spring answers a request with a redirect to the
 * login screen. fetch follows that redirect by itself and does not report that
 * it did, so what reaches the calling code is the login page's HTML with a
 * status of 200. Judging success by the status alone reads a bounce as a
 * success. LIVING_DOC.md records the two bugs this caused.
 *
 * Returns a Response that looks exactly like that bounce.
 */
export function htmlResponse(): Response {
    return new Response("<!doctype html><title>Sign in</title>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
    });
}

/*
 * An empty answer with status 200, as Spring gives for a form login or a sign
 * out. Neither carries a useful body, which is why the screens have to ask a
 * second question to find out what happened.
 */
export function emptyResponse(): Response {
    return new Response(null, { status: 200 });
}
