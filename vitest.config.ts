import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.{ts,tsx}'],
    exclude: ['tests/messages-futuristic.spec.ts', 'e2e/**', 'tests/e2e/**'],
    // For jsdom-based tests, use `// @vitest-environment jsdom` directive in the file
  },
});
