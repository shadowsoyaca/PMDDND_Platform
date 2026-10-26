/*
 * Tests for the sign out button. They read the header that goes out and check
 * where the screen goes, or what it says, afterwards.
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

/**
 * Answers the two addresses a failed sign out touches, each one separately.
 *
 * @param logout (Response | Error) what the sign out request itself gets back.
 * @param me (Response) what the follow-up /api/me question gets back.
 * @return (Mock) the stand-in, so a test can check what was asked and in what order.
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

/**
 * Replaces window.location with a plain object, since jsdom performs no navigation.
 *
 * @return ({ href: string }) the replacement, whose href records the destination.
 */
function stubLocation(): { href: string } {
    const fakeLocation = { href: "" };
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

describe("SignOutButton", () => {
    beforeEach(() => {
        // Puts the token in jsdom's cookie jar. Every assertion on the token header reads it.
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

        // Checks the header that went out, not merely that a request happened.
        const [address, request] = fetchMock.mock.calls[0];
        expect(address).toBe("/logout");
        expect(request.method).toBe("POST");
        expect(request.headers["X-XSRF-TOKEN"]).toBe("test-token");
    });

    it("stays put and says so when the sign out is refused and the session is still there", async () => {
        const user = userEvent.setup();

        // A refusal, not a thrown error. /api/me then answers normally.
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

    /* The sign out reached the server and only the reply was lost. */
    it("leaves for the login screen when the request failed but the session is gone anyway", async () => {
        const user = userEvent.setup();

        serve({
            logout: new Error("network down"),
            // HTML with a status of 200 is what /api/me answers when there is no session.
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

        // Neither request gets an answer. The session is treated as alive.
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
