/*
 * Calls to the account management API. Each call turns the server's answer
 * into a tagged result the screen can act on. Every call uses fetchWithTimeout.
 */
import { readCsrfToken } from "@/lib/csrf";
import { CSRF_MESSAGE, fetchWithTimeout, isCsrfRefusal } from "@/lib/http";

/* One account, exactly as UserSummary sends it. createdAt is an ISO 8601 string in UTC. */
export type Account = {
    id: number;
    username: string;
    personName: string;
    role: string;
    createdAt: string;
};

/*
 * The limits the two forms apply. They mirror the annotations on
 * CreateUserRequest and UpdateUserRequest and change in step with them.
 */
export const ACCOUNT_LIMITS = {
    usernameMin: 3,
    usernameMax: 50,
    // The same expression as CreateUserRequest. It carries no g flag.
    usernameAllowed: /^[A-Za-z0-9_-]+$/,
    passwordMin: 8,
    passwordMax: 68,
    personNameMax: 100,
};

/* What asking for the accounts produced. */
export type AccountsResult =
    | { kind: "ok"; accounts: Account[] }
    | { kind: "refused" }
    | { kind: "noSession" };

/**
 * Fetches every account.
 *
 * @return (Promise<AccountsResult>) ok with the accounts, refused, or noSession.
 * @throws Error whatever fetch or the timeout raises when the request gets no answer.
 */
export async function fetchAccounts(): Promise<AccountsResult> {
    const response = await fetchWithTimeout("/api/admin/users");

    // The 403 check runs before the bounce check below.
    if (response.status === 403) {
        return { kind: "refused" };
    }

    // With no session the answer is the login page's HTML with a status of 200.
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
 * Changing things. The messages below are written here, keyed on the status
 * code, since the server sends a status and an empty message.
 * -----------------------------------------------------------------------------
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

/**
 * Says whether the answer is the login page, which is what an ended session
 * produces: HTML with a status of 200. A 204 delete has no content type and
 * does not match.
 *
 * @param response (Response) what came back from a request that changes something.
 * @return (boolean) true when the session has ended.
 */
function isLoginBounce(response: Response): boolean {
    return (
        response.ok &&
        (response.headers.get("content-type")?.includes("text/html") ?? false)
    );
}

const UNEXPECTED = "Something went wrong. Please try again.";
const NOT_ALLOWED = "You do not have permission to do that.";

/**
 * Turns a 403 into the right sentence: a token refusal or a permissions one.
 *
 * @param response (Response) the refusal.
 * @return (Promise<string>) the message to show.
 */
async function refusalMessage(response: Response): Promise<string> {
    return (await isCsrfRefusal(response)) ? CSRF_MESSAGE : NOT_ALLOWED;
}

/**
 * Builds the request options for a call that changes something. The CSRF
 * token is read at the moment of sending.
 *
 * @param method (string) POST, PUT or DELETE.
 * @param body (unknown) the object to send, or nothing for a DELETE.
 * @return (RequestInit) options ready to hand to fetch.
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

/**
 * Creates an account. Every account made this way is a PLAYER.
 *
 * @param details (object) the username, password and person name from the add form.
 * @return (Promise<ChangeResult>) the created account, or a message explaining the refusal.
 * @throws Error whatever fetch or the timeout raises when the request gets no answer.
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

/**
 * Changes an account's person name, the one field the server accepts.
 *
 * @param id (number) which account.
 * @param personName (string) the corrected name.
 * @return (Promise<ChangeResult>) the updated account, or a message explaining the refusal.
 * @throws Error whatever fetch or the timeout raises when the request gets no answer.
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

/**
 * Removes an account. The 409 case covers the owner's own account and the
 * last owner.
 *
 * @param id (number) which account.
 * @return (Promise<RemoveResult>) ok, or a message explaining the refusal.
 * @throws Error whatever fetch or the timeout raises when the request gets no answer.
 */
export async function deleteAccount(id: number): Promise<RemoveResult> {
    const response = await fetchWithTimeout(
        `/api/admin/users/${id}`,
        changeRequest("DELETE"),
    );

    // The bounce check comes first in this call.
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
