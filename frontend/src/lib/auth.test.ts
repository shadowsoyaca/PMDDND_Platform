/*
 * Tests for signIn: each answer /api/login can give becomes the matching result.
 * The fake answers come from the shared helpers in test/responses.ts.
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
        // The token is read out of this cookie and sent back in a header.
        document.cookie = "XSRF-TOKEN=test-token";
    });

    it("sends the credentials as JSON with the CSRF token, and hands back the account", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ACCOUNT));
        vi.stubGlobal("fetch", fetchMock);

        const result = await signIn("owner", "a-real-password");

        expect(result).toEqual({ kind: "ok", account: ACCOUNT });

        // Checks what was sent: address, method, content type, token header and body.
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

        expect(await signIn("owner", "the-wrong-one")).toEqual({ kind: "refused" });
    });

    it("tells the person to reload when the token was rejected, rather than calling it a bad password", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(csrfRefusedResponse()));

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
        // A fetch that never settles. The test timeout below is above REQUEST_TIMEOUT_MS.
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

        const result = await signIn("owner", "a-real-password");

        expect(result).toEqual({
            kind: "error",
            message: `${TIMEOUT_MESSAGE} Please try again.`,
        });
    }, 20_000);

    it("refuses to treat an HTML answer as a successful sign-in, even with a status of 200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse()));

        const result = await signIn("owner", "a-real-password");

        expect(result.kind).toBe("error");
    });
});
