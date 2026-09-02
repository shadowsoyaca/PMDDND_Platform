/*
 * Phase 2 Story 5.5: tests for signing in.
 *
 * WHAT THESE PROVE
 *
 * That the four answers /api/login can give are turned into four different
 * results. That is the entire point of the story: before it, a wrong password and
 * an unreachable server arrived looking identical and the screen had to show one
 * message covering both.
 *
 * Each test answers with exactly what the server sends, built by the shared
 * helpers in test/responses.ts rather than by hand here, so a test cannot quietly
 * agree with itself about a shape the backend does not actually produce.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { signIn } from "@/lib/auth";
import { CSRF_MESSAGE, TIMEOUT_MESSAGE } from "@/lib/http";
import {
    badCredentialsResponse,
    csrfRefusedResponse,
    htmlResponse,
    jsonResponse,
} from "@/test/responses";

const ACCOUNT = { username: "owner", personName: "Matthew", role: "OWNER" };

describe("signIn", () => {
    beforeEach(() => {
        /*
         * The token is read out of this cookie and sent back in a header. jsdom
         * keeps a real cookie jar, so setting it here is enough.
         */
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("sends the credentials as JSON with the CSRF token, and hands back the account", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ACCOUNT));
        vi.stubGlobal("fetch", fetchMock);

        const result = await signIn("owner", "a-real-password");

        expect(result).toEqual({ kind: "ok", account: ACCOUNT });

        /*
         * Check what was actually sent, not merely that something was. The body
         * shape, the content type and the token header are all agreements with the
         * backend that nothing else in the frontend states. LoginRequest.java is
         * the other half of this.
         */
        const [address, request] = fetchMock.mock.calls[0];
        expect(address).toBe("/api/login");
        expect(request.method).toBe("POST");
        expect(request.headers["Content-Type"]).toBe("application/json");
        expect(request.headers["X-XSRF-TOKEN"]).toBe("test-token");
        expect(JSON.parse(request.body)).toEqual({
            username: "owner",
            password: "a-real-password",
        });
    });

    it("reports a refusal when the server answers 401, without inventing a message", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(badCredentialsResponse()));

        /*
         * No message comes back with this one on purpose. What to tell somebody
         * whose password was wrong is a decision for the screen, and this is the
         * only case where the wording is a choice rather than a description of a
         * fault.
         */
        expect(await signIn("owner", "the-wrong-one")).toEqual({ kind: "refused" });
    });

    it("tells the person to reload when the token was rejected, rather than calling it a bad password", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(csrfRefusedResponse()));

        /*
         * The distinction this whole file exists for. A rejected token clears on a
         * reload; a wrong password does not. Reporting one as the other sends the
         * person somewhere that cannot help them.
         */
        expect(await signIn("owner", "a-real-password")).toEqual({
            kind: "error",
            message: CSRF_MESSAGE,
        });
    });

    it("says the server could not be reached when the request never got an answer", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        expect(await signIn("owner", "a-real-password")).toEqual({
            kind: "error",
            message: "Could not reach the server. Please try again.",
        });
    });

    it("says the server took too long when the request timed out", async () => {
        /*
         * A fetch that never settles. fetchWithTimeout races it against its own
         * timer, so this is what a hung server looks like from here. Without the
         * timeout the screen would sit on "Signing in..." for minutes.
         */
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

        const result = await signIn("owner", "a-real-password");

        expect(result).toEqual({
            kind: "error",
            message: `${TIMEOUT_MESSAGE} Please try again.`,
        });
    }, 20_000);

    it("refuses to treat an HTML answer as a successful sign-in, even with a status of 200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));

        /*
         * This should be unreachable, because SecurityConfig lets logged-out
         * visitors reach /api/login and so there is nothing to bounce them to.
         */
        const result = await signIn("owner", "a-real-password");

        expect(result.kind).toBe("error");
    });
});
