/*
 * Setup that runs before every frontend test file. It adds the page matchers
 * and clears the rendered page between tests.
 * Named in vite.config.ts under test.setupFiles. Nothing imports it.
 */

// The "/vitest" suffix registers the matchers with Vitest and declares them to TypeScript.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// cleanup() clears the rendered page between tests.
afterEach(() => {
    cleanup();
});
