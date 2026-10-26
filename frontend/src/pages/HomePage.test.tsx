/*
 * Tests for the home screen: which screen it picks for each account role, and
 * what it does when there is no session or the account cannot be loaded.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import { htmlResponse, jsonResponse } from "@/test/responses";

const OWNER_ACCOUNT = {
    username: "owner",
    personName: "Matthew",
    role: "OWNER",
};

const PLAYER_ACCOUNT = {
    username: "ashketchum",
    personName: "Ash Ketchum",
    role: "PLAYER",
};

const MANAGE_LINK = "Manage accounts";

/**
 * Mounts the screen inside a MemoryRouter. Every render in this file goes through it.
 * @return (RenderResult) whatever render returns.
 */
function renderHomePage() {
    return render(
        <MemoryRouter>
            <HomePage />
        </MemoryRouter>,
    );
}

/**
 * Replaces window.location with a plain object whose href a test can read back.
 * @return ({ href: string }) the stand-in object.
 */
function stubLocation(): { href: string } {
    // href starts empty on purpose.
    const fakeLocation = { href: "" };
    // vi.stubGlobal is required here. Assigning to window.location is refused.
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

describe("HomePage", () => {
    it("shows the owner their account details and a way through to the account table", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(OWNER_ACCOUNT)));

        renderHomePage();

        expect(await screen.findByText("owner")).toBeInTheDocument();
        expect(screen.getByText("Matthew")).toBeInTheDocument();
        expect(screen.getByText("OWNER")).toBeInTheDocument();

        const link = screen.getByRole("link", { name: MANAGE_LINK });
        expect(link).toHaveAttribute("href", "/accounts");
    });

    it("shows a player their account details and no way through to the account table", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PLAYER_ACCOUNT)));

        renderHomePage();

        expect(await screen.findByText("ashketchum")).toBeInTheDocument();
        expect(screen.getByText("PLAYER")).toBeInTheDocument();

        expect(screen.queryByRole("link", { name: MANAGE_LINK })).not.toBeInTheDocument();
        expect(screen.queryByText(MANAGE_LINK)).not.toBeInTheDocument();
    });

    it("leaves for the login screen when there is no session, even though the answer has a status of 200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
        const fakeLocation = stubLocation();

        renderHomePage();

        await waitFor(() => expect(fakeLocation.href).toBe("/login"));
    });

    it("says so, and stays put, when the account details cannot be loaded at all", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        const fakeLocation = stubLocation();

        renderHomePage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load your account details.",
        );
        expect(fakeLocation.href).toBe("");
    });
});
