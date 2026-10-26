/*
 * Tests for the account management calls, run directly against the functions
 * with a fetch stand-in rather than through a screen.
 */
import { describe, it, expect, vi } from "vitest";

import { createAccount, deleteAccount, updatePersonName } from "@/lib/accounts";
import {
    createdResponse,
    csrfRefusedResponse,
    forbiddenResponse,
    htmlResponse,
    jsonResponse,
    noContentResponse,
} from "@/test/responses";

const ACCOUNT = {
    id: 3,
    username: "misty",
    personName: "Misty Waterflower",
    role: "PLAYER",
    createdAt: "2026-08-01T12:00:00Z",
};

const NEW_ACCOUNT_DETAILS = {
    username: "brock",
    password: "rocksolid1",
    personName: "Brock Harrison",
};

/* Answers every request with the login page, as an ended session really does. */
function serveLoginBounce() {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
}

describe("the account calls, when the session has ended", () => {
    // Removal is the call where a bounce read as success takes a row off the screen.
    it("does not report a removal as done", async () => {
        serveLoginBounce();

        expect(await deleteAccount(3)).toEqual({ kind: "noSession" });
    });

    it("does not report a creation as done, and does not throw trying to read the page as data", async () => {
        serveLoginBounce();

        expect(await createAccount(NEW_ACCOUNT_DETAILS)).toEqual({ kind: "noSession" });
    });

    it("does not report an edit as done, and does not throw trying to read the page as data", async () => {
        serveLoginBounce();

        expect(await updatePersonName(3, "Misty W.")).toEqual({ kind: "noSession" });
    });
});

describe("the account calls, when the server refuses", () => {
    it("says it was the security token when the server says so", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(csrfRefusedResponse()));

        expect(await createAccount(NEW_ACCOUNT_DETAILS)).toEqual({
            kind: "error",
            message: "Your security token was rejected. Reload the page and try again.",
        });
    });

    it("says it was permission when the server says that instead", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(forbiddenResponse()));

        expect(await deleteAccount(3)).toEqual({
            kind: "error",
            message: "You do not have permission to do that.",
        });
    });

    // A 403 carrying nothing readable is treated as an ordinary refusal.
    it("treats a refusal it cannot read as an ordinary one", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

        expect(await updatePersonName(3, "Misty W.")).toEqual({
            kind: "error",
            message: "You do not have permission to do that.",
        });
    });
});

describe("the account calls, when the session is fine", () => {
    // The 204 case is what keeps the bounce check from rejecting real deletes.
    it("reports a removal as done when the server answers 204 with no content", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(noContentResponse()));

        expect(await deleteAccount(3)).toEqual({ kind: "ok" });
    });

    it("hands back the created account when the server answers 201", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createdResponse(ACCOUNT)));

        expect(await createAccount(NEW_ACCOUNT_DETAILS)).toEqual({
            kind: "ok",
            account: ACCOUNT,
        });
    });

    it("hands back the changed account when the server answers 200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(ACCOUNT)));

        expect(await updatePersonName(3, "Misty Waterflower")).toEqual({
            kind: "ok",
            account: ACCOUNT,
        });
    });
});
