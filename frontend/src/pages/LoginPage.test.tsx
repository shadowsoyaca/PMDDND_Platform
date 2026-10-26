/*
 * Tests for the login screen. The screen is mounted inside a MemoryRouter with
 * a stand-in page at "/", and navigation is checked by finding that page's text.
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

const HOME_MARKER = "Stand-in home page";

const REFUSED_MESSAGE =
    "That username and password did not match. Please try again.";

/**
 * Mounts the login screen inside a router with a stand-in page at "/".
 * @param address (string) the address the router starts at. Defaults to "/login".
 * @return (RenderResult) whatever render returns.
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
        // Sets the CSRF cookie the screen reads, fresh for each test.
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

        expect(await screen.findByText(HOME_MARKER)).toBeInTheDocument();

        // Exactly one request. There is no follow-up call to /api/me.
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

        expect(await screen.findByRole("alert")).toHaveTextContent(CSRF_MESSAGE);
        expect(screen.queryByText(HOME_MARKER)).not.toBeInTheDocument();
    });

    it("says the server could not be reached when the request itself fails", async () => {
        const user = userEvent.setup();

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
        // "/login?logout" is the literal address the server redirects to after signing out.
        renderLoginPage("/login?logout");

        expect(screen.getByText("You have been signed out.")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
