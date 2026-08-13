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
 */
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { readCsrfToken } from "@/lib/csrf";

export default function SignOutButton() {
    /*
     * Ends the session and returns to the login screen.
     *
     * event - the form's submit event, whose default browser navigation is
     *         stopped so the request can be sent from here instead.
     *
     * Returns nothing. The page is gone by the time it finishes.
     *
     * Raises nothing. If the request fails the browser still leaves for the login
     * screen, which is the safer of the two outcomes: the worst case is being
     * asked to sign in again while the old session is still alive on the server,
     * rather than being left sitting on a screen that looks signed in.
     */
    async function handleSignOut(event: FormEvent) {
        event.preventDefault();

        await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-XSRF-TOKEN": readCsrfToken(),
            },
        });

        window.location.href = "/login?logout";
    }

    /*
     * A real form element rather than a bare button, so the browser gives this
     * its usual behaviour: Enter works, and assistive software announces it as an
     * action rather than a link.
     */
    return (
        <form onSubmit={handleSignOut}>
            <Button type="submit" variant="outline" className="w-full">
                Sign out
            </Button>
        </form>
    );
}
