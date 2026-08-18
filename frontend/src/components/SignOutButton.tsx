/*
 * Phase 2 Story 5: the sign out button, shared by both landing screens.
 *
 * WHY THIS IS ITS OWN COMPONENT
 *
 * Story 5 splits the landing page in two, and both halves need this button. It
 * carries a detail that must not be copied and slightly changed, described below,
 * so it moved out of HomePage into a piece both screens use as it is.
 *
 * WHY THE REQUEST IS SENT BY HAND RATHER THAN BY SUBMITTING A FORM
 *
 * The token used to live in a hidden form field, written in as the form was
 * submitted. That was unreliable. React owns that field and resets it to empty on
 * any redraw, and the answer to /api/me arriving is itself a redraw, so whether
 * the token survived until the browser sent the form came down to timing. A wiped
 * token is refused with 403 and the player saw Spring's plain error page. It
 * failed roughly half the time, and the intermittency is what made it hard to
 * place. LIVING_DOC.md records it.
 *
 * Reading the token here means it is taken at the moment of sending, with nothing
 * in between that could replace it.
 *
 * WHY IT LEAVES THROUGH window.location
 *
 * Assigning to window.location performs a full browser navigation, which throws
 * the current page away rather than swapping part of it. That is the right
 * behaviour for signing out: nothing held in the old page can survive it. Going
 * through the router would leave the previous screen's state in memory.
 *
 * WHY A FAILED SIGN OUT STAYS PUT
 *
 * NOTE - Phase 2 Story 5. An earlier version of this file said that leaving for
 * the login screen anyway was the safer outcome, on the grounds that the worst
 * case was being asked to sign in again while a session survived on the server.
 * That was wrong, and it is worth writing down because it is a comfortable
 * mistake to make.
 *
 * Going to the login screen ends nothing. The session cookie is still in the
 * browser and the session is still alive on the server, so pressing back or
 * typing an address gets straight back in. All the navigation does is show a
 * screen saying "You have been signed out" to somebody who is not.
 *
 * That is exactly backwards for the situation sign out is for, which is walking
 * away from a computer that is not yours. So a sign out that did not succeed
 * says so and stays, and the button can be pressed again.
 *
 * WHY A FAILURE IS CHECKED RATHER THAN ASSUMED
 *
 * "It failed, so you are still signed in" is a guess, and it is wrong in one
 * common case. The request may have reached the server and ended the session,
 * with only the reply lost on the way back. Announcing "you are still signed in"
 * then is the same kind of lie as the one above, pointing the other way.
 *
 * So a failure is not reported until it has been checked. Asking /api/me settles
 * it, because that address answers one way when there is a session and another
 * way when there is not.
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

    /*
     * Finds out whether the session actually survived, and says the right thing.
     *
     * failureMessage - what to show if it did survive, describing why the sign
     *                  out did not get through.
     *
     * Returns nothing. It either leaves for the login screen or puts a message on
     * the screen.
     *
     * Raises nothing. If even this request cannot be answered, the session is
     * treated as still alive, because that is the assumption that cannot mislead
     * anyone into walking away from a computer they are still signed in on.
     *
     * fetchCurrentUser hands back null when there is no session, because /api/me
     * is answered with a bounce to the login screen. So null here means the sign
     * out did work and only the reply went missing.
     *
     * Worst case this adds a second wait of up to ten seconds on top of the first,
     * and only ever on a failure, which is a fair price for not guessing.
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

    /*
     * Ends the session and returns to the login screen.
     *
     * event - the form's submit event, whose default browser navigation is
     *         stopped so the request can be sent from here instead.
     *
     * Returns nothing. On success the page is gone by the time it finishes.
     *
     * Raises nothing. Every way this can fail ends with a message on the screen
     * and the person still signed in, which is what has actually happened in all
     * of them.
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
                    "X-XSRF-TOKEN": readCsrfToken(),
                },
            });

            if (response.ok) {
                window.location.href = "/login?logout";
                return;
            }

            /*
             * A refusal arrives as an ordinary answer rather than as an error, so
             * nothing is thrown and this is the only place it can be noticed. The
             * likely cause is a CSRF token the server would not accept, which is
             * what used to make sign out fail roughly half the time. Without this
             * branch the screen would announce a sign out that was refused.
             *
             * The refusal is still checked rather than trusted, because a
             * refusal to this request does not prove a session is there.
             */
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

    /*
     * A real form element rather than a bare button, so the browser gives this
     * its usual behaviour: Enter works, and assistive software announces it as an
     * action rather than a link.
     */
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
