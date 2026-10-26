/*
 * Signs somebody in through /api/login and turns the answer into one of three
 * results: ok with the account, refused, or error with a message.
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

/**
 * Signs somebody in. Every failure becomes a result rather than a thrown error.
 *
 * @param username (string) what they typed in the username box.
 * @param password (string) what they typed in the password box.
 * @return (Promise<SignInResult>) ok with the account, refused, or error with a message.
 */
export async function signIn(
    username: string,
    password: string,
): Promise<SignInResult> {
    let response: Response;

    try {
        // The token is read at the moment of sending, not held anywhere.
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

        // Catches an HTML bounce that arrives with a status of 200.
        if (!isJson) {
            return {
                kind: "error",
                message: "The server gave an answer this page did not understand.",
            };
        }

        return { kind: "ok", account: (await response.json()) as CurrentUser };
    }

    // The 401 check comes before the CSRF check below.
    if (response.status === 401) {
        return { kind: "refused" };
    }

    if (await isCsrfRefusal(response)) {
        return { kind: "error", message: CSRF_MESSAGE };
    }

    // Any other status.
    return { kind: "error", message: "Could not sign in. Please try again." };
}
