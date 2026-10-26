/*
 * The account table screen. Lists every account with search and sort in the
 * browser, and holds the add, edit and remove panels above the table.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AddAccountForm from "@/components/AddAccountForm";
import EditAccountForm from "@/components/EditAccountForm";
import RemoveAccountConfirm from "@/components/RemoveAccountConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { fetchAccounts } from "@/lib/accounts";
import type { Account } from "@/lib/accounts";
import { fetchCurrentUser } from "@/lib/currentUser";
import type { CurrentUser } from "@/lib/currentUser";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";

/* The columns that can be sorted, which is every column shown. */
const COLUMNS: { key: keyof Account; heading: string }[] = [
    { key: "username", heading: "Username" },
    { key: "personName", heading: "Name" },
    { key: "role", heading: "Role" },
    { key: "createdAt", heading: "Created" },
];

/**
 * Turns the stored instant into a readable date such as "12 Aug 2026".
 *
 * @param value (string) the createdAt value, ISO 8601 in UTC.
 * @return (string) the day, month and year in the en-GB locale, with no time of day.
 */
function formatCreated(value: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

/* What the screen is currently able to show. */
type ScreenState = "loading" | "ready" | "refused" | "failed";

/* Which form, if any, is open above the table, with the account it works on. */
type OpenForm =
    | { kind: "none" }
    | { kind: "add" }
    | { kind: "edit"; account: Account }
    | { kind: "remove"; account: Account };

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [state, setState] = useState<ScreenState>("loading");
    const [openForm, setOpenForm] = useState<OpenForm>({ kind: "none" });
    const [failure, setFailure] = useState("Could not load the accounts.");

    const [query, setQuery] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof Account>("username");
    const [sortAscending, setSortAscending] = useState(true);

    /* Asks for the accounts and the signed-in person once, when the screen first appears. */
    useEffect(() => {
        let cancelled = false;

        Promise.all([fetchAccounts(), fetchCurrentUser()])
            .then(([result, me]) => {
                if (cancelled) {
                    return;
                }
                if (result.kind === "noSession" || !me) {
                    window.location.href = "/login";
                    return;
                }
                if (result.kind === "refused") {
                    setState("refused");
                    return;
                }
                setAccounts(result.accounts);
                setCurrentUser(me);
                setState("ready");
            })
            .catch((problem) => {
                if (!cancelled) {
                    if (isTimeout(problem)) {
                        setFailure(TIMEOUT_MESSAGE);
                    }
                    setState("failed");
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Adds a created account to the held list, closes the form and clears the search.
     *
     * @param account (Account) the account the server created.
     */
    function handleCreated(account: Account) {
        setAccounts((existing) => [...existing, account]);
        setOpenForm({ kind: "none" });

        /* Only creating clears the search. Editing and removing leave it alone. */
        setQuery("");
    }

    /**
     * Replaces a changed account in the held list and closes the form.
     *
     * @param saved (Account) the account as the server now holds it.
     */
    function handleSaved(saved: Account) {
        setAccounts((existing) =>
            existing.map((account) => (account.id === saved.id ? saved : account)),
        );
        setOpenForm({ kind: "none" });
    }

    /**
     * Takes a removed account out of the held list and closes the form.
     *
     * @param id (number) the id of the account the server removed.
     */
    function handleRemoved(id: number) {
        setAccounts((existing) => existing.filter((account) => account.id !== id));
        setOpenForm({ kind: "none" });
    }

    /*
     * Narrows the table to what was searched for, then puts it in order. The
     * search covers username and person name and ignores capitals. The created
     * date is compared as milliseconds and the other columns as text.
     */
    const visibleAccounts = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const matching = needle
            ? accounts.filter(
                  (account) =>
                      account.username.toLowerCase().includes(needle) ||
                      account.personName.toLowerCase().includes(needle),
              )
            : accounts;

        const ordered = [...matching].sort((left, right) => {
            if (sortColumn === "createdAt") {
                return Date.parse(left.createdAt) - Date.parse(right.createdAt);
            }
            return String(left[sortColumn]).localeCompare(String(right[sortColumn]));
        });

        return sortAscending ? ordered : ordered.reverse();
    }, [accounts, query, sortColumn, sortAscending]);

    /**
     * Sorts by a column, or reverses the order if it is already the sorted column.
     * A new column always starts ascending.
     *
     * @param column (keyof Account) the column that was clicked.
     */
    function toggleSort(column: keyof Account) {
        if (column === sortColumn) {
            setSortAscending(!sortAscending);
            return;
        }
        setSortColumn(column);
        setSortAscending(true);
    }

    if (state === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
                <p className="text-slate-600">Loading...</p>
            </div>
        );
    }

    /* The refusal a player sees. It shows the message and the way back, and nothing else. */
    if (state === "refused") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
                <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p role="alert" className="mb-6 text-red-800">
                        You do not have permission to view this page.
                    </p>
                    <Button asChild variant="outline">
                        <Link to="/">Back to your home page</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (state === "failed") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
                <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p role="alert" className="mb-6 text-red-800">
                        {failure}
                    </p>
                    <Button asChild variant="outline">
                        <Link to="/">Back to your home page</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="mx-auto w-[min(95vw,64rem)] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

                <div className="mb-6 flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Accounts</h1>
                    <div className="flex gap-3">
                        {/* Disabled rather than removed while any form is open. */}
                        <Button
                            disabled={openForm.kind !== "none"}
                            onClick={() => setOpenForm({ kind: "add" })}
                        >
                            Add account
                        </Button>
                        <Button asChild variant="outline">
                            <Link to="/">Back</Link>
                        </Button>
                    </div>
                </div>

                {/*
                  * The panels sit above the table. The key on the edit and remove
                  * panels makes React build a fresh form when the account changes.
                  */}
                {openForm.kind === "add" && (
                    <AddAccountForm
                        onCreated={handleCreated}
                        onCancel={() => setOpenForm({ kind: "none" })}
                    />
                )}

                {openForm.kind === "edit" && (
                    <EditAccountForm
                        key={openForm.account.id}
                        account={openForm.account}
                        onSaved={handleSaved}
                        onCancel={() => setOpenForm({ kind: "none" })}
                    />
                )}

                {openForm.kind === "remove" && (
                    <RemoveAccountConfirm
                        key={openForm.account.id}
                        account={openForm.account}
                        onRemoved={handleRemoved}
                        onCancel={() => setOpenForm({ kind: "none" })}
                    />
                )}

                <div className="mb-6 max-w-sm space-y-2">
                    <Label htmlFor="search" className="text-slate-700">
                        Search
                    </Label>
                    <Input
                        id="search"
                        type="search"
                        placeholder="Username or name"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="bg-white"
                    />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            {COLUMNS.map((column) => (
                                /*
                                 * aria-sort carries the sorted column and its
                                 * direction. The arrow below is hidden from screen readers.
                                 */
                                <TableHead
                                    key={column.key}
                                    aria-sort={
                                        sortColumn === column.key
                                            ? sortAscending
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(column.key)}
                                        className="flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                                    >
                                        {column.heading}
                                        {/* Decoration only, hidden from screen readers. */}
                                        <span aria-hidden="true" className="text-xs">
                                            {sortColumn === column.key
                                                ? sortAscending
                                                    ? "▲"
                                                    : "▼"
                                                : ""}
                                        </span>
                                    </button>
                                </TableHead>
                            ))}

                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {visibleAccounts.map((account) => (
                            <TableRow key={account.id}>
                                <TableCell className="text-slate-900">
                                    {account.username}
                                </TableCell>
                                <TableCell className="text-slate-900">
                                    {account.personName}
                                </TableCell>
                                <TableCell className="text-slate-900">
                                    {account.role}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {formatCreated(account.createdAt)}
                                </TableCell>

                                <TableCell>
                                    <div className="flex gap-2">
                                        {/*
                                          * Disabled rather than removed while a form
                                          * is open. The accessible name names the account.
                                          */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={openForm.kind !== "none"}
                                            aria-label={`Edit ${account.username}`}
                                            onClick={() =>
                                                setOpenForm({ kind: "edit", account })
                                            }
                                        >
                                            Edit
                                        </Button>

                                        {/* No remove button on the signed-in person's own row. */}
                                        {account.username !== currentUser?.username && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={openForm.kind !== "none"}
                                                aria-label={`Remove ${account.username}`}
                                                onClick={() =>
                                                    setOpenForm({ kind: "remove", account })
                                                }
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Shown when the search matches nothing. */}
                        {visibleAccounts.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={COLUMNS.length + 1}
                                    className="py-6 text-center text-slate-600"
                                >
                                    No accounts match that search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
