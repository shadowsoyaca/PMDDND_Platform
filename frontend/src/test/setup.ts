/*
 * Phase 2 Story 4.7: setup that runs before every frontend test file.
 *
 * Named in vite.config.ts under test.setupFiles. Nothing imports it directly.
 * Vitest loads it once per test file, before any test in that file runs.
 *
 * It does two jobs.
 */

/*
 * JOB ONE: add the extra matchers.
 *
 * Vitest's own expect knows about values: equal, greater than, contains. It
 * knows nothing about a web page. These matchers add the page-shaped ones, such
 * as toBeInTheDocument and toBeDisabled, which say what a test means far more
 * clearly than checking a property by hand.
 *
 * The "/vitest" on the end of the import matters. The plain
 * "@testing-library/jest-dom" entry point registers the matchers with Jest,
 * which is a different test runner and is not installed here. This entry point
 * registers them with Vitest and also tells TypeScript about them, so
 * toBeInTheDocument is both available at run time and known to the compiler.
 */
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/*
 * JOB TWO: throw away the rendered page after each test.
 *
 * React Testing Library renders into a real element attached to the document,
 * and that element is not removed on its own. Without this, the second test in
 * a file renders a second copy of the screen alongside the first, and any query
 * that expects to find one match finds two and fails. The failure blames the
 * second test, when the cause is the first one never having been cleared.
 *
 * NOTE - React Testing Library can do this by itself, but only when the test
 * runner's afterEach is a global. This project imports test functions by name
 * instead of making them global, which is the clearer arrangement to read but
 * means the automatic version never switches itself on. It fails silently: no
 * warning, no error, just tests that pass alone and fail together. Calling
 * cleanup here is what replaces it.
 */
afterEach(() => {
    cleanup();
});
