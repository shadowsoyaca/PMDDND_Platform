/*
 * Tests for the account table screen. They drive the screen the way a person
 * does and read the table back, checking row order through the username column.
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

/**
 * Answers every request the screen makes, routed by both address and method.
 *
 * @param changes (object) optional replacements for the create, update and remove answers.
 * @return (Mock) the fetch stand-in, so a test can check what was sent.
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

/**
 * Reads the username out of every data row, in the order they appear.
 * The slice drops the heading row, which the row role returns as well.
 *
 * @return (string[]) the usernames in table order.
 */
function usernamesInOrder(): string[] {
    return screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

/**
 * Replaces window.location so a test can see where the screen tried to go.
 * Must be called before render.
 *
 * @return ({ href: string }) the replacement, whose href records the destination.
 */
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

        // Checks the ISO string was converted to a readable date.
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

        // Capitals typed against a mixed-case person name.
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

    /* Every column, ascending then descending, in one table-driven test. */
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

        // aria-sort carries the order to assistive software; the arrow is hidden from it.
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

        // Checks what went out: three named fields, no role, and the CSRF header.
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

        // A search the new account cannot match.
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

        // The wording comes from the frontend. The server sends a bare 409.
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

        // Nothing was sent.
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

        // The accepting half of the username rule.
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
        // One character past the limit, pasted rather than typed.
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

        // The username is in the heading and has no box.
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

        // The question names the account.
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

        // The signed-in account is "owner", which is also a row in the table.
        expect(
            screen.queryByRole("button", { name: "Remove owner" }),
        ).not.toBeInTheDocument();

        // The rest of the row still works. Only removal is withheld.
        expect(screen.getByRole("button", { name: "Edit owner" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Remove misty" })).toBeInTheDocument();
    });

    // -------------------------------------------------------------------------
    // One thing at a time
    // -------------------------------------------------------------------------

    it("takes the other actions away while a form is open, so nothing typed is lost", async () => {
        const user = userEvent.setup();
        serveAccounts();

        renderAccountsPage();
        await waitForTable();

        await user.click(screen.getByRole("button", { name: "Edit misty" }));

        // All three are still on the page and disabled.
        expect(screen.getByRole("button", { name: "Add account" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Edit ashketchum" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Remove ashketchum" })).toBeDisabled();

        // Cancelling gives all of them back.
        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Edit ashketchum" })).toBeEnabled();
    });

    // -------------------------------------------------------------------------
    // Who is allowed to see any of this
    // -------------------------------------------------------------------------

    it("refuses a signed-in player and shows them no account data at all", async () => {
        // 403 is what the server answers a signed-in player. No part of the table may appear.
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

        // They are not sent to the login screen.
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
