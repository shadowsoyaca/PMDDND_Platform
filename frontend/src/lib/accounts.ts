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
    const response = await fetch("/api/admin/users");

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
