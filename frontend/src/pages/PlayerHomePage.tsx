/*
 * Phase 2 Story 5: where a player lands after signing in.
 *
 * WHAT THIS IS FOR
 *
 * The card asks that a player is not shown a door they cannot open. This screen
 * is that: the same account details and the same way out, and no mention of
 * account management.
 *
 * WHY IT IS ALMOST EMPTY
 *
 * There is genuinely nothing else to put on it yet. No roster, no character
 * sheet, no dungeon. Filling it with placeholders for things that do not exist
 * would make it harder to tell, later, which parts are real.
 *
 * WHY IT IS A SEPARATE FILE FROM THE OWNER'S
 *
 * The two screens are nearly identical today and will not stay that way. A player
 * gets the game, and the owner gets the tools. Keeping them apart from the start
 * means neither grows a pile of conditions asking who is looking at it.
 */
import AccountDetails from "@/components/AccountDetails";
import SignOutButton from "@/components/SignOutButton";
import type { CurrentUser } from "@/lib/currentUser";

/* user - the signed-in account, already loaded by HomePage. */
export default function PlayerHomePage({ user }: { user: CurrentUser }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
            <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-800">
                    Signed in
                </h1>

                <AccountDetails user={user} />

                <SignOutButton />
            </div>
        </div>
    );
}
