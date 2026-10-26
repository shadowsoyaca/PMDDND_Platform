/*
 * The sign out button shared by both landing screens. Sends the sign out by
 * hand with the CSRF token, and asks /api/me before reporting a failure.
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { readCsrfToken } from "@/lib/csrf";
import { fetchCurrentUser } from "@/lib/currentUser";
import {
    CSRF_MESSAGE,
    fetchWithTimeout,
    isCsrfRefusal,
    isTimeout,
    TIMEOUT_MESSAGE,
} from "@/lib/http";

export default function SignOutButton() {
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    /**
     * Asks /api/me whether the session survived, then leaves for the login
     * screen or shows the message. If that request also fails the session is
     * treated as still alive.
     *
     * @param failureMessage (string) what to show if the session is still there.
     */
    async function settleWhatHappened(failureMessage: string) {
        try {
            const stillSignedIn = await fetchCurrentUser();

            if (!stillSignedIn) {
                window.location.href = "/login?logout";
                return;
            }

            setError(failureMessage);
        } catch {
            setError(failureMessage);
        }
    }

    /**
     * Sends the sign out and leaves for the login screen on success. Every
     * failure ends with a message on the screen and the person still signed in.
     *
     * @param event (FormEvent) the submit event, whose default page reload is stopped.
     */
    async function handleSignOut(event: FormEvent) {
        event.preventDefault();

        setError("");
        setSubmitting(true);

        try {
            const response = await fetchWithTimeout("/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    // The token is read at the moment of sending, not held in state or markup.
                    "X-XSRF-TOKEN": readCsrfToken(),
                },
            });

            if (response.ok) {
                window.location.href = "/login?logout";
                return;
            }

            // A refusal arrives as an ordinary answer, not an error. It is followed by the /api/me check.
            await settleWhatHappened(
                (await isCsrfRefusal(response))
                    ? `Could not sign out. ${CSRF_MESSAGE}`
                    : "Could not sign out. You are still signed in.",
            );
        } catch (failure) {
            await settleWhatHappened(
                isTimeout(failure)
                    ? `${TIMEOUT_MESSAGE} You are still signed in.`
                    : "Could not reach the server. You are still signed in.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSignOut} className="space-y-3">
            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                >
                    {error}
                </p>
            )}

            <Button
                type="submit"
                variant="outline"
                disabled={submitting}
                className="w-full"
            >
                {submitting ? "Signing out..." : "Sign out"}
            </Button>
        </form>
    );
}
