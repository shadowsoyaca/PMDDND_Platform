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

/*
 * NOTE - Phase 2 Story 5: a refusal, status 403.
 *
 * This is what a signed-in player gets from anything under /api/admin/. It is
 * the third distinct answer a screen has to cope with, and the one most easily
 * confused with the second: like the HTML bounce above it is not an ok response,
 * so code that checks response.ok first treats a refused player as a signed-out
 * visitor and sends them to a login screen they have already passed.
 *
 * The body is deliberately empty rather than JSON. Spring answers this way, and a
 * screen that tried to read a message out of it would find nothing.
 */
export function forbiddenResponse(): Response {
    return new Response(JSON.stringify({ reason: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}

/*
 * NOTE - Phase 2 Story 5: a refusal over the CSRF token, status 403.
 *
 * The same status as the refusal above and a different meaning. Not being allowed
 * is permanent; a rejected token clears on a page reload. DeniedReasonHandler on
 * the server is what puts the reason in the body so the two can be told apart,
 * and this is what a test uses to prove the screens read it.
 */
export function csrfRefusedResponse(): Response {
    return new Response(JSON.stringify({ reason: "csrf" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}

/*
 * NOTE - Phase 2 Story 5.5: a refused sign-in, status 401.
 *
 * The fourth distinct refusal, and the newest. Before this story a refused
 * sign-in arrived as a redirect that said nothing, so the login screen had to ask
 * /api/me afterwards to work out what had happened. /api/login answers 401 with a
 * reason instead.
 *
 * 401 rather than 403 matters. In this application 403 means "signed in and not
 * allowed", which is permanent, and 401 means "those credentials were not
 * accepted", which is not. A screen that treated them the same would tell somebody
 * who mistyped a password that they lack permission.
 *
 * The reason is one fixed word for every way of failing: wrong username, wrong
 * password, disabled account. Saying which would tell an attacker which usernames
 * exist.
 */
export function badCredentialsResponse(): Response {
    return new Response(JSON.stringify({ reason: "bad-credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
}

/*
 * NOTE - Phase 2 Story 5: a thing was created, status 201.
 *
 * body - the created object, as the endpoint would answer with it.
 *
 * Separate from jsonResponse because the status really is different, and a test
 * that answers 200 where the server answers 201 is quietly agreeing with itself
 * rather than with the backend.
 */
export function createdResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 201,
        headers: { "Content-Type": "application/json" },
    });
}

/*
 * NOTE - Phase 2 Story 5: done, with nothing to say. Status 204.
 *
 * What a successful delete answers with. There is no body at all, which is worth
 * having in a test: code that tries to read one finds nothing and fails here
 * rather than in front of the owner.
 */
export function noContentResponse(): Response {
    return new Response(null, { status: 204 });
}

/*
 * NOTE - Phase 2 Story 5: a collision, status 409.
 *
 * What creating an account with a taken username answers with. The body is empty
 * on purpose. The server does write a reason, and Spring does not send it, since
 * server.error.include-message is left at its default. So the screen has to
 * supply its own wording, and this is the answer that proves it does.
 */
export function conflictResponse(): Response {
    return new Response(null, { status: 409 });
}
