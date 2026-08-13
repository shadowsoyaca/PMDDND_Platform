/*
 * Phase 2 Story 5: the account table.
 *
 * WHAT THIS IS FOR
 *
 * Phase 2 Story 3 built the account management API and no screen to use it.
 * Creating a player meant calling /api/admin/users by hand, which is why the
 * server has one account on it. This is the screen.
 *
 * WHY SEARCHING AND SORTING HAPPEN IN THE BROWSER
 *
 * The whole table is already here. This is a group of friends, so the number of
 * accounts is measured in single figures and will not reach three, meaning
 * anything a search or a sort could do on the server can be done here with no
 * request at all. Sorting on the server would mean a round trip per click and a
 * new endpoint, in exchange for nothing at this size.
 *
 * That reasoning has a limit, and the limit is the reason the story asks for a
 * stress test rather than taking the argument on trust.
 *
 * WHY A PLAYER REACHING THIS SCREEN IS NOT A HOLE
 *
 * Any signed-in person can load this screen by typing the address, and that is
 * expected. The screen holds no account data of its own. It asks the server, the
 * server refuses anyone who is not the owner, and the refusal is what is drawn.
 * Hiding the link on the player's landing screen is politeness; this refusal is
 * the actual boundary, and it is enforced on the far side of the network where
 * nobody can edit it.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

/*
 * The columns that can be sorted, which is every column shown.
 *
 * Written as a list of objects rather than as a type alone so that the table
 * headings are drawn from the same place the sorting reads. A column added here
 * appears in the table and becomes sortable together, rather than appearing and
 * then quietly doing nothing when clicked.
 */
const COLUMNS: { key: keyof Account; heading: string }[] = [
    { key: "username", heading: "Username" },
    { key: "personName", heading: "Name" },
    { key: "role", heading: "Role" },
    { key: "createdAt", heading: "Created" },
];

/*
 * Turns the stored instant into something readable.
 *
 * value - the createdAt string, ISO 8601 in UTC.
 *
 * Returns a date such as "12 Aug 2026".
 *
 * The locale is named rather than left to the machine. Leaving it out gives
 * whatever the browser is set to, so the same account would read "12 Aug 2026"
 * here and "Aug 12, 2026" on someone else's laptop, and a test could pass on one
 * machine and fail on another.
 *
 * The time of day is not shown. Nobody managing five accounts needs the minute an
 * account was made, and a column of timestamps is harder to read at a glance.
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

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [state, setState] = useState<ScreenState>("loading");

    const [query, setQuery] = useState("");
    const [sortColumn, setSortColumn] = useState<keyof Account>("username");
    const [sortAscending, setSortAscending] = useState(true);

    /*
     * Ask for the accounts once, when the screen first appears.
     *
     * The three answers are deliberately handled differently. Being refused is
     * not being signed out: sending a refused player to the login screen would
     * ask them to do the one thing that cannot help, since they are already
     * signed in and signing in again produces the same refusal.
     */
    useEffect(() => {
        let cancelled = false;

        fetchAccounts()
            .then((result) => {
                if (cancelled) {
                    return;
                }
                if (result.kind === "noSession") {
                    window.location.href = "/login";
                    return;
                }
                if (result.kind === "refused") {
                    setState("refused");
                    return;
                }
                setAccounts(result.accounts);
                setState("ready");
            })
            .catch(() => {
                if (!cancelled) {
                    setState("failed");
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /*
     * Narrows the table to what was searched for, then puts it in order.
     *
     * useMemo means this is worked out again only when the accounts, the search
     * text, or the sorting changes, rather than on every redraw. At five accounts
     * that saves nothing measurable and is done for a different reason: it states
     * plainly what this value depends on, so a later change that forgets one of
     * them shows up as a table that does not react.
     *
     * The search covers the username and the person name, and ignores capitals,
     * because someone looking for a player will type whichever of the two they
     * happen to remember and will not match the capitalisation.
     *
     * The date is compared as a number of milliseconds rather than as text.
     * Comparing the ISO strings would give the same order today, since ISO dates
     * happen to sort correctly as text, but only while every value carries the
     * same shape and the same time zone. That is a coincidence to rely on
     * knowingly or not at all.
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

    /*
     * Sorts by a column, or reverses it if it is already the one being sorted by.
     *
     * column - which column was clicked.
     *
     * A new column always starts ascending rather than keeping the previous
     * direction. Carrying the direction over means clicking a fresh heading can
     * produce a descending sort nobody asked for, which reads as the click having
     * done the wrong thing.
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

    /*
     * The refusal. This is what a player sees if they type the address in.
     *
     * It says what happened and offers the way back, and shows nothing else. No
     * empty table, no column headings, no count of how many accounts there are.
     * An empty version of the real screen would leak the shape of what is being
     * hidden, and would look like a fault rather than a decision.
     */
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
                        Could not load the accounts.
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
                    <Button asChild variant="outline">
                        <Link to="/">Back</Link>
                    </Button>
                </div>

                <div className="mb-6 max-w-sm space-y-2">
                    <Label htmlFor="search" className="text-slate-700">
                        Search
                    </Label>
                    {/*
                      * Not inside a form. There is nothing to submit: the table
                      * narrows as the text changes, so a form would only add an
                      * Enter key that appears to do nothing.
                      */}
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
                                 * aria-sort tells assistive software which column
                                 * the table is ordered by and in which direction.
                                 * Without it the arrow below is visible only to
                                 * people who can see it, and the ordering is
                                 * invisible to everyone else.
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
                                    {/*
                                      * A real button inside the heading, rather
                                      * than a click handler on the heading cell.
                                      * A button can be reached by keyboard and is
                                      * announced as something that can be
                                      * pressed; a cell with a handler is neither.
                                      */}
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(column.key)}
                                        className="flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900"
                                    >
                                        {column.heading}
                                        {/*
                                          * The arrow is decoration. It repeats
                                          * what aria-sort already says properly,
                                          * so it is hidden from screen readers to
                                          * avoid it being read out as a stray
                                          * character.
                                          */}
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
                            </TableRow>
                        ))}

                        {/*
                          * A search matching nothing says so. An empty table with
                          * headings and no rows reads as something having gone
                          * wrong rather than as an answer.
                          */}
                        {visibleAccounts.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={COLUMNS.length}
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
