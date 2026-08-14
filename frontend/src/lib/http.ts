/*
 * Phase 2 Story 5: giving up on a request that is never going to answer.
 *
 * WHY THIS EXISTS
 *
 * fetch has no timeout of its own. Left alone it waits for as long as the
 * browser is willing to, which is minutes. A refused connection fails at once and
 * is already handled everywhere, so that is not the case this is for. This is for
 * the server accepting the connection and then never replying, which is what a
 * hung or overloaded process does.
 *
 * The symptom without it is a screen showing Loading, with no error and nothing
 * to press, for as long as anyone is prepared to sit there.
 *
 * WHY TEN SECONDS
 *
 * Long enough that a slow but working answer is never cut off, short enough that
 * nobody is left wondering whether the page is broken. Too short is worse than
 * none at all: it turns a working request into an error, the person retries, and
 * a loaded server gets a second request while still working on the first.
 *
 * WHY A TIMEOUT IS TOLD APART FROM AN UNREACHABLE SERVER
 *
 * They are different faults and they lead to different next steps. "Could not
 * reach the server" means it is not there. "The server took too long" means it is
 * there and struggling, and trying again in a moment is reasonable.
 */

/* Ten seconds. See above for why this number and not a smaller one. */
export const REQUEST_TIMEOUT_MS = 10_000;

/* What every screen shows when a request ran out of time. */
export const TIMEOUT_MESSAGE = "The server took too long to answer.";

/*
 * What to show when the server refused a request over its CSRF token.
 *
 * It names the fix rather than the fault, because the fault means nothing to
 * anyone using the platform and the fix is one action. Reloading really does
 * repair it: a fresh token is issued as the page loads.
 */
export const CSRF_MESSAGE =
    "Your security token was rejected. Reload the page and try again.";

/*
 * Was that 403 about the CSRF token rather than about permission?
 *
 * response - the refusal that came back.
 *
 * Returns true only when the server said it was the token.
 *
 * Raises nothing. Anything unreadable is treated as an ordinary refusal, which is
 * the safer way round: telling somebody to reload when the real answer is that
 * they are not allowed sends them round a loop that cannot end.
 *
 * WHY THE RESPONSE IS CLONED
 *
 * A response body can only be read once. Reading it here would leave the caller
 * holding an empty one, and the failure would appear far away from this line, as
 * a body that is mysteriously already used. Cloning costs nothing on a body this
 * small and removes that possibility.
 *
 * The reason is written by DeniedReasonHandler, which explains why two fixed
 * words are sent rather than the real exception message.
 */
export async function isCsrfRefusal(response: Response): Promise<boolean> {
    if (response.status !== 403) {
        return false;
    }

    try {
        const body = await response.clone().json();
        return body?.reason === "csrf";
    } catch {
        return false;
    }
}

/*
 * Thrown when a request ran out of time.
 *
 * Its own class rather than a plain Error carrying a message, so a caller can ask
 * what happened without matching on wording. Matching on a sentence breaks
 * silently the moment somebody rewords it.
 */
export class RequestTimeout extends Error {
    constructor() {
        super(TIMEOUT_MESSAGE);
        this.name = "RequestTimeout";
    }
}

/*
 * Was that failure a timeout rather than an unreachable server?
 *
 * error - whatever was caught.
 *
 * Returns true only for a request this file gave up on.
 */
export function isTimeout(error: unknown): boolean {
    return error instanceof RequestTimeout;
}

/*
 * fetch, with a limit on how long it may take.
 *
 * url       - the address, always relative in this project so the switch from an
 *             IP address to a domain needs no code change.
 * options   - the usual fetch options. A signal placed here is replaced.
 * timeoutMs - how long to wait. Only passed by the tests, which cannot sit for
 *             ten seconds.
 *
 * Returns the response, exactly as fetch would.
 *
 * Raises RequestTimeout when the time runs out, and whatever fetch raises
 * otherwise, so an unreachable server still behaves as it did before.
 *
 * WHY BOTH A RACE AND AN ABORT
 *
 * The abort is what stops the request, so the browser is not left holding a
 * connection nobody is waiting for. The race is what makes this testable: a
 * stand-in fetch written in a test does not have to honour a signal, and one that
 * ignores it would leave a test hanging rather than failing. Doing both means the
 * real request is cancelled and the promise always settles.
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

    /*
     * The aborted request rejects a moment after the race has already been lost,
     * and a rejection nobody is listening to is reported as an unhandled error
     * that has nothing to do with anything. This listener does nothing except
     * exist. The race still sees the original rejection, because attaching a
     * handler makes a new promise rather than swallowing the old one.
     */
    request.catch(() => {});

    try {
        return await Promise.race([request, ranOutOfTime]);
    } finally {
        clearTimeout(timer);
    }
}
