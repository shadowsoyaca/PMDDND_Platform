import path from "path"
// defineConfig comes from "vitest/config", which accepts the "test" block below.
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

  // The test runner's settings.
  test: {
    // Runs the tests in a jsdom browser stand-in.
    environment: 'jsdom',

    // Runs before every test file.
    setupFiles: './src/test/setup.ts',

    // Puts back every global a test replaced, after that test finishes.
    unstubGlobals: true,

    // There is deliberately no "include" setting. Vitest finds every *.test.ts
    // and *.test.tsx file on its own.
  },
})
