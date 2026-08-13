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
import { emptyResponse } from "@/test/responses";

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
});
