/*
 * Builders for the answers the server sends back, used by the frontend tests.
 * Each one returns a real Response with the status and headers of one kind of answer.
 * Response is a Node global and needs no import.
 */

/**
 * Builds a JSON answer with status 200.
 * The content type header is read by production code.
 * @param body (unknown) the value to serialise as the body.
 * @return (Response) the built answer.
 */
export function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Builds an HTML answer, as fetch receives after following a redirect to the login page.
 * The status is 200 on purpose. The content type header is read by production code.
 * @return (Response) the built answer.
 */
export function htmlResponse(): Response {
    return new Response("<!doctype html><title>Sign in</title>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
    });
}

/**
 * Builds an empty answer with status 200.
 * @return (Response) the built answer.
 */
export function emptyResponse(): Response {
    return new Response(null, { status: 200 });
}

/**
 * Builds a refusal with status 403 and the reason word "forbidden".
 * @return (Response) the built answer.
 */
export function forbiddenResponse(): Response {
    return new Response(JSON.stringify({ reason: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Builds a refusal with status 403 and the reason word "csrf".
 * @return (Response) the built answer.
 */
export function csrfRefusedResponse(): Response {
    return new Response(JSON.stringify({ reason: "csrf" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Builds a refused sign-in with status 401 and the reason word "bad-credentials".
 * @return (Response) the built answer.
 */
export function badCredentialsResponse(): Response {
    return new Response(JSON.stringify({ reason: "bad-credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Builds a JSON answer with status 201.
 * @param body (unknown) the created object to serialise as the body.
 * @return (Response) the built answer.
 */
export function createdResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 201,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Builds an answer with status 204 and no body.
 * @return (Response) the built answer.
 */
export function noContentResponse(): Response {
    return new Response(null, { status: 204 });
}

/**
 * Builds a refusal with status 409 and no body.
 * @return (Response) the built answer.
 */
export function conflictResponse(): Response {
    return new Response(null, { status: 409 });
}
