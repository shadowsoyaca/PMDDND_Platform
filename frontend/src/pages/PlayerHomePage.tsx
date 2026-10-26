/*
 * Where a player lands after signing in. Shows the account details and the
 * sign out button, with no link to account management.
 */
import AccountDetails from "@/components/AccountDetails";
import SignOutButton from "@/components/SignOutButton";
import type { CurrentUser } from "@/lib/currentUser";

/**
 * Draws the player's landing screen.
 *
 * @param user (CurrentUser) the signed-in account, already loaded by HomePage.
 */
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
