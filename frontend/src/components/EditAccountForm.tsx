/*
 * The form that changes an account's person name. The username is shown in
 * the heading as plain text and has no box.
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_LIMITS, updatePersonName } from "@/lib/accounts";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";
import type { Account } from "@/lib/accounts";

/**
 * Draws the edit form with the current name already in the box.
 *
 * @param account (Account) the account being edited.
 * @param onSaved (function) called with the updated account once the server has stored it.
 * @param onCancel (function) called when the form is closed without saving.
 */
export default function EditAccountForm({
    account,
    onSaved,
    onCancel,
}: {
    account: Account;
    onSaved: (account: Account) => void;
    onCancel: () => void;
}) {
    const [personName, setPersonName] = useState(account.personName);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    /**
     * Checks the name, sends it and hands the result to the parent. A request
     * that gets no answer is caught and shown.
     *
     * @param event (FormEvent) the submit event, whose default page reload is stopped.
     */
    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (personName.trim().length === 0) {
            setError("A name is required.");
            return;
        }
        // The limit is read from ACCOUNT_LIMITS, the same place the add form reads it.
        if (personName.trim().length > ACCOUNT_LIMITS.personNameMax) {
            setError(`Name must be ${ACCOUNT_LIMITS.personNameMax} characters or fewer.`);
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            const result = await updatePersonName(account.id, personName.trim());

            // The session ended. A full browser navigation discards the form with the page.
            if (result.kind === "noSession") {
                window.location.href = "/login";
                return;
            }

            if (result.kind === "error") {
                setError(result.message);
                return;
            }

            onSaved(result.account);
        } catch (failure) {
            setError(
                isTimeout(failure)
                    ? `${TIMEOUT_MESSAGE} Please try again.`
                    : "Could not reach the server. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            aria-label="Edit an account"
            className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-6"
        >
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Editing {account.username}
            </h2>

            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                >
                    {error}
                </p>
            )}

            <div className="max-w-sm space-y-2">
                <Label htmlFor="edit-personName" className="text-slate-700">
                    Name
                </Label>
                <Input
                    id="edit-personName"
                    autoComplete="off"
                    autoFocus
                    value={personName}
                    onChange={(event) => setPersonName(event.target.value)}
                    className="bg-white"
                />
            </div>

            <div className="mt-4 flex gap-3">
                <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save name"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
