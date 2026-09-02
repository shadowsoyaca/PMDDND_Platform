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
 * NOTE - Phase 2 Story 5.5: everything this screen used to do in order to sign
 * somebody in now lives in lib/auth.ts, and the two Story 5 notes that stood here
 * went with it.
 *
 * This screen used to send the request itself and then ask /api/me whether a
 * session had appeared, because form login answered with a redirect that said
 * nothing either way. /api/login answers with the account, so the second request
 * is gone and so is the guessing. What is left here is the form and the wording.
 */
import { signIn } from "@/lib/auth";

/*
 * What somebody is told when the server would not accept their credentials.
 *
 * Deliberately vague, and that is not laziness. Wrong username, wrong password and
 * a disabled account all say this, because saying which one it was would tell
 * whoever is asking which usernames exist on this server. The improvement this
 * story brings is telling a refused sign-in apart from a failed request, not
 * narrowing down why it was refused.
 *
 * It is a constant rather than written inline because lib/auth.ts deliberately
 * returns no message for this case, which makes this the only place the wording
 * lives.
 */
const REFUSED_MESSAGE =
    "That username and password did not match. Please try again.";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    /*
     * Signing out still sends the browser back here with ?logout, through a real
     * redirect rather than through a fetch, so this stays.
     *
     * NOTE - Phase 2 Story 5.5: ?error is gone. It came from form login's
     * failureUrl setting, and form login has been deleted, so nothing sends the
     * browser to /login?error any more. The branch that read it was dead code that
     * still looked live, which on a login screen is worse than useless: somebody
     * would keep maintaining it.
     */
    const loggedOut = searchParams.has("logout");

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        /*
         * NOTE - Phase 2 Story 5.5: one request, and it says which of three things
         * happened.
         *
         * This used to be two. The first sent the credentials and came back with a
         * redirect that meant nothing, and the second asked /api/me whether a
         * session had appeared, which was the only way to find out. A wrong
         * password and an unreachable server were indistinguishable, so one vague
         * message had to cover both.
         *
         * There is no try block because signIn never throws. Every way it can fail
         * comes back as a result with a message already chosen, which is the whole
         * reason that logic sits in lib/auth.ts rather than here.
         */
        const result = await signIn(username, password);

        if (result.kind === "ok") {
            /*
             * The answer names the account, and this screen deliberately ignores
             * it. Both roles are sent to the same address, and the screen at that
             * address decides what to draw, so this one never has to know who
             * signed in.
             */
            navigate("/");
            return;
        }

        /*
         * "refused" carries no message on purpose, because what to tell somebody
         * whose credentials were rejected is a decision rather than a description
         * of a fault. Every other failure arrives with its own wording: a rejected
         * token names the reload that fixes it, a timeout says the server is slow,
         * and an unreachable server says it could not be reached.
         */
        setError(result.kind === "refused" ? REFUSED_MESSAGE : result.message);
        setSubmitting(false);
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

                    {error && (
                        <p
                            role="alert"
                            className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-900"
                        >
                            {error}
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