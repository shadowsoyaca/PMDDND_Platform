/*
 * Phase 2 Story 5: the form that creates an account.
 *
 * WHY THE CHECKS ARE WRITTEN OUT RATHER THAN LEFT TO THE BROWSER
 *
 * Marking the boxes as required and giving the password a minimum length would
 * make the browser refuse the form on its own, with no code here at all. That was
 * not chosen, for two reasons.
 *
 * The browser's refusal appears as a small bubble that disappears on the next
 * click, is worded by the browser rather than by us, and reads differently in
 * every browser. And it happens before any code here runs, so a test cannot see
 * the message or check that nothing was sent, which would leave the rules
 * uncovered.
 *
 * The rules below are the same ones the server enforces in CreateUserRequest. The
 * server is the one that matters, and it is never trusted to the browser: these
 * exist so that a mistake is pointed out immediately instead of after a round
 * trip that comes back as a bare 400.
 *
 * WHAT IS NOT ON THIS FORM
 *
 * A role, because every account made here is a PLAYER and the server accepts no
 * role field at all. And the created date, because it is decided by the database
 * at the moment the row is written.
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_LIMITS, createAccount } from "@/lib/accounts";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";
import type { Account } from "@/lib/accounts";

/*
 * onCreated - called with the new account once the server has made it, so the
 *             table can show it without asking for the whole list again.
 * onCancel  - called when the form is closed without creating anything.
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

    /*
     * Checks the three boxes before anything is sent.
     *
     * Returns the problem to show, or an empty string when there is none.
     *
     * One message at a time, in the order the boxes appear. Listing every fault
     * at once means fixing the first and being told about the second anyway,
     * which reads as the form having ignored the correction.
     */
    function findProblem(): string {
        if (username.trim().length < ACCOUNT_LIMITS.usernameMin) {
            return `Username must be at least ${ACCOUNT_LIMITS.usernameMin} characters.`;
        }
        if (username.trim().length > ACCOUNT_LIMITS.usernameMax) {
            return `Username must be ${ACCOUNT_LIMITS.usernameMax} characters or fewer.`;
        }
        /*
         * Checked after the length, so someone who typed nothing is told it is
         * required rather than being told which characters are allowed in the
         * nothing they typed.
         *
         * The value is trimmed first, so spaces at either end are removed rather
         * than refused. Spaces in the middle are refused, because that is a
         * different username rather than the same one typed untidily.
         */
        if (!ACCOUNT_LIMITS.usernameAllowed.test(username.trim())) {
            return "A username can use letters, numbers, dashes and underscores only.";
        }
        if (password.length < ACCOUNT_LIMITS.passwordMin) {
            return `Password must be at least ${ACCOUNT_LIMITS.passwordMin} characters.`;
        }
        /*
         * The password's upper limit is the one nobody expects a form to have,
         * and it is not arbitrary. BCrypt hashes the first 72 bytes and ignores
         * everything after them, so a longer password has a tail that does
         * nothing at all. Refusing it here is honest; accepting it would promise
         * something untrue. A password manager generating a very long one is
         * exactly the case where that would go unnoticed.
         */
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

    /*
     * event - the submit event, whose default page reload is stopped.
     *
     * Raises nothing. A request that gets no answer at all is caught and shown,
     * because the alternative is a button that appears to do nothing.
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

            /*
             * The session ended while this form was open. Nothing typed here can
             * succeed until they sign in again, so showing a message and leaving
             * the form open would only invite them to press the button a second
             * time and be refused again.
             *
             * The exit is a full browser navigation rather than a router one, so
             * the half-filled form is thrown away with the page. A password is
             * sitting in it.
             */
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
            /*
             * Runs even when onCreated has already closed the form. Setting state
             * on a component that has gone does nothing, so this is harmless, and
             * leaving the button disabled on every path that does not close the
             * form is worse.
             */
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
                    {/*
                      * new-password rather than off, so a password manager offers
                      * to generate one instead of filling in the owner's own.
                      */}
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
