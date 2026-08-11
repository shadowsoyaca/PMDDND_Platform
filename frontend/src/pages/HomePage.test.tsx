/*
 * Phase 2 Story 4.7: tests for the home screen.
 *
 * WHAT THESE PROVE
 *
 * Three things the screen does that are not visible from reading it in one go:
 * it asks the server who is signed in and shows the answer, it leaves for the
 * login screen when there is no session, and it signs out with a CSRF token
 * attached.
 *
 * The sign out test is the one worth having. LIVING_DOC.md records that sign out
 * failed roughly half the time, because the token was written into a hidden form
 * field and React reset that field on any redraw. The fix was to read the token
 * at the moment of sending. The test below checks the header that actually goes
 * out, so if anyone moves the token back into the markup, this fails rather than
 * the group discovering it one time in two.
 *
 * NO ROUTER HERE
 *
 * Unlike the login screen, this one uses no router hooks, so it is rendered on
 * its own. Wrapping it in a MemoryRouter would add a moving part the screen does
 * not have.
 *
 * HOW LEAVING THE PAGE IS CHECKED
 *
 * The screen leaves by assigning to window.location.href, deliberately, because
 * a full browser navigation throws the old page away instead of swapping part of
 * it. jsdom will not perform a real navigation and only logs that it did not, so
 * there is nothing to observe unless window.location is replaced first. Each
 * test that needs it swaps in a plain object and then reads the href back. The
 * unstubGlobals setting in vite.config.ts puts the real one back afterwards.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomePage from "@/pages/HomePage";
import { emptyResponse, htmlResponse, jsonResponse } from "@/test/responses";

const SIGNED_IN_ACCOUNT = {
    username: "owner",
    personName: "Matthew",
    role: "OWNER",
};

/*
 * Replaces window.location with something a test can read.
 *
 * Returns the stand-in object. Its href starts empty, so a test can assert that
 * it became a particular address, and equally that it stayed empty when the
 * screen should not have gone anywhere.
 *
 * vi.stubGlobal is used rather than assigning to window.location directly.
 * A browser refuses that assignment outright, and jsdom follows suit, because
 * setting location is what performs a navigation rather than a normal write.
 */
function stubLocation(): { href: string } {
    const fakeLocation = { href: "" };
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

describe("HomePage", () => {
    beforeEach(() => {
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("shows the username, name and role that came back from the server", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SIGNED_IN_ACCOUNT)));

        render(<HomePage />);

        /*
         * The request is made from an effect after the first draw, so the
         * screen shows Loading first and the details only once the answer
         * arrives. findBy waits for that.
         */
        expect(await screen.findByText("owner")).toBeInTheDocument();
        expect(screen.getByText("Matthew")).toBeInTheDocument();
        expect(screen.getByText("OWNER")).toBeInTheDocument();
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("leaves for the login screen when there is no session, even though the answer has a status of 200", async () => {
        /*
         * HTML with a status of 200 is what a logged-out request really
         * produces, because fetch has already followed Spring's redirect
         * without saying so. A screen that trusted the status alone would show
         * an empty account panel here instead of leaving.
         */
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
        const fakeLocation = stubLocation();

        render(<HomePage />);

        await waitFor(() => expect(fakeLocation.href).toBe("/login"));
    });

    it("signs out with the CSRF token attached and then returns to the login screen", async () => {
        const user = userEvent.setup();

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(SIGNED_IN_ACCOUNT))
            .mockResolvedValueOnce(emptyResponse());
        vi.stubGlobal("fetch", fetchMock);
        const fakeLocation = stubLocation();

        render(<HomePage />);

        /*
         * Wait for the account details before clicking. That guarantees the
         * answer to /api/me has arrived and the screen has redrawn, which is
         * precisely the redraw that used to wipe the token out of the old
         * hidden field. Clicking earlier would skip past the case that broke.
         */
        await screen.findByText("owner");
        await user.click(screen.getByRole("button", { name: "Sign out" }));

        await waitFor(() => expect(fakeLocation.href).toBe("/login?logout"));

        const [logoutAddress, logoutRequest] = fetchMock.mock.calls[1];
        expect(logoutAddress).toBe("/logout");
        expect(logoutRequest.method).toBe("POST");
        expect(logoutRequest.headers["X-XSRF-TOKEN"]).toBe("test-token");
    });

    it("says so, and stays put, when the account details cannot be loaded at all", async () => {
        /*
         * A rejected promise means the request got no answer, which is a
         * different situation from being logged out. Being logged out should
         * leave for the login screen; this should not, because leaving would
         * hide a server problem behind a login prompt.
         */
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        const fakeLocation = stubLocation();

        render(<HomePage />);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load your account details.",
        );
        expect(fakeLocation.href).toBe("");
    });
});
