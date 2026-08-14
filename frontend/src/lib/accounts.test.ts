/*
 * Phase 2 Story 5: tests for the account management calls.
 *
 * WHY THIS FILE EXISTS
 *
 * Everything else in the frontend is tested through a screen, by driving it the
 * way a person does. These are tested directly, because what they get wrong is
 * not visible on a screen until after the damage is done.
 *
 * WHAT THEY ARE GUARDING
 *
 * A real fault, found by hand and reproduced before it was fixed. When the
 * session has ended, Spring answers a request with a redirect to the login page,
 * fetch follows it without saying so, and what arrives is the login page's HTML
 * carrying a status of 200. Every ordinary check for success says yes.
 *
 * The three symptoms were: removing an account reported success and took the row
 * out of the table while the account stayed in the database; adding and editing
 * threw while trying to read HTML as JSON, and showed "could not reach the
 * server" for a server that had answered perfectly well.
 *
 * The same trap has now caused three faults in this project, all in
 * LIVING_DOC.md. These tests are what stop a fourth.
 *
 * WHY NOT TESTED THROUGH THE SCREEN
 *
 * The screen's answer to all three is to leave for the login page, which is one
 * observable outcome for three different faults. Testing here says which of the
 * three broke.
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
    /*
     * The worst of the three. Success here takes a row off the screen, so
     * reporting it wrongly tells the owner a permanent action happened when the
     * account is still in the database.
     */
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

/*
 * NOTE - Phase 2 Story 5. Two refusals, one status code, opposite meanings.
 *
 * Not being allowed is permanent, and trying again never helps. A rejected CSRF
 * token clears on a page reload. Both arrive as 403, so before the server started
 * saying which it was, every one of them was reported as a permissions problem,
 * including to the owner on their own platform.
 */
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

    /*
     * A 403 carrying nothing readable. Treated as an ordinary refusal, which is
     * the safer way round: telling somebody to reload when they are simply not
     * allowed sends them round a loop with no end to it.
     */
    it("treats a refusal it cannot read as an ordinary one", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

        expect(await updatePersonName(3, "Misty W.")).toEqual({
            kind: "error",
            message: "You do not have permission to do that.",
        });
    });
});

describe("the account calls, when the session is fine", () => {
    /*
     * The other half of the guard. A check strict enough to catch the login page
     * could just as easily start rejecting real answers, and a delete that never
     * reports success would be a quieter fault than the one being fixed.
     */
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
