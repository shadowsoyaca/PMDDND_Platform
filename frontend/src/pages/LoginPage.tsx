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
 * Reads the CSRF token out of the cookie Spring set.
 *
 * SecurityConfig uses the cookie-based token repository, which writes the token
 * to a cookie named XSRF-TOKEN that JavaScript is allowed to read. Spring then
 * expects the same value back in the X-XSRF-TOKEN header on any request that
 * changes something. A hostile site can make your browser send a request here,
 * but it cannot read this site's cookies, so it cannot supply a matching token.
 *
 * Returns an empty string if the cookie is missing, which lets the request go
 * out and be rejected by the server rather than failing silently in the browser.
 */
function readCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}

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

            await fetch("/login", {
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
             * is asking the server who we are now.
             *
             * NOTE - the check below looks at the content type, not only the
             * status. When there is no session, /api/me answers with a redirect
             * to the login screen, and fetch quietly follows it: what arrives
             * here is the login page's HTML with status 200. A status check
             * alone would read that as success and wave a failed login through.
             * Asking whether the body is JSON is what actually distinguishes the
             * two.
             *
             * DEFERRED to Phase 2 Story 5.5: an endpoint that answers with data
             * instead of a redirect. That would make this second request
             * unnecessary and, more importantly, would let this screen tell a
             * wrong password apart from a server that cannot be reached. Until
             * then the message below has to cover both.
             */
            const check = await fetch("/api/me");
            const isJson = check.headers
                .get("content-type")
                ?.includes("application/json");

            if (check.ok && isJson) {
                navigate("/");
                return;
            }

            setError("That username and password did not match. Please try again.");
        } catch {
            setError("Could not reach the server. Please try again.");
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