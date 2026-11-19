import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-bundle-size.mjs');

const tempDirs: string[] = [];

function makeDist(files: Record<string, number>): string {
  const dist = mkdtempSync(join(tmpdir(), 'muz-bundle-'));
  tempDirs.push(dist);
  mkdirSync(join(dist, 'assets'));
  for (const [name, bytes] of Object.entries(files)) {
    writeFileSync(join(dist, 'assets', name), Buffer.alloc(bytes));
  }
  return dist;
}

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('check-bundle-size.mjs (T-05)', () => {
  it('passes and prints the MB total when the bundle is under the limit', () => {
    const dist = makeDist({
      'index-abc123.js': 1024 * 1024,
      'index-def456.css': 512 * 1024,
      // Not part of the initial bundle: lazy chunks and other assets are ignored.
      'posture.worker-xyz.js': 9 * 1024 * 1024,
      'logo.png': 9 * 1024 * 1024,
    });
    const result = run(dist, String(5 * 1024 * 1024));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1.50 MB');
    expect(result.stdout).toContain('index-abc123.js');
    expect(result.stdout).toContain('index-def456.css');
    expect(result.stdout).not.toContain('posture.worker-xyz.js');
  });

  it('fails when the bundle is over the limit', () => {
    const dist = makeDist({ 'index-abc123.js': 2048, 'index-def456.css': 2048 });
    const result = run(dist, '4000');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('index-abc123.js');
    expect(result.stderr).toMatch(/exceeds the limit/);
  });

  it('fails when no bundle files exist, so a missing build cannot pass', () => {
    const dist = makeDist({ 'other-chunk.js': 10 });
    const result = run(dist, String(5 * 1024 * 1024));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/no bundle files/i);
  });

  it('fails when the dist directory does not exist', () => {
    const result = run(join(tmpdir(), 'muz-no-such-dist-dir'), '100');
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/no bundle files/i);
  });
});
