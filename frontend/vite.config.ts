import path from "path"
// NOTE: Phase 2 Story 4.7 - imported from "vitest/config", not from "vite".
// It is the same defineConfig with the "test" block below added to what it
// accepts. Importing from "vite" leaves that block unrecognised and the build
// fails on it, which is a confusing error if you do not know to look here.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // NOTE: Phase 2 Story 4.7 - the test runner's settings.
  //
  // They live in this file rather than in a vitest.config.ts of their own so
  // that tests are built by the same plugins and the same "@" alias as the real
  // application. Two config files would be two places to keep in step, and a
  // test passing against a differently built version of a screen is worse than
  // no test at all.
  test: {
    // A fake browser, built in JavaScript. Both screens read document.cookie
    // and one of them assigns to window.location, and neither exists in plain
    // Node. happy-dom is the faster alternative and was not chosen: it is less
    // complete, and cookie and location behaviour is exactly where that shows.
    environment: 'jsdom',

    // Run before every test file. See src/test/setup.ts for what it does and
    // why it cannot be skipped.
    setupFiles: './src/test/setup.ts',

    // Put back anything a test replaced on the global object, after that test
    // finishes. The screens call fetch and read window.location, so the tests
    // replace both. Without this, a fake left behind by one test quietly serves
    // the next one, and the symptom is a test that passes on its own and fails
    // when the file is run in full, or worse, the other way round.
    unstubGlobals: true,

    // There is deliberately no "include" setting. Vitest already picks up any
    // file named *.test.ts or *.test.tsx anywhere in the project, so adding a
    // test file makes it run without anyone editing this file or remembering it
    // exists. Listing paths here would quietly turn a forgotten entry into a
    // test that never runs and never complains.
  },
})
