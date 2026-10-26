/*
 * The confirmation shown before an account is removed. The question names the
 * account, and the row leaves the table only once the server reports the removal.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/accounts";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";
import type { Account } from "@/lib/accounts";

/**
 * Draws the removal question and its two buttons.
 *
 * @param account (Account) the account about to be removed.
 * @param onRemoved (function) called with the account id once the server has removed it.
 * @param onCancel (function) called when the question is answered no.
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
     * Sends the removal and hands the result to the parent. A request that
     * gets no answer is caught and shown.
     */
    async function handleRemove() {
        setError("");
        setSubmitting(true);

        try {
            const result = await deleteAccount(account.id);

            // The session ended and nothing was removed.
            if (result.kind === "noSession") {
                window.location.href = "/login";
                return;
            }

            if (result.kind === "error") {
                setError(result.message);
                return;
            }

            onRemoved(account.id);
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
                {/* Cancel comes first and is the plainer of the two. The order is deliberate. */}
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
