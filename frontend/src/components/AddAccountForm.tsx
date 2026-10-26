/*
 * The form that creates a player account. Checks the three boxes against the
 * same rules as CreateUserRequest before sending anything.
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_LIMITS, createAccount } from "@/lib/accounts";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";
import type { Account } from "@/lib/accounts";

/**
 * Draws the add form and sends the new account to the server.
 *
 * @param onCreated (function) called with the new account once the server has made it.
 * @param onCancel (function) called when the form is closed without creating anything.
 */
export default function AddAccountForm({
    onCreated,
    onCancel,
}: {
    onCreated: (account: Account) => void;
    onCancel: () => void;
}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [personName, setPersonName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    /**
     * Checks the three boxes before anything is sent, one message at a time in
     * the order the boxes appear.
     *
     * @return (string) the problem to show, or an empty string when there is none.
     */
    function findProblem(): string {
        if (username.trim().length < ACCOUNT_LIMITS.usernameMin) {
            return `Username must be at least ${ACCOUNT_LIMITS.usernameMin} characters.`;
        }
        if (username.trim().length > ACCOUNT_LIMITS.usernameMax) {
            return `Username must be ${ACCOUNT_LIMITS.usernameMax} characters or fewer.`;
        }
        // The format check runs after the length checks, on the trimmed value.
        if (!ACCOUNT_LIMITS.usernameAllowed.test(username.trim())) {
            return "A username can use letters, numbers, dashes and underscores only.";
        }
        if (password.length < ACCOUNT_LIMITS.passwordMin) {
            return `Password must be at least ${ACCOUNT_LIMITS.passwordMin} characters.`;
        }
        if (password.length > ACCOUNT_LIMITS.passwordMax) {
            return `Password must be ${ACCOUNT_LIMITS.passwordMax} characters or fewer.`;
        }
        if (personName.trim().length === 0) {
            return "A name is required.";
        }
        if (personName.trim().length > ACCOUNT_LIMITS.personNameMax) {
            return `Name must be ${ACCOUNT_LIMITS.personNameMax} characters or fewer.`;
        }
        return "";
    }

    /**
     * Checks the boxes, sends the account and hands the result to the parent.
     * A request that gets no answer is caught and shown.
     *
     * @param event (FormEvent) the submit event, whose default page reload is stopped.
     */
    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const problem = findProblem();
        if (problem) {
            setError(problem);
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            const result = await createAccount({
                username: username.trim(),
                password,
                personName: personName.trim(),
            });

            // The session ended. A full browser navigation discards the form with the page.
            if (result.kind === "noSession") {
                window.location.href = "/login";
                return;
            }

            if (result.kind === "error") {
                setError(result.message);
                return;
            }

            onCreated(result.account);
        } catch (failure) {
            setError(
                isTimeout(failure)
                    ? `${TIMEOUT_MESSAGE} Please try again.`
                    : "Could not reach the server. Please try again.",
            );
        } finally {
            // Runs on every path, including after onCreated has closed the form.
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            aria-label="Add a new account"
            className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-6"
        >
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Add a new account
            </h2>

            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                >
                    {error}
                </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="new-username" className="text-slate-700">
                        Username
                    </Label>
                    <Input
                        id="new-username"
                        autoComplete="off"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="bg-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-personName" className="text-slate-700">
                        Name
                    </Label>
                    <Input
                        id="new-personName"
                        autoComplete="off"
                        value={personName}
                        onChange={(event) => setPersonName(event.target.value)}
                        className="bg-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-slate-700">
                        Password
                    </Label>
                    {/* new-password, not off: a password manager then offers to generate one. */}
                    <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="bg-white"
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-3">
                <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create account"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
