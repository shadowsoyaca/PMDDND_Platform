/*
 * Phase 2 Story 5: tests for the sign out button.
 *
 * WHERE THESE CAME FROM
 *
 * This test was in HomePage.test.tsx until Story 5 moved the button out into a
 * component both landing screens share. It moved with the code, because a test
 * sitting next to a screen that no longer holds the behaviour is a test nobody
 * finds when they break it.
 *
 * WHY IT EARNS ITS KEEP
 *
 * LIVING_DOC.md records that signing out failed roughly half the time. The token
 * was written into a hidden form field, and React resets that field to empty on
 * any redraw, so whether it survived until the browser sent the form came down to
 * timing. The fix was to read the token at the moment of sending.
 *
 * The test below checks the header that actually goes out, so anyone who moves
 * the token back into the markup fails here rather than the group discovering it
 * one time in two.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SignOutButton from "@/components/SignOutButton";
import {
    emptyResponse,
    forbiddenResponse,
    htmlResponse,
    jsonResponse,
} from "@/test/responses";

/* Who /api/me says is signed in, when it says anybody is. */
const SIGNED_IN_ACCOUNT = {
    username: "owner",
    personName: "Matthew",
    role: "OWNER",
};

/*
 * Answers the two addresses a failed sign out now touches.
 *
 * logout - what the sign out request itself gets back.
 * me     - what the follow-up question about the session gets back.
 *
 * Returns the stand-in, so a test can check what was asked and in what order.
 *
 * Written as a router rather than one answer for everything, because the two
 * requests mean opposite things. A single answer of 403 to both would have the
 * follow-up read as "no session", and the test would pass while proving the
 * reverse of what it claims.
 */
function serve({ logout, me }: { logout: Response | Error; me: Response }) {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url === "/api/me") {
            return Promise.resolve(me);
        }
        return logout instanceof Error
            ? Promise.reject(logout)
            : Promise.resolve(logout);
    });

    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

/*
 * Replaces window.location with something a test can read. The button leaves by
 * assigning to href, and jsdom will not perform a real navigation, so there is
 * nothing to observe unless the real location is swapped out first.
 */
function stubLocation(): { href: string } {
    const fakeLocation = { href: "" };
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

describe("SignOutButton", () => {
    beforeEach(() => {
        /*
         * jsdom keeps a real cookie jar, so setting the cookie here is enough for
         * the button to read a token out of it, exactly as it does in a browser.
         */
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("sends the sign out with the CSRF token attached and then returns to the login screen", async () => {
        const user = userEvent.setup();

        const fetchMock = vi.fn().mockResolvedValue(emptyResponse());
        vi.stubGlobal("fetch", fetchMock);
        const fakeLocation = stubLocation();

        render(<SignOutButton />);

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        await waitFor(() => expect(fakeLocation.href).toBe("/login?logout"));

        /*
         * Check what actually went out, not merely that something did. Spring
         * refuses a POST with no CSRF token, and the refusal shows up as its
         * plain error page rather than as a message this screen controls.
         */
        const [address, request] = fetchMock.mock.calls[0];
        expect(address).toBe("/logout");
        expect(request.method).toBe("POST");
        expect(request.headers["X-XSRF-TOKEN"]).toBe("test-token");
    });

    /*
     * NOTE - Phase 2 Story 5. These two guard a mistake this file's own comment
     * used to recommend.
     *
     * An earlier version left for the login screen whatever happened, on the
     * grounds that it was the safer outcome. It is not. Going to the login screen
     * ends nothing: the session cookie is still in the browser and the session is
     * still alive on the server, so pressing back gets straight back in, while
     * the login screen says "You have been signed out."
     *
     * That is precisely wrong for the situation sign out exists for, which is
     * walking away from a computer that is not yours.
     */
    it("stays put and says so when the sign out is refused and the session is still there", async () => {
        const user = userEvent.setup();

        /*
         * A refusal, not an error. Nothing is thrown, so a version that only
         * watched for thrown errors would announce a sign out that never
         * happened. A rejected CSRF token arrives exactly like this.
         *
         * /api/me then answers normally, which is what proves the session really
         * did survive.
         */
        const fetchMock = serve({
            logout: forbiddenResponse(),
            me: jsonResponse(SIGNED_IN_ACCOUNT),
        });
        const fakeLocation = stubLocation();

        render(<SignOutButton />);

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not sign out. You are still signed in.",
        );
        expect(fakeLocation.href).toBe("");

        // It asked, rather than assuming.
        expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
            "/logout",
            "/api/me",
        ]);
    });

    /*
     * The case the check exists for, and the one a guess gets wrong.
     *
     * The request reached the server, the session was ended, and only the reply
     * was lost coming back. Reporting "you are still signed in" here would be the
     * same lie as the old version told, pointing the other way.
     */
    it("leaves for the login screen when the request failed but the session is gone anyway", async () => {
        const user = userEvent.setup();

        serve({
            logout: new Error("network down"),
            /*
             * HTML with a status of 200 is what /api/me really answers when there
             * is no session, because fetch has already followed the bounce to the
             * login screen without saying so.
             */
            me: htmlResponse(),
        });
        const fakeLocation = stubLocation();

        render(<SignOutButton />);

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        await waitFor(() => expect(fakeLocation.href).toBe("/login?logout"));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("stays put and says so when nothing can be reached at all", async () => {
        const user = userEvent.setup();

        /*
         * Neither request gets an answer, so whether the session survived cannot
         * be established. It is treated as alive, because that is the assumption
         * that cannot send someone away from a computer they are still signed in
         * on.
         */
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        const fakeLocation = stubLocation();

        render(<SignOutButton />);

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reach the server. You are still signed in.",
        );
        expect(fakeLocation.href).toBe("");

        // And it can be tried again.
        expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    });
});
