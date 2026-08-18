/*
 * Phase 2 Story 5: talking to the account management API.
 *
 * WHY THIS IS SEPARATE FROM THE SCREEN
 *
 * The screen's job is to draw things. This file's job is to know what the server
 * can answer with, which turns out to be four different things, and to turn them
 * into something a screen can act on without repeating the awkward parts.
 *
 * WHY FOUR ANSWERS AND NOT TWO
 *
 * "It worked" and "it did not" is not enough here, because the three failures
 * need three different responses from the screen:
 *
 *   refused    - signed in, but not the owner. Say so and stay put. Sending them
 *                to the login screen would be wrong and confusing: they are
 *                already signed in and signing in again changes nothing.
 *   no session - not signed in at all. Go to the login screen.
 *   no answer  - the server said nothing. Say so and stay put, because leaving
 *                would hide a server problem behind a login prompt.
 *
 * Collapsing any two of those loses information the person needs.
 */
import { readCsrfToken } from "@/lib/csrf";
// NOTE - Phase 2 Story 5: every call below goes through fetchWithTimeout rather
// than fetch, so a server that accepts the connection and never answers is given
// up on instead of leaving the screen waiting.
import { CSRF_MESSAGE, fetchWithTimeout, isCsrfRefusal } from "@/lib/http";

/*
 * One account, exactly as UserSummary sends it.
 *
 * createdAt arrives as a string rather than a date, because JSON has no date
 * type. It is ISO 8601 in UTC, such as 2026-08-12T19:33:14.949Z, which is worth
 * knowing for two reasons: sorting it as text happens to give the right order,
 * and showing it to a person needs it converted first.
 *
 * There is no password or password hash here, and there never will be. UserSummary
 * exists on the server precisely so the User row cannot be sent out by accident,
 * and UserAdminTest fails if a hash ever appears in an answer.
 */
export type Account = {
    id: number;
    username: string;
    personName: string;
    role: string;
    createdAt: string;
};

/*
 * The limits the server enforces on what an account may hold.
 *
 * These are copies. The originals are the annotations on CreateUserRequest and
 * UpdateUserRequest, and those are the ones that decide, because the browser can
 * be edited by whoever is holding it and the server cannot.
 *
 * CHANGE ONE, CHANGE THE OTHER. If these drift, the symptom is not an error but
 * something worse: a form that accepts what it should refuse, sends it, and gets
 * back a bare 400 that it can only describe vaguely, because Spring does not send
 * the reason. Nothing fails loudly. Someone simply cannot work out why the form
 * will not take a name.
 *
 * They are here rather than inside a form because two forms need the same
 * numbers, and a limit written out twice is a limit that will eventually be
 * changed once.
 */
export const ACCOUNT_LIMITS = {
    usernameMin: 3,
    usernameMax: 50,
    /*
     * Letters, numbers, a dash and an underscore, and nothing else. The same
     * expression is on CreateUserRequest, which explains why the rule exists.
     *
     * No g flag. A regular expression carrying one remembers where it stopped
     * between calls, so the same value would match and then fail on alternate
     * attempts. Nothing here needs it, and this value is shared, which is exactly
     * the situation where that fault would be hardest to place.
     */
    usernameAllowed: /^[A-Za-z0-9_-]+$/,
    passwordMin: 8,
    /*
     * 68, not 100. BCrypt hashes the first 72 bytes of a password and ignores
     * the rest, so a longer one has a tail that does nothing. CreateUserRequest
     * carries the full explanation.
     */
    passwordMax: 68,
    personNameMax: 100,
};

/*
 * What asking for the accounts produced.
 *
 * A tagged shape rather than "a list or null", so that a caller cannot forget one
 * of the failures. Reading the kind is the only way to get at the accounts, which
 * means the refused case has to be handled to reach them.
 */
export type AccountsResult =
    | { kind: "ok"; accounts: Account[] }
    | { kind: "refused" }
    | { kind: "noSession" };

/*
 * Fetches every account.
 *
 * Returns one of the three results above.
 *
 * Raises whatever fetch raises when the request gets no answer at all. That is
 * left to the caller on purpose, as it is in lib/currentUser.ts, because it is a
 * different situation from any of the three and gets a different message.
 *
 * WHY 403 IS CHECKED FIRST
 *
 * A 403 is not an ok response, so the signed-out check below would swallow it and
 * send a signed-in player to the login screen. The order of these two checks is
 * the whole difference between "you cannot see this" and an endless bounce back
 * to a login screen they have already passed.
 *
 * WHY THE CONTENT TYPE IS CHECKED AT ALL
 *
 * With no session, Spring answers with a redirect to the login screen, and fetch
 * follows it without saying so, so what arrives is HTML carrying a status of 200.
 * lib/currentUser.ts explains this at greater length. It is the same trap.
 */
export async function fetchAccounts(): Promise<AccountsResult> {
    const response = await fetchWithTimeout("/api/admin/users");

    if (response.status === 403) {
        return { kind: "refused" };
    }

    const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");

    if (!response.ok || !isJson) {
        return { kind: "noSession" };
    }

    return { kind: "ok", accounts: (await response.json()) as Account[] };
}

/*
 * -----------------------------------------------------------------------------
 * Changing things
 * -----------------------------------------------------------------------------
 *
 * WHY THESE WRITE THEIR OWN ERROR MESSAGES
 *
 * The server has good wording for every refusal. "That username is already
 * taken." is written out in UserAdminService. None of it arrives here.
 *
 * Spring only puts an exception's message into the error body when
 * server.error.include-message is set to always, and it is deliberately not set,
 * because that setting applies to every error at once and would start sending
 * internal exception text to the browser for faults that have nothing to do with
 * a form. So what arrives is a status code and an empty message.
 *
 * The wording below therefore duplicates the server's, and the duplication is
 * worth naming rather than hiding: if the rule on the server changes, the message
 * here does not follow it on its own. What stops the two drifting silently is
 * that each message is tied to a status code rather than to a sentence, and the
 * status codes are covered by UserAdminTest.
 */

/* What a change produced: the updated account, or something to show the person. */
export type ChangeResult =
    | { kind: "ok"; account: Account }
    | { kind: "noSession" }
    | { kind: "error"; message: string };

/* The same, for removal, which answers with no content when it works. */
export type RemoveResult =
    | { kind: "ok" }
    | { kind: "noSession" }
    | { kind: "error"; message: string };

/*
 * Was that answer the login page rather than a real answer?
 *
 * response - what came back from a request that changes something.
 *
 * Returns true when the session has ended and Spring bounced the request to the
 * login screen.
 *
 * WHY THIS IS NEEDED AT ALL
 *
 * A request made with no session is answered with a redirect to the login page.
 * fetch follows that redirect by itself and does not report having done so, so
 * what arrives is the login page's HTML carrying a status of 200. Every check
 * that asks whether the answer succeeded says yes.
 *
 * That was not merely theoretical here. Before this check existed, removing an
 * account with an expired session reported success and took the row out of the
 * table while the account stayed in the database, and adding or editing showed
 * "could not reach the server" for a server that had answered perfectly well.
 * The same trap has now caused three separate faults in this project, all
 * recorded in LIVING_DOC.md.
 *
 * WHY THE CONTENT TYPE AND NOT response.redirected
 *
 * fetch does set redirected to true in a real browser, and it would be the more
 * direct signal. It cannot be set on a Response built by hand, so no test could
 * produce the situation, and an untestable guard against a fault that has
 * happened three times is not worth having.
 *
 * A successful delete answers 204 with no content type at all, so it does not
 * match this and is not mistaken for a bounce.
 */
function isLoginBounce(response: Response): boolean {
    return (
        response.ok &&
        (response.headers.get("content-type")?.includes("text/html") ?? false)
    );
}

const UNEXPECTED = "Something went wrong. Please try again.";
const NOT_ALLOWED = "You do not have permission to do that.";

/*
 * Turns a 403 into the right sentence.
 *
 * response - the refusal.
 *
 * Returns wording that matches what actually happened.
 *
 * A 403 covers two situations that need opposite responses from the person. Not
 * being allowed is permanent, and trying again never helps. A rejected CSRF token
 * clears on a page reload. Telling somebody the first when it is the second sends
 * them looking for a permissions problem that does not exist, which is what this
 * used to do to the owner on their own platform.
 */
async function refusalMessage(response: Response): Promise<string> {
    return (await isCsrfRefusal(response)) ? CSRF_MESSAGE : NOT_ALLOWED;
}

/*
 * Builds the request options for a call that changes something.
 *
 * method - POST, PUT or DELETE.
 * body   - the object to send, or nothing for a DELETE.
 *
 * Returns options ready to hand to fetch.
 *
 * The CSRF token is read here, at the moment of sending, rather than held
 * anywhere. LIVING_DOC.md records what happens when a token is stored and reused:
 * sign out failed roughly half the time because a redraw had wiped it.
 */
function changeRequest(method: string, body?: unknown): RequestInit {
    return {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": readCsrfToken(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    };
}

/*
 * Creates an account. Every account made this way is a PLAYER; the server does
 * not accept a role and will not be told one.
 *
 * details - the username, password and person name typed into the add form.
 *
 * Returns the created account, or a message explaining the refusal.
 *
 * Raises whatever fetch raises when the request gets no answer at all.
 *
 * 409 is the one worth handling by name. It means the request was perfectly well
 * formed and simply collides with an account that already exists, which is a
 * thing the person can fix by choosing another username, so it deserves a
 * sentence saying exactly that rather than a general failure.
 */
export async function createAccount(details: {
    username: string;
    password: string;
    personName: string;
}): Promise<ChangeResult> {
    const response = await fetchWithTimeout(
        "/api/admin/users",
        changeRequest("POST", details),
    );

    if (isLoginBounce(response)) {
        return { kind: "noSession" };
    }
    if (response.status === 409) {
        return { kind: "error", message: "That username is already taken." };
    }
    if (response.status === 400) {
        return {
            kind: "error",
            message: "Those details were not accepted. Check them and try again.",
        };
    }
    if (response.status === 403) {
        return { kind: "error", message: await refusalMessage(response) };
    }
    if (!response.ok) {
        return { kind: "error", message: UNEXPECTED };
    }

    return { kind: "ok", account: (await response.json()) as Account };
}

/*
 * Changes an account's person name. Nothing else about the account is touched,
 * and nothing else can be: the server accepts only this one field.
 *
 * id         - which account.
 * personName - the corrected name.
 *
 * Returns the updated account, or a message explaining the refusal.
 *
 * Raises whatever fetch raises when the request gets no answer at all.
 */
export async function updatePersonName(
    id: number,
    personName: string,
): Promise<ChangeResult> {
    const response = await fetchWithTimeout(
        `/api/admin/users/${id}`,
        changeRequest("PUT", { personName }),
    );

    if (isLoginBounce(response)) {
        return { kind: "noSession" };
    }
    if (response.status === 400) {
        return { kind: "error", message: "That name was not accepted." };
    }
    if (response.status === 403) {
        return { kind: "error", message: await refusalMessage(response) };
    }
    if (!response.ok) {
        return { kind: "error", message: UNEXPECTED };
    }

    return { kind: "ok", account: (await response.json()) as Account };
}

/*
 * Removes an account. This is permanent and takes everything attached to the
 * account with it.
 *
 * id - which account.
 *
 * Returns nothing on success, or a message explaining the refusal.
 *
 * Raises whatever fetch raises when the request gets no answer at all.
 *
 * The 409 case should be unreachable from this screen, because the two things the
 * server refuses are removing your own account and removing the last owner, and
 * the screen offers no remove button on the owner's own row. It is handled anyway
 * rather than left to fall through to "something went wrong", because a guard
 * that is never supposed to fire is exactly the one nobody can interpret when it
 * does.
 */
export async function deleteAccount(id: number): Promise<RemoveResult> {
    const response = await fetchWithTimeout(
        `/api/admin/users/${id}`,
        changeRequest("DELETE"),
    );

    /*
     * First, and it matters most here. This is the call where a bounce mistaken
     * for success is worst: the screen takes the row out of the table and the
     * account is still there, so the owner is told a permanent action happened
     * when it did not.
     */
    if (isLoginBounce(response)) {
        return { kind: "noSession" };
    }
    if (response.status === 409) {
        return {
            kind: "error",
            message:
                "That account cannot be removed. It is either your own or the last owner account.",
        };
    }
    if (response.status === 403) {
        return { kind: "error", message: await refusalMessage(response) };
    }
    if (!response.ok) {
        return { kind: "error", message: UNEXPECTED };
    }

    return { kind: "ok" };
}
