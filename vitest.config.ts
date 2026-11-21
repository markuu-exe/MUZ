import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['TASKS/**', 'node_modules/**', 'dist/**'],
    // Lets the worker answer Vitest's RPC between long synchronous DSP tests (see the file).
    setupFiles: ['src/test/yieldBetweenTests.ts'],
  },
});
