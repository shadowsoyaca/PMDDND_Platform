/*
 * Phase 2 Story 4.7: tests for the login screen.
 *
 * WHAT THESE PROVE
 *
 * The screen cannot be tested by calling a function, because what it does is
 * spread across a form, two network requests, and a decision about which of
 * them succeeded. So these tests drive it the way a person does: type into the
 * boxes, press the button, and look at what appears.
 *
 * The refused sign-in test is the one that earns its keep. LoginPage does not
 * decide success from the status code, it decides from the content type, and
 * the reason is recorded in LIVING_DOC.md: a logged-out request to /api/me is
 * answered with a redirect that fetch follows on its own, so what arrives is
 * the login page's HTML with a status of 200. A status check alone reads that
 * as a successful sign-in. The test below answers exactly that and requires the
 * screen to treat it as a failure, so anyone who later "simplifies" the check
 * back to response.ok finds out here rather than in front of a player.
 *
 * HOW NAVIGATION IS CHECKED
 *
 * The router is real, not faked. The screen is mounted inside a MemoryRouter
 * holding the address in memory rather than in the browser bar, with a marker
 * page sitting at "/". Checking that the marker appeared proves navigation
 * really happened. Faking useNavigate would only prove the screen called a
 * function that had been replaced with one that does nothing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import { emptyResponse, htmlResponse, jsonResponse } from "@/test/responses";

/*
 * The text on the stand-in page at "/". Its only job is to be findable, so that
 * a test can tell "the screen navigated home" apart from "the screen stayed
 * put". Kept in one constant so a test cannot look for wording the marker page
 * does not actually use.
 */
const HOME_MARKER = "Stand-in home page";

const REFUSED_MESSAGE =
    "That username and password did not match. Please try again.";

/*
 * Mounts the login screen with a working router around it.
 *
 * address - the address the router starts at. Defaults to plain /login. Pass
 *           "/login?error" or "/login?logout" to test the two cases where the
 *           server sent the browser back here with a query string.
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
         * The screen reads the CSRF token out of this cookie and sends it back
         * in a header. jsdom keeps a real cookie jar, so setting it here is
         * enough. Without it the token would be empty, which the screen allows
         * on purpose so the server can be the one to refuse.
         */
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("sends the username, password and CSRF token, then goes to the home page when the sign-in is accepted", async () => {
        const user = userEvent.setup();

        /*
         * Two answers in order, because the screen makes two requests: the sign
         * in itself, then a question to /api/me about who is now signed in.
         * Form login answers with a redirect either way, so the first answer
         * cannot say whether it worked. The second one can.
         */
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(emptyResponse())
            .mockResolvedValueOnce(
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
         * findBy rather than getBy. The navigation happens after two awaited
         * requests, so the marker is not on the page the instant the click
         * returns. findBy waits for it; getBy would look once and fail.
         */
        expect(await screen.findByText(HOME_MARKER)).toBeInTheDocument();

        /*
         * Check what was actually sent, not only that something was. Spring's
         * form login reads two named fields out of a form-encoded body, and it
         * refuses the request outright if the CSRF header is missing. Both are
         * agreements with the backend that nothing else in the frontend states,
         * so if they break, this is the only place that says so.
         */
        const [loginAddress, loginRequest] = fetchMock.mock.calls[0];
        expect(loginAddress).toBe("/login");
        expect(loginRequest.method).toBe("POST");
        expect(loginRequest.headers["X-XSRF-TOKEN"]).toBe("test-token");
        expect(loginRequest.body.toString()).toBe(
            "username=owner&password=a-real-password",
        );

        expect(fetchMock.mock.calls[1][0]).toBe("/api/me");
    });

    it("stays put and explains itself when the sign-in is refused, even though the answer has a status of 200", async () => {
        const user = userEvent.setup();

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(emptyResponse())
            /*
             * The whole point of this test. Status 200, body HTML. Anything
             * that judges success by the status alone passes this and is wrong.
             */
            .mockResolvedValueOnce(htmlResponse());
        vi.stubGlobal("fetch", fetchMock);

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "the-wrong-one");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            REFUSED_MESSAGE,
        );
        expect(screen.queryByText(HOME_MARKER)).not.toBeInTheDocument();
    });

    it("says the server could not be reached when the request itself fails", async () => {
        const user = userEvent.setup();

        /*
         * A rejected promise, not an error status. This is what fetch does when
         * the request never got an answer at all, such as the server being
         * down, which is a different situation from a wrong password and gets a
         * different message.
         */
        const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
        vi.stubGlobal("fetch", fetchMock);

        renderLoginPage();

        await user.type(screen.getByLabelText("Username"), "owner");
        await user.type(screen.getByLabelText("Password"), "a-real-password");
        await user.click(screen.getByRole("button", { name: "Sign in" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reach the server. Please try again.",
        );
    });

    it("shows the refused message on arrival when the server sent the browser back with ?error", () => {
        renderLoginPage("/login?error");

        /*
         * No request is made here. Spring bounced the browser back to this
         * address itself, and the screen reads the query string to work out why
         * it is being shown again.
         */
        expect(screen.getByRole("alert")).toHaveTextContent(REFUSED_MESSAGE);
    });

    it("confirms the sign out when the server sent the browser back with ?logout", () => {
        renderLoginPage("/login?logout");

        expect(screen.getByText("You have been signed out.")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
