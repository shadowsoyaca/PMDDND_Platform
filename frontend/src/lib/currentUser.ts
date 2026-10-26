/*
 * Asks the server who is signed in. Shared by every screen that needs the
 * answer, and tells a real answer from the login page's HTML by content type.
 */
import { fetchWithTimeout } from "@/lib/http";

/* The three fields /api/me answers with. The role is a plain string. */
export type CurrentUser = {
    username: string;
    personName: string;
    role: string;
};

/* The value the role takes for the account that can manage other accounts. */
export const OWNER_ROLE = "OWNER";

/**
 * Asks the server who is signed in.
 *
 * @return (Promise<CurrentUser | null>) the account when there is a session, null when there is not.
 * @throws Error whatever fetch or the timeout raises when the request gets no answer.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
    const response = await fetchWithTimeout("/api/me");

    // The content type is the whole detection. With no session the answer is
    // the login page's HTML carrying a status of 200.
    const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");

    if (!response.ok || !isJson) {
        return null;
    }

    return (await response.json()) as CurrentUser;
}
