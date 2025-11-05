import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Use Node environment by default; backend tests don't require a DOM.
    // This also avoids jsdom/parse5 ESM interop issues in CI.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.spec.ts'],
    // Increase timeouts slightly for occasional cold starts when RUN_INT_TESTS is enabled locally
    hookTimeout: 30000,
    testTimeout: 30000,
  },
})
