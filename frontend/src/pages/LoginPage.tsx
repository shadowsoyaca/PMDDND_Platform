/*
 * Phase 2 Story 4: the login screen.
 *
 * This is the only screen a logged-out visitor can reach. SecurityConfig sends
 * every other address here, and WebConfig forwards /login to index.html so this
 * screen can be reached by typing the address or reloading the page.
 *
 * LAYOUT
 *
 * Four layers, stacked bottom to top: the backdrop, the title, the login panel,
 * and the badge. Each is positioned against the screen rather than baked into
 * one image, so the composition holds together at any window shape and any one
 * piece can be replaced on its own.
 *
 * Sizes are given as a percentage of the viewport WIDTH (the vw unit), not of
 * the height and not in fixed pixels. Percentage of width means the title and
 * badge keep the same proportion to each other and to the artwork on a laptop,
 * a large monitor, and everything between. Fixed pixels would look correct on
 * one screen only.
 *
 * The numbers below came from mocking the composition up and comparing sizes
 * side by side:
 *   title  32.3vw   (620px measured on a 1920-wide screen)
 *   badge  12.5vw   (240px on the same screen)
 *
 * ASSETS
 *
 * All three images are imported rather than written as a path in the markup.
 * Vite then fingerprints them into /assets/ with a content hash in the
 * filename, which does three useful things: the browser can cache them forever
 * and still pick up a change instantly, SecurityConfig already permits that one
 * path so no new rule is needed, and a mistyped name fails the build instead of
 * appearing as a broken image in front of a player.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import backdrop from "@/assets/login_backdrop.png";
import title from "@/assets/title.png";
import badge from "@/assets/badge.png";

/*
 * NOTE - Phase 2 Story 5: readCsrfToken used to be written out here and again in
 * HomePage. Story 5 needs it in two further places, so it moved to lib/csrf.ts
 * before a third copy was made. The explanation of what the token is for went
 * with it.
 *
 * NOTE - Phase 2 Story 5: fetchCurrentUser replaces the hand-written check
 * further down, which asked /api/me whether the sign-in had worked and read the
 * content type to be sure the answer was real. That reasoning now lives in
 * lib/currentUser.ts, next to the one copy of the code.
 */
import { readCsrfToken } from "@/lib/csrf";
import { fetchCurrentUser } from "@/lib/currentUser";
import { fetchWithTimeout, isTimeout, TIMEOUT_MESSAGE } from "@/lib/http";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    /*
     * SecurityConfig sends the browser back here with ?error after a rejected
     * login and ?logout after signing out. Reading them here means those two
     * cases still show a message even when the round trip went through the
     * browser rather than through the fetch below.
     */
    const loggedOut = searchParams.has("logout");
    const redirectError = searchParams.has("error");

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            /*
             * The address is relative, with no host in front of it. That is what
             * lets the switch from a bare IP address to a real domain happen
             * with no code change: the browser sends this to whatever host it
             * loaded the page from.
             *
             * The body is form-encoded rather than JSON because Spring's built-in
             * form login reads two named fields, exactly as its own plain login
             * page sent them.
             *
             * The browser is left to follow the redirect that comes back. That
             * is what lets it store the session cookie: a response the browser
             * has been told not to process is one it cannot take a cookie from.
             */
            const body = new URLSearchParams();
            body.set("username", username);
            body.set("password", password);

            await fetchWithTimeout("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-XSRF-TOKEN": readCsrfToken(),
                },
                body,
            });

            /*
             * Form login answers with a redirect whether the sign-in worked or
             * not, so the first request cannot report which happened. What can
             * is asking the server who we are now. An account back means there
             * is a session; null means there is not, and the password was wrong.
             *
             * DEFERRED to Phase 2 Story 5.5: an endpoint that answers with data
             * instead of a redirect. That would make this second request
             * unnecessary and, more importantly, would let this screen tell a
             * wrong password apart from a server that cannot be reached. Until
             * then the message below has to cover both.
             *
             * NOTE - Phase 2 Story 5: the answer is not read for the role here.
             * Both roles are sent to the same address and that screen decides
             * what to draw, so this screen never has to know who signed in.
             */
            const account = await fetchCurrentUser();

            if (account) {
                navigate("/");
                return;
            }

            setError("That username and password did not match. Please try again.");
        } catch (failure) {
            /*
             * NOTE - Phase 2 Story 5: a request that ran out of time is now told
             * apart from one that never connected. They are different faults and
             * they lead to different next steps: one means the server is not
             * there, the other means it is there and struggling, and trying again
             * shortly is reasonable.
             */
            setError(
                isTimeout(failure)
                    ? `${TIMEOUT_MESSAGE} Please try again.`
                    : "Could not reach the server. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="relative min-h-screen w-full overflow-hidden bg-cover bg-bottom bg-no-repeat"
            style={{ backgroundImage: `url(${backdrop})` }}
        >
            {/*
             * One column holding the three visible pieces. justify-between
             * pushes the title to the top and the badge to the bottom, leaving
             * the panel in the middle, which is the arrangement the mockups
             * settled on. The padding keeps all three clear of the screen edges
             * on a short window.
             */}
            <div className="relative flex min-h-screen flex-col items-center justify-between py-[4vh]">

                <img
                    src={title}
                    alt="Pokemon Mystery Dungeon"
                    className="w-[32.3vw] max-w-[820px] min-w-[280px] drop-shadow-lg"
                />

                {/*
                 * The login panel. Not a shadcn Card: a Card brings its own
                 * background and border, which would have to be undone to get
                 * the translucent look that lets the sky through. The classes
                 * here do the same job with less to fight.
                 */}
                <div className="w-[min(90vw,26rem)] rounded-2xl border-2 border-white/60 bg-white/85 p-8 shadow-xl backdrop-blur-sm">
                    <h1 className="mb-6 text-center text-2xl font-bold text-slate-800">
                        Sign in
                    </h1>

                    {loggedOut && (
                        <p className="mb-4 rounded-lg bg-sky-100 px-4 py-3 text-sm text-sky-900">
                            You have been signed out.
                        </p>
                    )}

                    {(error || redirectError) && (
                        <p
                            role="alert"
                            className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                        >
                            {error ||
                                "That username and password did not match. Please try again."}
                        </p>
                    )}

                    {/*
                     * A real form element, so the browser gives this its usual
                     * behaviour for free: Enter submits, password managers
                     * recognise the fields, and screen readers announce it as a
                     * form. handleSubmit stops the browser's own navigation and
                     * sends the request itself.
                     */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-slate-700">
                                Username
                            </Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-700">
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full"
                        >
                            {submitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                </div>

                {/*
                 * The badge is decoration, so its alt text is empty on purpose.
                 * An empty alt tells a screen reader to skip the image rather
                 * than read out a description of something that carries no
                 * information.
                 */}
                <img
                    src={badge}
                    alt=""
                    className="w-[12.5vw] max-w-[300px] min-w-[120px] drop-shadow-lg"
                />
            </div>
        </div>
    );
}