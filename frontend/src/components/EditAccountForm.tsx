/*
 * Phase 2 Story 5: the form that corrects a person's name.
 *
 * WHY THE USERNAME IS SHOWN BUT CANNOT BE EDITED
 *
 * It has to be shown, or the form does not say whose name is being changed. It
 * cannot be edited because a username is the login handle: changing it would sign
 * that person out of a name they had memorised, and the server refuses anyway,
 * since UpdateUserRequest carries one field and it is not this one.
 *
 * It is drawn as plain text rather than as a disabled box. A greyed-out box
 * invites the question of how to switch it on. Text does not.
 *
 * WHY THERE IS NO PASSWORD FIELD
 *
 * Resetting a locked-out player's password is Phase 2 Story 7, which owns that
 * work together with the session handling that has to come with it: changing a
 * password must end the account's other sessions, and nothing does that yet.
 * Adding a password box here would make it look done.
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePersonName } from "@/lib/accounts";
import type { Account } from "@/lib/accounts";

/*
 * account - the account being edited. Its person name fills the box to start
 *           with, because most edits are a correction to what is already there.
 * onSaved - called with the updated account once the server has stored it.
 * onCancel - called when the form is closed without saving.
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

    /*
     * event - the submit event, whose default page reload is stopped.
     *
     * Raises nothing. A request that gets no answer is caught and shown.
     *
     * A blank name is refused here as well as on the server, so the correction is
     * immediate rather than a round trip that returns a bare 400.
     */
    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (personName.trim().length === 0) {
            setError("A name is required.");
            return;
        }

        setError("");
        setSubmitting(true);

        try {
            const result = await updatePersonName(account.id, personName.trim());

            /* The session ended. See AddAccountForm for why this leaves rather
             * than showing a message. */
            if (result.kind === "noSession") {
                window.location.href = "/login";
                return;
            }

            if (result.kind === "error") {
                setError(result.message);
                return;
            }

            onSaved(result.account);
        } catch {
            setError("Could not reach the server. Please try again.");
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
