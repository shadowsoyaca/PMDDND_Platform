/*
 * Phase 2 Story 4.7: tests for the home screen.
 *
 * NOTE - Phase 2 Story 5: HomePage no longer draws anything of its own. It loads
 * the account and picks a screen, so these tests are now about that choice. The
 * sign out test moved to SignOutButton.test.tsx, next to the code it covers.
 *
 * WHAT THESE PROVE
 *
 * The owner is shown the way to the account table and a player is not. That is
 * the visible half of the story's first requirement, and it is worth testing
 * because it is a difference nobody can see by using the platform: each person
 * only ever signs in as themselves, so a player being shown the link would look
 * completely normal to the owner.
 *
 * Alongside that, the two failure cases, which are deliberately different from
 * each other: no session leaves for the login screen, no answer at all stays put
 * and says so.
 *
 * NOTE - Phase 2 Story 5: THERE IS A ROUTER NOW. The old version of this file
 * said there was not, and was right at the time. The owner's screen holds a real
 * link to the account table, and react-router refuses to draw a Link outside a
 * router, so the screen is mounted inside a MemoryRouter that keeps the address
 * in memory rather than in the browser bar.
 *
 * HOW LEAVING THE PAGE IS CHECKED
 *
 * The screen leaves by assigning to window.location.href, deliberately, because
 * a full browser navigation throws the old page away instead of swapping part of
 * it. jsdom will not perform a real navigation and only logs that it did not, so
 * there is nothing to observe unless window.location is replaced first. Each test
 * that needs it swaps in a plain object and then reads the href back. The
 * unstubGlobals setting in vite.config.ts puts the real one back afterwards.
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

/*
 * The wording on the owner's link to the account table. Kept in one constant so
 * a test cannot look for text the screen does not actually use, which would make
 * the player test pass for the wrong reason.
 */
const MANAGE_LINK = "Manage accounts";

/* Mounts the screen inside a router, which the owner's link requires. */
function renderHomePage() {
    return render(
        <MemoryRouter>
            <HomePage />
        </MemoryRouter>,
    );
}

/*
 * Replaces window.location with something a test can read.
 *
 * Returns the stand-in object. Its href starts empty, so a test can assert that
 * it became a particular address, and equally that it stayed empty when the
 * screen should not have gone anywhere.
 *
 * vi.stubGlobal is used rather than assigning to window.location directly. A
 * browser refuses that assignment outright, and jsdom follows suit, because
 * setting location is what performs a navigation rather than a normal write.
 */
function stubLocation(): { href: string } {
    const fakeLocation = { href: "" };
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

describe("HomePage", () => {
    it("shows the owner their account details and a way through to the account table", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(OWNER_ACCOUNT)));

        renderHomePage();

        /*
         * The request is made from an effect after the first draw, so the screen
         * shows Loading first and the details only once the answer arrives.
         * findBy waits for that.
         */
        expect(await screen.findByText("owner")).toBeInTheDocument();
        expect(screen.getByText("Matthew")).toBeInTheDocument();
        expect(screen.getByText("OWNER")).toBeInTheDocument();

        /*
         * Asked for as a link rather than as text. It is an anchor dressed as a
         * button, and being a real anchor is the point: it can be opened in a new
         * tab and is announced as somewhere to go. Checking the address as well
         * means a link that looks right but points nowhere useful still fails.
         */
        const link = screen.getByRole("link", { name: MANAGE_LINK });
        expect(link).toHaveAttribute("href", "/accounts");
    });

    it("shows a player their account details and no way through to the account table", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PLAYER_ACCOUNT)));

        renderHomePage();

        expect(await screen.findByText("ashketchum")).toBeInTheDocument();
        expect(screen.getByText("PLAYER")).toBeInTheDocument();

        /*
         * queryBy, not getBy. getBy throws when it finds nothing, which is the
         * result this test wants, so it would fail on success.
         *
         * This is appearance rather than protection. A player who types the
         * address in still reaches the screen and is refused the data by the
         * server. This only checks they are not invited.
         */
        expect(screen.queryByRole("link", { name: MANAGE_LINK })).not.toBeInTheDocument();
        expect(screen.queryByText(MANAGE_LINK)).not.toBeInTheDocument();
    });

    it("leaves for the login screen when there is no session, even though the answer has a status of 200", async () => {
        /*
         * HTML with a status of 200 is what a logged-out request really produces,
         * because fetch has already followed Spring's redirect without saying so.
         * A screen that trusted the status alone would try to read a login page
         * as an account and draw a landing screen for nobody.
         */
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
        const fakeLocation = stubLocation();

        renderHomePage();

        await waitFor(() => expect(fakeLocation.href).toBe("/login"));
    });

    it("says so, and stays put, when the account details cannot be loaded at all", async () => {
        /*
         * A rejected promise means the request got no answer, which is a
         * different situation from being logged out. Being logged out should
         * leave for the login screen; this should not, because leaving would hide
         * a server problem behind a login prompt and the player would blame their
         * password.
         */
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        const fakeLocation = stubLocation();

        renderHomePage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load your account details.",
        );
        expect(fakeLocation.href).toBe("");
    });
});
