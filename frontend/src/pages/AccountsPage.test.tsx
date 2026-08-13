/*
 * Phase 2 Story 5: tests for the account table.
 *
 * WHAT THESE PROVE
 *
 * The card asks for a table, a search box, sorting on every column, and a refusal
 * for anyone who is not the owner. None of those can be checked by calling a
 * function, because what they amount to is which rows are on the screen and in
 * what order, so these tests drive the screen the way a person does and then read
 * the table back.
 *
 * HOW ROW ORDER IS CHECKED
 *
 * By reading the first cell of every row, which is the username, and comparing
 * the resulting list. Checking that a particular name is on the screen would pass
 * whatever the order, and the order is the entire point of a sort.
 *
 * WHY THE TEST DATA IS SHAPED AS IT IS
 *
 * Three accounts whose usernames, person names, roles and dates all sort into
 * different orders. If two of those orders matched, a sort that read the wrong
 * column would still pass.
 *
 * The times are all noon UTC. The date shown is worked out in the machine's own
 * time zone, and a time near midnight would land on a different day depending on
 * where the test is run, so a test that passed here would fail elsewhere.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AccountsPage from "@/pages/AccountsPage";
import {
    forbiddenResponse,
    htmlResponse,
    jsonResponse,
} from "@/test/responses";

const ACCOUNTS = [
    {
        id: 1,
        username: "owner",
        personName: "Matthew",
        role: "OWNER",
        createdAt: "2026-08-04T12:00:00Z",
    },
    {
        id: 2,
        username: "ashketchum",
        personName: "Ash Ketchum",
        role: "PLAYER",
        createdAt: "2026-08-12T12:00:00Z",
    },
    {
        id: 3,
        username: "misty",
        personName: "Misty Waterflower",
        role: "PLAYER",
        createdAt: "2026-08-01T12:00:00Z",
    },
];

/* Mounts the screen inside a router, which its links require. */
function renderAccountsPage() {
    return render(
        <MemoryRouter>
            <AccountsPage />
        </MemoryRouter>,
    );
}

/*
 * Reads the username out of every row, in the order they appear.
 *
 * Returns the list of usernames currently drawn.
 *
 * The first row is dropped because it is the heading row, which the table role
 * counts as a row like any other.
 */
function usernamesInOrder(): string[] {
    return screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

/* Replaces window.location so a test can see where the screen tried to go. */
function stubLocation(): { href: string } {
    const fakeLocation = { href: "" };
    vi.stubGlobal("location", fakeLocation);
    return fakeLocation;
}

/* Answers the accounts request with the three test accounts. */
function serveAccounts() {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(ACCOUNTS)));
}

describe("AccountsPage", () => {
    it("lists every account with its username, name, role and created date", async () => {
        serveAccounts();

        renderAccountsPage();

        expect(await screen.findByText("ashketchum")).toBeInTheDocument();
        expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
        expect(screen.getByText("Matthew")).toBeInTheDocument();
        expect(screen.getByText("Misty Waterflower")).toBeInTheDocument();

        /*
         * The date is shown in a readable form rather than as the ISO string the
         * server sends, so this checks the conversion happened at all.
         */
        expect(screen.getByText("4 Aug 2026")).toBeInTheDocument();
        expect(screen.getByText("12 Aug 2026")).toBeInTheDocument();

        // Three accounts and one heading row.
        expect(screen.getAllByRole("row")).toHaveLength(4);
    });

    it("narrows the table to accounts whose username contains what was typed", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await screen.findByText("ashketchum");

        await user.type(screen.getByLabelText("Search"), "mist");

        expect(usernamesInOrder()).toEqual(["misty"]);
    });

    it("narrows the table on the person name too, ignoring capitals", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await screen.findByText("ashketchum");

        /*
         * Typed in capitals against a name stored in mixed case, and matching a
         * person name rather than a username. Someone looking for a player types
         * whichever of the two they remember, and will not match the
         * capitalisation.
         */
        await user.type(screen.getByLabelText("Search"), "KETCHUM");

        expect(usernamesInOrder()).toEqual(["ashketchum"]);
    });

    it("says so when the search matches nothing, rather than showing an empty table", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await screen.findByText("ashketchum");

        await user.type(screen.getByLabelText("Search"), "nobody here");

        expect(screen.getByText("No accounts match that search.")).toBeInTheDocument();
    });

    /*
     * Every column, ascending then descending, in one table-driven test.
     *
     * The card asks that clicking a heading sorts by it and clicking it again
     * reverses the order, for every column shown. Written out four times this
     * would be four near-identical tests, and a column added later would be
     * quietly left out. Driving it from a list means the omission is visible.
     *
     * The starting order is by username ascending, which is why the username case
     * clicks once to reverse and the others click once to select.
     */
    const SORT_CASES = [
        {
            heading: "Name",
            ascending: ["ashketchum", "owner", "misty"],
        },
        {
            heading: "Role",
            ascending: ["owner", "ashketchum", "misty"],
        },
        {
            heading: "Created",
            ascending: ["misty", "owner", "ashketchum"],
        },
    ];

    it.each(SORT_CASES)(
        "sorts by $heading when its heading is clicked, and reverses when clicked again",
        async ({ heading, ascending }) => {
            const user = userEvent.setup();
            serveAccounts();

            renderAccountsPage();
            await screen.findByText("ashketchum");

            await user.click(screen.getByRole("button", { name: heading }));
            expect(usernamesInOrder()).toEqual(ascending);

            await user.click(screen.getByRole("button", { name: heading }));
            expect(usernamesInOrder()).toEqual([...ascending].reverse());
        },
    );

    it("sorts by username, which is the order it starts in, and reverses on a click", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await screen.findByText("ashketchum");

        // Before anything is clicked at all.
        expect(usernamesInOrder()).toEqual(["ashketchum", "misty", "owner"]);

        await user.click(screen.getByRole("button", { name: "Username" }));
        expect(usernamesInOrder()).toEqual(["owner", "misty", "ashketchum"]);
    });

    it("tells the sorted column and its direction to assistive software", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await screen.findByText("ashketchum");

        /*
         * The arrow drawn in the heading is hidden from screen readers on
         * purpose, so aria-sort is the only thing carrying this information to
         * anyone who cannot see it. Nothing else in the frontend states that, so
         * if it is dropped, this is the only place that says so.
         */
        expect(screen.getByRole("columnheader", { name: "Username" }))
            .toHaveAttribute("aria-sort", "ascending");
        expect(screen.getByRole("columnheader", { name: "Role" }))
            .toHaveAttribute("aria-sort", "none");

        await user.click(screen.getByRole("button", { name: "Username" }));

        expect(screen.getByRole("columnheader", { name: "Username" }))
            .toHaveAttribute("aria-sort", "descending");
    });

    it("refuses a signed-in player and shows them no account data at all", async () => {
        /*
         * 403 is what the server answers a signed-in player who is not the owner.
         * The important half of this test is the second assertion: not merely
         * that the refusal appears, but that no part of the table does. An empty
         * version of the real screen would leak the shape of what is hidden and
         * would look like a fault rather than a decision.
         */
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(forbiddenResponse()));
        const fakeLocation = stubLocation();

        renderAccountsPage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "You do not have permission to view this page.",
        );
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();

        /*
         * And they are not sent to the login screen. They are already signed in,
         * so signing in again would produce the same refusal, which is a loop
         * with no way out of it.
         */
        expect(fakeLocation.href).toBe("");
    });

    it("leaves for the login screen when there is no session, even though the answer has a status of 200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));
        const fakeLocation = stubLocation();

        renderAccountsPage();

        await waitFor(() => expect(fakeLocation.href).toBe("/login"));
    });

    it("says so, and stays put, when the accounts cannot be loaded at all", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        const fakeLocation = stubLocation();

        renderAccountsPage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load the accounts.",
        );
        expect(fakeLocation.href).toBe("");
    });
});
