import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    // Run unit tests in a Node environment to avoid jsdom/parse5 ESM interop issues
    environmentMatchGlobs: [
      ['tests/unit/**', 'node'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.spec.ts'],
  },
})
