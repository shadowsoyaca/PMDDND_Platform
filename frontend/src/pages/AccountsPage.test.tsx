/*
 * Phase 2 Story 5: tests for the account table.
 *
 * WHAT THESE PROVE
 *
 * The card asks for a table, a search box, sorting on every column, three forms,
 * and a refusal for anyone who is not the owner. None of those can be checked by
 * calling a function, because what they amount to is which rows are on the screen
 * and in what order, so these tests drive the screen the way a person does and
 * then read the table back.
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
 *
 * WHY THE FETCH STAND-IN ANSWERS BY ADDRESS AND METHOD
 *
 * The screen makes two requests before it can draw anything, the accounts and
 * who is signed in, and then one more for each change. A stand-in that gave the
 * same answer to all of them would hand the account list back as the signed-in
 * person, and the test would still pass while proving nothing about which row is
 * the owner's own.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AccountsPage from "@/pages/AccountsPage";
import { ACCOUNT_LIMITS } from "@/lib/accounts";
import {
    conflictResponse,
    createdResponse,
    forbiddenResponse,
    htmlResponse,
    jsonResponse,
    noContentResponse,
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

/* Who the tests are signed in as. The owner row is ACCOUNTS[0], the same person. */
const SIGNED_IN_OWNER = {
    username: "owner",
    personName: "Matthew",
    role: "OWNER",
};

/* What the server answers when the add form succeeds. */
const CREATED_ACCOUNT = {
    id: 4,
    username: "brock",
    personName: "Brock Harrison",
    role: "PLAYER",
    createdAt: "2026-08-12T12:00:00Z",
};

/* What the server answers when the edit form succeeds. */
const RENAMED_ACCOUNT = { ...ACCOUNTS[2], personName: "Misty W." };

/*
 * Answers every request the screen makes.
 *
 * changes - optional replacements for the three change requests, so a test can
 *           make one of them fail without describing the other four.
 *
 * Returns the stand-in itself, so a test can check what was sent, or that
 * nothing was.
 */
function serveAccounts(
    changes: { create?: Response; update?: Response; remove?: Response } = {},
) {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        const method = options?.method ?? "GET";

        if (url === "/api/me") {
            return Promise.resolve(jsonResponse(SIGNED_IN_OWNER));
        }
        if (method === "POST") {
            return Promise.resolve(changes.create ?? createdResponse(CREATED_ACCOUNT));
        }
        if (method === "PUT") {
            return Promise.resolve(changes.update ?? jsonResponse(RENAMED_ACCOUNT));
        }
        if (method === "DELETE") {
            return Promise.resolve(changes.remove ?? noContentResponse());
        }
        return Promise.resolve(jsonResponse(ACCOUNTS));
    });

    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

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

/* Waits for the first draw of the table, which every test needs before acting. */
async function waitForTable() {
    await screen.findByText("ashketchum");
}

describe("AccountsPage", () => {
    // -------------------------------------------------------------------------
    // The table
    // -------------------------------------------------------------------------

    it("lists every account with its username, name, role and created date", async () => {
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

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
        await waitForTable();

        await user.type(screen.getByLabelText("Search"), "mist");

        expect(usernamesInOrder()).toEqual(["misty"]);
    });

    it("narrows the table on the person name too, ignoring capitals", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

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
        await waitForTable();

        await user.type(screen.getByLabelText("Search"), "nobody here");

        expect(screen.getByText("No accounts match that search.")).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Sorting
    // -------------------------------------------------------------------------

    /*
     * Every column, ascending then descending, in one table-driven test.
     *
     * The card asks that clicking a heading sorts by it and clicking it again
     * reverses the order, for every column shown. Written out four times this
     * would be four near-identical tests, and a column added later would be
     * quietly left out. Driving it from a list means the omission is visible.
     */
    const SORT_CASES = [
        { heading: "Name", ascending: ["ashketchum", "owner", "misty"] },
        { heading: "Role", ascending: ["owner", "ashketchum", "misty"] },
        { heading: "Created", ascending: ["misty", "owner", "ashketchum"] },
    ];

    it.each(SORT_CASES)(
        "sorts by $heading when its heading is clicked, and reverses when clicked again",
        async ({ heading, ascending }) => {
            const user = userEvent.setup();
            serveAccounts();

            renderAccountsPage();
            await waitForTable();

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
        await waitForTable();

        // Before anything is clicked at all.
        expect(usernamesInOrder()).toEqual(["ashketchum", "misty", "owner"]);

        await user.click(screen.getByRole("button", { name: "Username" }));
        expect(usernamesInOrder()).toEqual(["owner", "misty", "ashketchum"]);
    });

    it("tells the sorted column and its direction to assistive software", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

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

    // -------------------------------------------------------------------------
    // Adding an account
    // -------------------------------------------------------------------------

    it("creates an account from the add form and shows it in the table", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));

        await user.type(screen.getByLabelText("Username"), "brock");
        await user.type(screen.getByLabelText("Name"), "Brock Harrison");
        await user.type(screen.getByLabelText("Password"), "rocksolid1");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        // The new account is in the table, in username order alongside the rest.
        await waitFor(() =>
            expect(usernamesInOrder()).toEqual([
                "ashketchum",
                "brock",
                "misty",
                "owner",
            ]),
        );

        /*
         * Check what actually went out. The endpoint takes three named fields and
         * no role, and refuses a request with no CSRF token. Both are agreements
         * with the backend that nothing else in the frontend states.
         */
        const [address, request] = fetchMock.mock.calls.find(
            (call) => call[1]?.method === "POST",
        )!;
        expect(address).toBe("/api/admin/users");
        expect(JSON.parse(request.body)).toEqual({
            username: "brock",
            personName: "Brock Harrison",
            password: "rocksolid1",
        });
        expect(request.headers["X-XSRF-TOKEN"]).toBeDefined();

        // The form closes once the account exists.
        expect(screen.queryByRole("form", { name: "Add a new account" })).not.toBeInTheDocument();
    });

    it("shows a new account even when a search was hiding everything else", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

        /*
         * A search narrow enough that the new account cannot match it. Without
         * the search being cleared, the row is added and stays invisible, which
         * reads as the add having silently failed.
         */
        await user.type(screen.getByLabelText("Search"), "misty");
        expect(usernamesInOrder()).toEqual(["misty"]);

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "brock");
        await user.type(screen.getByLabelText("Name"), "Brock Harrison");
        await user.type(screen.getByLabelText("Password"), "rocksolid1");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        await waitFor(() =>
            expect(usernamesInOrder()).toEqual([
                "ashketchum",
                "brock",
                "misty",
                "owner",
            ]),
        );
        expect(screen.getByLabelText("Search")).toHaveValue("");
    });

    it("says the username is taken when the server refuses it, and adds nothing", async () => {
        const user = userEvent.setup();
        serveAccounts({ create: conflictResponse() });

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "misty");
        await user.type(screen.getByLabelText("Name"), "Someone Else");
        await user.type(screen.getByLabelText("Password"), "waterrules1");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        /*
         * The wording comes from the frontend, not the server. Spring sends a
         * bare 409 with no message, because server.error.include-message is left
         * at its default rather than exposing exception text to the browser.
         */
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "That username is already taken.",
        );

        // Still three accounts, and the form is still open with the details in it.
        expect(usernamesInOrder()).toEqual(["ashketchum", "misty", "owner"]);
        expect(screen.getByLabelText("Username")).toHaveValue("misty");
    });

    it("refuses a password that is too short without sending anything at all", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "brock");
        await user.type(screen.getByLabelText("Name"), "Brock Harrison");
        await user.type(screen.getByLabelText("Password"), "short");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Password must be at least 8 characters.",
        );

        /*
         * Nothing was sent. The server enforces this too and would answer 400,
         * but a round trip to be told what the form already knew is a slower and
         * vaguer way of saying the same thing.
         */
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    });

    it("refuses a username with a space in it, without sending anything", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "ash ketchum");
        await user.type(screen.getByLabelText("Name"), "Ash Ketchum");
        await user.type(screen.getByLabelText("Password"), "pikachu2026");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "A username can use letters, numbers, dashes and underscores only.",
        );
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    });

    it("accepts a username with a dash and an underscore", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "ash_ketchum-2");
        await user.type(screen.getByLabelText("Name"), "Ash Ketchum");
        await user.type(screen.getByLabelText("Password"), "pikachu2026");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        /*
         * The other half of the rule. A check written slightly too strictly would
         * refuse these two characters and pass every test above, because all of
         * those use plain letters.
         */
        await waitFor(() =>
            expect(
                fetchMock.mock.calls.some((call) => call[1]?.method === "POST"),
            ).toBe(true),
        );
    });

    it("refuses a password longer than BCrypt actually reads, without sending anything", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "brock");
        await user.type(screen.getByLabelText("Name"), "Brock Harrison");
        await user.click(screen.getByLabelText("Password"));
        await user.paste("p".repeat(ACCOUNT_LIMITS.passwordMax + 1));
        await user.click(screen.getByRole("button", { name: "Create account" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            `Password must be ${ACCOUNT_LIMITS.passwordMax} characters or fewer.`,
        );
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    });

    it("refuses a name longer than the server allows, without sending anything", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));
        await user.type(screen.getByLabelText("Username"), "brock");
        /*
         * One character past the server's limit. Pasted rather than typed, since
         * typing 101 characters one at a time is slow enough to be noticed in the
         * test run.
         */
        await user.click(screen.getByLabelText("Name"));
        await user.paste("B".repeat(ACCOUNT_LIMITS.personNameMax + 1));
        await user.type(screen.getByLabelText("Password"), "rocksolid1");
        await user.click(screen.getByRole("button", { name: "Create account" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            `Name must be ${ACCOUNT_LIMITS.personNameMax} characters or fewer.`,
        );
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    });

    it("refuses a name longer than the server allows on the edit form too", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Edit misty" }));

        const nameBox = screen.getByLabelText("Name");
        await user.clear(nameBox);
        await user.click(nameBox);
        await user.paste("M".repeat(ACCOUNT_LIMITS.personNameMax + 1));
        await user.click(screen.getByRole("button", { name: "Save name" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            `Name must be ${ACCOUNT_LIMITS.personNameMax} characters or fewer.`,
        );
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "PUT")).toBe(false);
    });

    it("offers no way to set a role, a username other than the login name, or a created date", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Add account" }));

        /*
         * Every account created here is a PLAYER, and the created date is decided
         * by the database. Neither is the owner's to choose, and the server would
         * ignore both if they were sent.
         */
        expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Created")).not.toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Editing an account
    // -------------------------------------------------------------------------

    it("changes a person name from the edit form and shows the new value in the table", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Edit misty" }));

        const nameBox = screen.getByLabelText("Name");
        await user.clear(nameBox);
        await user.type(nameBox, "Misty W.");
        await user.click(screen.getByRole("button", { name: "Save name" }));

        expect(await screen.findByText("Misty W.")).toBeInTheDocument();
        expect(screen.queryByText("Misty Waterflower")).not.toBeInTheDocument();

        const [address, request] = fetchMock.mock.calls.find(
            (call) => call[1]?.method === "PUT",
        )!;
        // The account's own id, not its position in the table.
        expect(address).toBe("/api/admin/users/3");
        expect(JSON.parse(request.body)).toEqual({ personName: "Misty W." });
    });

    it("does not let the username be changed on the edit form", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Edit misty" }));

        /*
         * The username is shown in the heading so it is clear whose name is being
         * changed, and there is no box for it. It is the login handle: changing
         * it would sign that person out of a name they had memorised, and the
         * server accepts only the person name anyway.
         */
        expect(screen.getByText("Editing misty")).toBeInTheDocument();
        expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Removing an account
    // -------------------------------------------------------------------------

    it("names the account in the confirmation and removes nothing when it is cancelled", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Remove misty" }));

        /*
         * The question names the account. "Are you sure?" is answered yes by
         * reflex and cannot catch the mistake that actually happens, which is
         * pressing remove on the wrong row.
         */
        expect(
            screen.getByText(/Remove misty, Misty Waterflower\?/),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(usernamesInOrder()).toEqual(["ashketchum", "misty", "owner"]);
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(
            false,
        );
    });

    it("removes the account when the confirmation is agreed to", async () => {
        const user = userEvent.setup();
        const fetchMock = serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Remove misty" }));
        await user.click(screen.getByRole("button", { name: "Remove account" }));

        await waitFor(() =>
            expect(usernamesInOrder()).toEqual(["ashketchum", "owner"]),
        );

        const [address, request] = fetchMock.mock.calls.find(
            (call) => call[1]?.method === "DELETE",
        )!;
        expect(address).toBe("/api/admin/users/3");
        expect(request.headers["X-XSRF-TOKEN"]).toBeDefined();
    });

    it("offers the owner no way to remove their own account", async () => {
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

        /*
         * The signed-in account is "owner", which is also a row in the table. The
         * server refuses this deletion as well, and that refusal is the one that
         * counts. Leaving the button there and letting the server say no would
         * mean offering an action that never works.
         */
        expect(
            screen.queryByRole("button", { name: "Remove owner" }),
        ).not.toBeInTheDocument();

        // The rest of the row still works. Only removal is withheld.
        expect(screen.getByRole("button", { name: "Edit owner" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove misty" })).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // Who is allowed to see any of this
    // -------------------------------------------------------------------------

    it("refuses a signed-in player and shows them no account data at all", async () => {
        /*
         * 403 is what the server answers a signed-in player who is not the owner.
         * The important half of this test is the second assertion: not merely
         * that the refusal appears, but that no part of the table does. An empty
         * version of the real screen would leak the shape of what is hidden and
         * would look like a fault rather than a decision.
         */
        vi.stubGlobal(
            "fetch",
            vi.fn().mockImplementation((url: string) =>
                Promise.resolve(
                    url === "/api/me"
                        ? jsonResponse({
                              username: "ashketchum",
                              personName: "Ash Ketchum",
                              role: "PLAYER",
                          })
                        : forbiddenResponse(),
                ),
            ),
        );
        const fakeLocation = stubLocation();

        renderAccountsPage();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "You do not have permission to view this page.",
        );
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Add account" })).not.toBeInTheDocument();

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
