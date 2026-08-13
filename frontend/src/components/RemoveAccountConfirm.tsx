/*
 * Phase 2 Story 5: the confirmation shown before an account is removed.
 *
 * WHY THE ACCOUNT IS NAMED IN THE QUESTION
 *
 * The card asks for it, and the reason is worth stating. A confirmation reading
 * "Are you sure?" is answered yes by reflex, and it cannot catch the mistake that
 * actually happens, which is pressing remove on the wrong row. Putting the
 * username and the person's name in the question means the wrong row is visible
 * in the sentence being agreed to.
 *
 * WHY REMOVING IS TREATED AS SERIOUS
 *
 * It cannot be undone, and it will eventually take a character, a history and a
 * share of a campaign with it. Phase 2 Story 8 exists because the right answer is
 * often to disable an account rather than delete it, and that story is not built
 * yet, so today this is the only option and the only guard is this question.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/accounts";
import type { Account } from "@/lib/accounts";

/*
 * account   - the account about to be removed.
 * onRemoved - called once the server has removed it.
 * onCancel  - called when the question is answered no.
 */
export default function RemoveAccountConfirm({
    account,
    onRemoved,
    onCancel,
}: {
    account: Account;
    onRemoved: (id: number) => void;
    onCancel: () => void;
}) {
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    /*
     * Raises nothing. A request that gets no answer is caught and shown, which
     * matters more here than elsewhere: silently doing nothing after a confirmed
     * deletion could be read as the deletion having worked.
     */
    async function handleRemove() {
        setError("");
        setSubmitting(true);

        try {
            const result = await deleteAccount(account.id);

            /*
             * The session ended, so nothing was removed. Leaving for the login
             * screen is the only honest answer: the alternative that used to
             * happen here was taking the row out of the table and reporting a
             * deletion that never took place.
             */
            if (result.kind === "noSession") {
                window.location.href = "/login";
                return;
            }

            if (result.kind === "error") {
                setError(result.message);
                return;
            }

            onRemoved(account.id);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-red-900">
                Remove an account
            </h2>

            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                >
                    {error}
                </p>
            )}

            <p className="mb-4 text-slate-800">
                Remove {account.username}, {account.personName}? This cannot be
                undone.
            </p>

            <div className="flex gap-3">
                {/*
                  * Cancel is written first and is the plainer of the two, so the
                  * button reached by reflex is the one that changes nothing.
                  */}
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    disabled={submitting}
                    onClick={handleRemove}
                >
                    {submitting ? "Removing..." : "Remove account"}
                </Button>
            </div>
        </div>
    );
}
