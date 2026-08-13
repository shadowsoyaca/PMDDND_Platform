/*
 * Phase 2 Story 5: where the owner lands after signing in.
 *
 * WHAT THIS IS FOR
 *
 * The owner needs somewhere to reach the account table from. Before this story
 * both roles landed on the same placeholder screen and the only way to create a
 * player was to call /api/admin/users by hand, which is why there is still only
 * one account on the server.
 *
 * WHY THE LINK IS A LINK AND NOT A BUTTON THAT NAVIGATES
 *
 * Button carries asChild, which makes it hand its appearance to whatever is
 * inside rather than drawing a button of its own. So this is a real anchor that
 * looks like a button. That matters: an anchor can be right-clicked, opened in a
 * new tab, and is announced as somewhere to go rather than something to do. A
 * button wired to navigate looks identical and does none of it.
 *
 * WHAT IS NOT HERE
 *
 * Nothing about the game. That is not this story, and the owner is also a player
 * in practice, so anything a player gets will end up on both screens rather than
 * only on this one.
 *
 * WHY THIS DOES NOT PROTECT ANYTHING
 *
 * Hiding the link from a player is appearance, not security. A player who types
 * the address in still reaches the screen, and the account data is refused there
 * by the server rule on /api/admin/. That rule is what actually protects the
 * accounts. This only avoids showing someone a door they cannot open.
 */
import { Link } from "react-router-dom";

import AccountDetails from "@/components/AccountDetails";
import SignOutButton from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/currentUser";

/* user - the signed-in account, already loaded by HomePage. */
export default function OwnerHomePage({ user }: { user: CurrentUser }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
            <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-800">
                    Signed in
                </h1>

                <AccountDetails user={user} />

                <div className="space-y-3">
                    <Button asChild className="w-full">
                        <Link to="/accounts">Manage accounts</Link>
                    </Button>

                    <SignOutButton />
                </div>
            </div>
        </div>
    );
}
