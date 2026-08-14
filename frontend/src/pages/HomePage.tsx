/*
 * Phase 2 Story 4: a placeholder for whatever a player sees after signing in.
 *
 * NOTE - Phase 2 Story 5: this is no longer a screen. It is the piece that loads
 * the account and decides which screen to draw, OwnerHomePage or PlayerHomePage.
 * Everything it used to show has moved into those two files and the two small
 * components they share.
 *
 * WHY THE SPLIT IS DONE HERE RATHER THAN AT THE ADDRESS
 *
 * The alternative was two addresses, with the login screen or a redirect sending
 * each role to its own. That was rejected for this story. It needs the role to be
 * known before anyone can be sent anywhere, so it means signing in, landing, and
 * then being moved again, which shows as a flicker and puts a second address in
 * the browser's history that nobody chose to visit. One address that draws the
 * right thing avoids all of it, and splitting the addresses later changes only
 * this file.
 *
 * WHY THE LOADING IS HERE AND NOT IN EACH SCREEN
 *
 * Neither landing screen can be drawn until the role is known, so the request has
 * to finish first whichever screen wins. Doing it once here means the two screens
 * receive an account that is already there and have no loading state, no error
 * state, and no request of their own to get wrong.
 *
 * WHAT THE ROLE IS AND IS NOT
 *
 * It decides what is drawn and nothing else. Anything the browser is told can be
 * edited by whoever holds it, so a player who changes this value in their browser
 * sees the owner's screen and its link, and is then refused by the server the
 * moment the screen asks for any account data.
 */
import { useEffect, useState } from "react";

import OwnerHomePage from "@/pages/OwnerHomePage";
import PlayerHomePage from "@/pages/PlayerHomePage";
import { fetchCurrentUser, OWNER_ROLE } from "@/lib/currentUser";
import type { CurrentUser } from "@/lib/currentUser";
import { isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";

export default function HomePage() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    /*
     * NOTE - Phase 2 Story 5: what to say when it did not work. Held as text
     * rather than fixed in the markup, so a request that ran out of time can say
     * so instead of being described as a server that could not be reached.
     */
    const [failure, setFailure] = useState("Could not load your account details.");

    /*
     * Ask the server who is signed in, once, when the screen first appears.
     *
     * Three outcomes, and they are deliberately not the same:
     *
     *   an account   - draw the matching screen.
     *   no session   - leave for the login screen, through window.location rather
     *                  than the router, so the whole page is thrown away.
     *   no answer    - stay put and say so. Leaving would hide a server problem
     *                  behind a login prompt, and the player would try their
     *                  password, fail, and report the wrong fault.
     *
     * The cancelled flag guards against the answer arriving after the screen has
     * gone. Setting state on a screen that is no longer there does nothing useful
     * and React warns about it.
     */
    useEffect(() => {
        let cancelled = false;

        fetchCurrentUser()
            .then((account) => {
                if (cancelled) {
                    return;
                }
                if (!account) {
                    window.location.href = "/login";
                    return;
                }
                setUser(account);
                setLoading(false);
            })
            .catch((problem) => {
                if (!cancelled) {
                    if (isTimeout(problem)) {
                        setFailure(TIMEOUT_MESSAGE);
                    }
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
                <p className="text-slate-600">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
                <p role="alert" className="text-red-800">
                    {failure}
                </p>
            </div>
        );
    }

    return user.role === OWNER_ROLE ? (
        <OwnerHomePage user={user} />
    ) : (
        <PlayerHomePage user={user} />
    );
}
