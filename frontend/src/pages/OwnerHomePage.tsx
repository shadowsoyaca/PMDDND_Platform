/*
 * Where the owner lands after signing in. Shows the account details, the link
 * to the account table and the sign out button.
 */
import { Link } from "react-router-dom";

import AccountDetails from "@/components/AccountDetails";
import SignOutButton from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/currentUser";

/**
 * Draws the owner's landing screen.
 *
 * @param user (CurrentUser) the signed-in account, already loaded by HomePage.
 */
export default function OwnerHomePage({ user }: { user: CurrentUser }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
            <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-800">
                    Signed in
                </h1>

                <AccountDetails user={user} />

                <div className="space-y-3">
                    {/* asChild makes the Button render the Link as a real anchor. */}
                    <Button asChild className="w-full">
                        <Link to="/accounts">Manage accounts</Link>
                    </Button>

                    <SignOutButton />
                </div>
            </div>
        </div>
    );
}
