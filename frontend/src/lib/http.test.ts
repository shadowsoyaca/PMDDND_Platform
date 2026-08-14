/*
 * Phase 2 Story 5: tests for the request timeout.
 *
 * WHAT IS BEING GUARDED
 *
 * fetch has no timeout of its own. Without one, a server that accepts the
 * connection and then never answers leaves a screen showing Loading, with no
 * error and nothing to press, for as long as anyone is willing to sit there.
 *
 * That is a different fault from a server that cannot be reached, which fails at
 * once and was always handled. This is the one that looks like the page is
 * broken rather than the server.
 *
 * WHY THE TESTS PASS THEIR OWN TIME LIMIT
 *
 * The real limit is ten seconds. A test suite that waited that long to prove one
 * thing would be a test suite people stop running, so these pass a few
 * milliseconds instead. That is the only reason fetchWithTimeout takes the limit
 * as an argument at all.
 *
 * THE SECOND TEST MATTERS AS MUCH AS THE FIRST
 *
 * A timeout that fires on a request that was going to answer is worse than
 * having none, because it turns working requests into errors and invites a
 * retry that makes a loaded server worse. So there is a test for giving up and a
 * test for not giving up.
 */
import { describe, it, expect, vi } from "vitest";

import { fetchWithTimeout, isTimeout, RequestTimeout } from "@/lib/http";

/*
 * A request that is never answered.
 *
 * Returns a promise that stays pending forever, which is exactly what a hung
 * server produces. It deliberately ignores the abort signal, because a stand-in
 * written in a test is under no obligation to honour one, and fetchWithTimeout
 * has to settle either way.
 */
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
        /*
         * An unreachable server. It must not come back as a timeout, or the
         * screens would tell someone the server is slow when it is not there.
         */
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

        /*
         * The signal is added, and nothing else is disturbed. A wrapper that
         * quietly dropped the CSRF header would have every change refused with a
         * 403, and the screens would report it as a permission problem.
         */
        const [address, request] = fetchMock.mock.calls[0];
        expect(address).toBe("/api/admin/users/3");
        expect(request.method).toBe("DELETE");
        expect(request.headers["X-XSRF-TOKEN"]).toBe("test-token");
        expect(request.signal).toBeDefined();
    });
});
