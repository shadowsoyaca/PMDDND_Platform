/*
 * fetch with a time limit, plus the shared pieces for reading a CSRF refusal.
 * A request that runs out of time rejects with RequestTimeout.
 */

/* How long a request may take before it is given up on. */
export const REQUEST_TIMEOUT_MS = 10_000;

/* What every screen shows when a request ran out of time. */
export const TIMEOUT_MESSAGE = "The server took too long to answer.";

/* What to show when the server refused a request over its CSRF token. */
export const CSRF_MESSAGE =
    "Your security token was rejected. Reload the page and try again.";

/**
 * Says whether a 403 was about the CSRF token rather than permission, by
 * reading the reason word DeniedReasonHandler writes. Anything unreadable
 * counts as an ordinary refusal.
 *
 * @param response (Response) the refusal that came back.
 * @return (Promise<boolean>) true only when the server said it was the token.
 */
export async function isCsrfRefusal(response: Response): Promise<boolean> {
    if (response.status !== 403) {
        return false;
    }

    try {
        // The clone leaves the original body unread for the caller.
        const body = await response.clone().json();
        return body?.reason === "csrf";
    } catch {
        return false;
    }
}

/* Thrown when a request ran out of time. */
export class RequestTimeout extends Error {
    constructor() {
        super(TIMEOUT_MESSAGE);
        this.name = "RequestTimeout";
    }
}

/**
 * Says whether a failure was a timeout rather than an unreachable server.
 *
 * @param error (unknown) whatever was caught.
 * @return (boolean) true only for a request this file gave up on.
 */
export function isTimeout(error: unknown): boolean {
    return error instanceof RequestTimeout;
}

/**
 * fetch with a limit on how long it may take. Both the abort and the race are
 * needed: the abort stops the request, and the race settles the promise.
 *
 * @param url (string) the address, always relative.
 * @param options (RequestInit) the usual fetch options. A signal placed here is replaced.
 * @param timeoutMs (number) how long to wait. Only passed by the tests.
 * @return (Promise<Response>) the response, exactly as fetch would give it.
 * @throws RequestTimeout when the time runs out.
 * @throws Error whatever fetch raises otherwise.
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ranOutOfTime = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new RequestTimeout());
        }, timeoutMs);
    });

    const request = fetch(url, { ...options, signal: controller.signal });

    // The empty catch stops the aborted request's rejection being reported as
    // unhandled. The race still receives the original rejection.
    request.catch(() => {});

    try {
        return await Promise.race([request, ranOutOfTime]);
    } finally {
        clearTimeout(timer);
    }
}
