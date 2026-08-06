/*
 * Phase 2 Story 4: a placeholder for whatever a player sees after signing in.
 *
 * WHAT THIS IS FOR
 *
 * Story 4 needs somewhere to land after a successful sign-in, and it needs a
 * logout button. There is nothing else to show yet: no roster, no character
 * sheet, no dungeon. So this screen does the two things the story asks for and
 * nothing more.
 *
 * It also earns its place as a check. Seeing the right name and role here means
 * the session really was started, rather than the screen merely having navigated
 * away from the login page.
 *
 * WHAT REPLACES IT
 *
 * Landing by role. The account's role is already shown below, and the backend
 * has carried OWNER and PLAYER since Phase 2 Story 3, so branching to different
 * home pages needs no new groundwork - only somewhere for each role to land.
 * That becomes its own story once those screens exist.
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";

type CurrentUser = {
    username: string;
    personName: string;
    role: string;
};

/*
 * Reads the CSRF token out of the cookie Spring set.
 *
 * Deliberately a plain function rather than a stored value, so that every caller
 * gets the token as it is at the moment of asking. Spring issues a fresh token
 * when a session starts, so a value captured earlier can already be out of date.
 */
function readCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}

export default function HomePage() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);


    /*
     * Ask the server who is signed in.
     *
     * NOTE - the check below looks at the content type, not only the status.
     *
     * A logged-out request is answered with a redirect to the login screen, but
     * fetch follows redirects on its own and does not report that it happened.
     * What arrives here is the login page's HTML, with status 200. So the status
     * cannot tell a real answer apart from a bounce, and asking whether the body
     * is JSON is what actually distinguishes them.
     *
     * On a bounce this leaves through window.location rather than through the
     * router. A full browser navigation throws the current page away instead of
     * swapping part of it, which is the right behaviour for "you are not signed
     * in": nothing from the previous state can survive it.
     */
    useEffect(() => {
        let cancelled = false;

        fetch("/api/me")
            .then((response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");

                if (!response.ok || !isJson) {
                    window.location.href = "/login";
                    return null;
                }
                return response.json();
            })
            .then((data) => {
                if (!cancelled && data) {
                    setUser(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

/*
     * NOTE - sent directly rather than through a plain form submission.
     *
     * The token used to live in a hidden field, written in as the form was
     * submitted. That was unreliable: React owns that field, and any redraw
     * resets it to empty. The answer to /api/me arriving is itself a redraw, so
     * whether the token survived until the browser sent the form came down to
     * timing, and a wiped token is refused with 403.
     *
     * Reading it here means it is taken at the moment of sending, with nothing
     * in between that could replace it.
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

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
            <div className="w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-800">
                    Signed in
                </h1>

                {loading && <p className="text-slate-600">Loading...</p>}

                {!loading && !user && (
                    <p role="alert" className="text-red-800">
                        Could not load your account details.
                    </p>
                )}

                {user && (
                    <dl className="mb-8 space-y-3">
                        <div>
                            <dt className="text-sm text-slate-500">Username</dt>
                            <dd className="text-slate-900">{user.username}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Name</dt>
                            <dd className="text-slate-900">{user.personName}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-slate-500">Role</dt>
                            <dd className="text-slate-900">{user.role}</dd>
                        </div>
                    </dl>
                )}

                <form onSubmit={handleSignOut}>
                    <Button type="submit" className="w-full">
                        Sign out
                    </Button>
                </form>
            </div>
        </div>
    );
}