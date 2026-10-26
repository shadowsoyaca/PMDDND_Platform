/*
 * Tests for the request timeout. They pass their own short limit to
 * fetchWithTimeout instead of waiting the full ten seconds.
 */
import { describe, it, expect, vi } from "vitest";

import { fetchWithTimeout, isTimeout, RequestTimeout } from "@/lib/http";

/* A request that is never answered. The stand-in ignores the abort signal. */
function serveNothingEver() {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
}

describe("fetchWithTimeout", () => {
    it("gives up when the server accepts the request and never answers", async () => {
        serveNothingEver();

        await expect(fetchWithTimeout("/api/me", {}, 5)).rejects.toBeInstanceOf(
            RequestTimeout,
        );
    });

    it("leaves a request alone when it answers in time", async () => {
        const answer = new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer));

        expect(await fetchWithTimeout("/api/me", {}, 5000)).toBe(answer);
    });

    it("passes a request that fails on its own through unchanged", async () => {
        // An unreachable server, which must not come back as a timeout.
        const unreachable = new Error("network down");
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(unreachable));

        await expect(fetchWithTimeout("/api/me")).rejects.toBe(unreachable);
        expect(isTimeout(unreachable)).toBe(false);
    });

    it("keeps the method and headers it was given", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);

        await fetchWithTimeout("/api/admin/users/3", {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": "test-token" },
        });

        // The signal is added and nothing else is disturbed.
        const [address, request] = fetchMock.mock.calls[0];
        expect(address).toBe("/api/admin/users/3");
        expect(request.method).toBe("DELETE");
        expect(request.headers["X-XSRF-TOKEN"]).toBe("test-token");
        expect(request.signal).toBeDefined();
    });
});
