/*
 * The login screen. The only screen a logged-out visitor can reach, holding the
 * form that signs somebody in.
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

import { signIn } from "@/lib/auth";

// The wording shown when the server refuses the credentials. This is the only copy of it.
const REFUSED_MESSAGE =
    "That username and password did not match. Please try again.";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Signing out sends the browser back here with ?logout.
    const loggedOut = searchParams.has("logout");

    async function handleSubmit(event: FormEvent) {
        // Stops the browser navigating to submit the form itself.
        event.preventDefault();
        setError("");
        setSubmitting(true);

        // signIn never throws. Every failure comes back as a result with its message.
        const result = await signIn(username, password);

        if (result.kind === "ok") {
            navigate("/");
            return;
        }

        // A refused sign-in carries no message of its own. Every other failure does.
        setError(result.kind === "refused" ? REFUSED_MESSAGE : result.message);
        setSubmitting(false);
    }

    return (
        <div
            className="relative min-h-screen w-full overflow-hidden bg-cover bg-bottom bg-no-repeat"
            style={{ backgroundImage: `url(${backdrop})` }}
        >
            {/* One column: the title at the top, the panel in the middle, the badge at the bottom. */}
            <div className="relative flex min-h-screen flex-col items-center justify-between py-[4vh]">

                <img
                    src={title}
                    alt="Pokemon Mystery Dungeon"
                    className="w-[32.3vw] max-w-[820px] min-w-[280px] drop-shadow-lg"
                />

                {/* The login panel. */}
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

                    {/* A real form element, so Enter submits and password managers recognise the fields. */}
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

                {/* The badge is decoration. Its empty alt is deliberate. */}
                <img
                    src={badge}
                    alt=""
                    className="w-[12.5vw] max-w-[300px] min-w-[120px] drop-shadow-lg"
                />
            </div>
        </div>
    );
}