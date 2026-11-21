/**
 * Vitest setup (vitest.config.ts `setupFiles`).
 *
 * The test worker answers Vitest's RPC (e.g. "onTaskUpdate") through a message port,
 * whose replies arrive as macrotasks. Back-to-back synchronous tests only yield
 * microtasks between them, so a file of long DSP tests (synthetic piano through
 * ChromaFrameProcessor + pitchy) could keep the worker from reading those replies for
 * longer than Vitest's 60 s RPC timeout: "[vitest-worker]: Timeout calling onTaskUpdate",
 * an unhandled error that fails the run even though every test passed.
 * Yielding one macrotask after each test lets the replies through. No test logic changes.
 */
import { afterEach } from 'vitest';

afterEach(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
