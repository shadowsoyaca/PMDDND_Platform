/*
 * Phase 2 Story 4.7: tests for the login screen.
 *
 * NOTE - Phase 2 Story 5.5: most of this file changed, because what the screen
 * does changed. Worth reading before wondering where the old tests went.
 *
 * The screen used to make two requests. Form login answered with a redirect that
 * said nothing, so a second request to /api/me was the only way to find out
 * whether a session had appeared, and the screen decided success from the CONTENT
 * TYPE of that second answer rather than its status. A whole test existed to pin
 * that, answering 200 with HTML and requiring the screen to treat it as a failure.
 *
 * /api/login answers with data now. There is one request, and its status says what
 * happened. So that test has moved rather than gone: the content type check now
 * lives in lib/auth.ts and is pinned by lib/auth.test.ts, which answers HTML with a
 * status of 200 and requires an error. Nothing was given up.
 *
 * The test for arriving at /login?error was deleted outright. That query string
 * came from form login's failureUrl, and nothing sends the browser there any more.
 * A test for a case that cannot happen passes forever and proves nothing.
 *

 *
 * HOW NAVIGATION IS CHECKED
 *
 * The router is real, not faked. The screen is mounted inside a MemoryRouter
 * holding the address in memory rather than in the browser bar, with a marker page
 * sitting at "/". Checking that the marker appeared proves navigation really
 * happened. Faking useNavigate would only prove the screen called a function that
 * had been replaced with one that does nothing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import { CSRF_MESSAGE } from "@/lib/http";
import {
    badCredentialsResponse,
    csrfRefusedResponse,
    jsonResponse,
} from "@/test/responses";

/*
 * The text on the stand-in page at "/". Its only job is to be findable, so that a
 * test can tell "the screen navigated home" apart from "the screen stayed put".
 * Kept in one constant so a test cannot look for wording the marker page does not
 * actually use.
 */
const HOME_MARKER = "Stand-in home page";

const REFUSED_MESSAGE =
    "That username and password did not match. Please try again.";

/*
 * Mounts the login screen with a working router around it.
 *
 * address - the address the router starts at. Defaults to plain /login. Pass
 *           "/login?logout" to test the case where the server sent the browser
 *           back here after signing out.
 *
 * Returns whatever render returns, though the tests read the screen through the
 * shared "screen" object rather than through this value.
 */
function renderLoginPage(address = "/login") {
    return render(
        <MemoryRouter initialEntries={[address]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<p>{HOME_MARKER}</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("LoginPage", () => {
    beforeEach(() => {
        /*
         * The screen reads the CSRF token out of this cookie and sends it back in a
         * header. jsdom keeps a real cookie jar, so setting it here is enough.
         */
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("sends the credentials once and goes to the home page when the sign-in is accepted", async () => {
        const user = userEvent.setup();

        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                username: "owner",
                personName: "Matthew",
                role: "OWNER",
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "a-real-password");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        /*
         * findBy rather than getBy. The navigation happens after an awaited
         * request, so the marker is not on the page the instant the click returns.
         * findBy waits for it; getBy would look once and fail.
         */
        expect(await screen.findByText(HOME_MARKER)).toBeInTheDocument();

        /*
         * NOTE - Phase 2 Story 5.5: exactly one request. This is the assertion that
         * would catch the /api/me follow-up creeping back in, which is the thing
         * this story removed.
         */
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe("/api/login");
    });

    it("stays put and explains itself when the credentials are refused", async () => {
        const user = userEvent.setup();

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(badCredentialsResponse()));

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "the-wrong-one");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(REFUSED_MESSAGE);
        expect(screen.queryByText(HOME_MARKER)).not.toBeInTheDocument();
    });

    it("tells the person to reload when the token was rejected, not that their password was wrong", async () => {
        const user = userEvent.setup();

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(csrfRefusedResponse()));

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "a-real-password");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        /*
         * NOTE - Phase 2 Story 5.5: this case could not be told apart before. A
         * rejected token and a wrong password both arrived as a redirect, so the
         * screen showed the password message for both, which is untrue and sends
         * the person somewhere that cannot help them. Reloading really does fix it.
         */
        expect(await screen.findByRole("alert")).toHaveTextContent(CSRF_MESSAGE);
        expect(screen.queryByText(HOME_MARKER)).not.toBeInTheDocument();
    });

    it("says the server could not be reached when the request itself fails", async () => {
        const user = userEvent.setup();

        /*
         * A rejected promise, not an error status. This is what fetch does when the
         * request never got an answer at all, such as the server being down, which
         * is a different situation from a wrong password and gets a different
         * message. Telling those two apart is the point of this story.
         */
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "a-real-password");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reach the server. Please try again.",
        );
    });

    it("confirms the sign out when the server sent the browser back with ?logout", () => {
        renderLoginPage("/login?logout");

        /*
         * No request is made here. Signing out is still a real redirect rather than
         * a fetch, so the browser arrives at this address and the screen reads the
         * query string to work out why it is being shown.
         */
        expect(screen.getByText("You have been signed out.")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
