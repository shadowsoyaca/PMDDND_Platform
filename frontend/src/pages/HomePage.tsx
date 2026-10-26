/*
 * The landing address. Loads the signed-in account once and draws
 * OwnerHomePage or PlayerHomePage depending on the role.
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
    const [failure, setFailure] = useState("Could not load your account details.");

    /*
     * Asks the server who is signed in, once, when the screen first appears.
     * The cancelled flag stops state being set after the screen has gone.
     */
    useEffect(() => {
        let cancelled = false;

        fetchCurrentUser()
            .then((account) => {
                if (cancelled) {
                    return;
                }
                if (!account) {
                    // A full browser navigation, which discards the whole page.
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
