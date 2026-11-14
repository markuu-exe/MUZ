import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['TASKS/**', 'node_modules/**', 'dist/**'],
  },
});
