import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.{ts,tsx}'],
    exclude: ['tests/messages-futuristic.spec.ts', 'e2e/**', 'tests/e2e/**'],
  },
});
