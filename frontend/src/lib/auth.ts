/*
 * Phase 2 Story 5.5: signing in, and working out which of four things happened.
 *
 * WHY THIS FILE EXISTS
 *
 * Until this story, signing in was done inside LoginPage and could not say much.
 * Spring's form login answered every attempt with a redirect, so the screen sent
 * the credentials, got back something meaningless, and then asked /api/me whether
 * a session had appeared. A wrong password and an unreachable server were
 * indistinguishable, and the message shown had to cover both.
 *
 * /api/login answers with data now, so the four cases can finally be told apart.
 * That logic lives here rather than in the screen for the same reason
 * currentUser.ts does: it is decision-making with no markup in it, it is far
 * easier to test on its own, and the next screen that needs to sign somebody in
 * should not reimplement it.
 *
 * THE FOUR CASES
 *
 *   ok       200, and the account. There is a session.
 *   refused  401. The credentials were not accepted. The screen writes the
 *            wording for this one, because it is the only case where the wording
 *            is a product decision rather than a description of a fault.
 *   error    anything else that can be explained: a rejected token, a timeout, a
 *            server that could not be reached. The message comes with it.
 */
import { readCsrfToken } from "@/lib/csrf";
import type { CurrentUser } from "@/lib/currentUser";
import {
    CSRF_MESSAGE,
    fetchWithTimeout,
    isCsrfRefusal,
    isTimeout,
    TIMEOUT_MESSAGE,
} from "@/lib/http";

export type SignInResult =
    | { kind: "ok"; account: CurrentUser }
    | { kind: "refused" }
    | { kind: "error"; message: string };

/*
 * Signs somebody in.
 *
 * username - what they typed in the username box.
 * password - what they typed in the password box.
 *
 * Returns one of the three results above. Never throws.
 *
 * Raises nothing. Every way this can fail is turned into a result, because the
 * screen has to show something in all of them and a thrown error at this point
 * would only be caught and turned into the same thing one level up.
 *
 */
export async function signIn(
    username: string,
    password: string,
): Promise<SignInResult> {
    let response: Response;

    try {
        /*
         * The address is relative, with no host in front of it, so the switch from
         * a bare IP address to a real domain needs no code change here.
         *
         * The token is read at the moment of sending rather than held anywhere.
         * Spring issues a fresh one when a session begins, so a value captured
         * earlier can already be out of date.
         */
        response = await fetchWithTimeout("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": readCsrfToken(),
            },
            body: JSON.stringify({ username, password }),
        });
    } catch (failure) {
        return {
            kind: "error",
            message: isTimeout(failure)
                ? `${TIMEOUT_MESSAGE} Please try again.`
                : "Could not reach the server. Please try again.",
        };
    }

    if (response.ok) {
        const isJson = response.headers
            .get("content-type")
            ?.includes("application/json");

        if (!isJson) {
            return {
                kind: "error",
                message: "The server gave an answer this page did not understand.",
            };
        }

        return { kind: "ok", account: (await response.json()) as CurrentUser };
    }

    /*
     * 401 is the only status that means "those credentials were not accepted".
     * It is checked before the token refusal below because they are different
     * statuses and confusing them would tell somebody to reload the page when the
     * real answer is that they mistyped their password.
     */
    if (response.status === 401) {
        return { kind: "refused" };
    }

    if (await isCsrfRefusal(response)) {
        return { kind: "error", message: CSRF_MESSAGE };
    }

    /*
     * Anything else. There is no known case that reaches here, which is exactly
     * why it says nothing specific: inventing a cause for an answer nobody has
     * seen would be a guess printed on the screen as a fact.
     */
    return { kind: "error", message: "Could not sign in. Please try again." };
}
