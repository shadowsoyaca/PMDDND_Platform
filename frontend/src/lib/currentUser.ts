/*
 * Phase 2 Story 5: asking the server who is signed in.
 *
 * WHY THIS FILE EXISTS
 *
 * Three screens now need the answer to that question, and all three have to cope
 * with the same awkward detail described below. Written out three times it would
 * be got wrong at least once, and the way it goes wrong is not obvious: the
 * screen carries on as though everything worked.
 */

/*
 * The three fields /api/me answers with.
 *
 * The role is a plain string rather than a list of the two roles that exist
 * today. Narrowing it would suggest this file knows every role there will ever
 * be, and Phase 2 Story 9 adds a third. Whoever adds it should have to look at
 * the screens that branch on this value, not be told by the compiler that one
 * line needs widening.
 */
export type CurrentUser = {
    username: string;
    personName: string;
    role: string;
};

/* The value the role takes for the account that can manage other accounts. */
export const OWNER_ROLE = "OWNER";

/*
 * Asks the server who is signed in.
 *
 * Returns the account when there is a session, and null when there is not.
 *
 * Raises whatever fetch raises when the request gets no answer at all, such as
 * the server being unreachable. That is deliberately left to the caller, because
 * it is a different situation from being signed out and the screens treat it
 * differently: no session means go to the login screen, no answer means say so
 * and stay put. Collapsing the two here would hide a server problem behind a
 * login prompt.
 *
 * WHY THE CONTENT TYPE IS CHECKED AND NOT ONLY THE STATUS
 *
 * With no session, Spring answers this address with a redirect to the login
 * screen. fetch follows that redirect on its own and does not report that it did,
 * so what arrives here is the login page's HTML carrying a status of 200. Judging
 * by the status alone reads a bounce as a success. On the login screen that was
 * worse than it sounds: a failed sign-in looked like a successful one.
 *
 * Asking whether the body is JSON is what actually tells the two apart.
 * LIVING_DOC.md records both bugs this caused, and CurrentUserTest.java pins the
 * server side of it so the behaviour cannot quietly change underneath this.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
    const response = await fetch("/api/me");

    const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");

    if (!response.ok || !isJson) {
        return null;
    }

    return (await response.json()) as CurrentUser;
}
