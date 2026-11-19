// T-05: initial-bundle size gate for CI.
//
// Sums dist/assets/index-*.js and dist/assets/index-*.css (the entry chunk and
// its stylesheet, i.e. what every page load downloads), prints the total, and
// exits 1 if it is over the limit or if no such files exist (a missing build
// must not pass silently). Lazy chunks, workers and public/ files are ignored.
//
// Usage: node scripts/check-bundle-size.mjs [distDir] [maxBytes]
//   distDir  defaults to ./dist
//   maxBytes defaults to 5 MB (5 * 1024 * 1024)
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const BUNDLE_FILE = /^index-.*\.(js|css)$/;

const distDir = resolve(process.argv[2] ?? 'dist');
const maxBytes = process.argv[3] === undefined ? DEFAULT_MAX_BYTES : Number(process.argv[3]);

if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
  console.error(`check-bundle-size: invalid maxBytes "${process.argv[3]}"`);
  process.exit(1);
}

const toMb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

const assetsDir = join(distDir, 'assets');
const files = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((name) => BUNDLE_FILE.test(name)).sort()
  : [];

if (files.length === 0) {
  console.error(`check-bundle-size: no bundle files (index-*.js / index-*.css) in ${assetsDir}. Run the build first.`);
  process.exit(1);
}

let total = 0;
for (const name of files) {
  const { size } = statSync(join(assetsDir, name));
  total += size;
  console.log(`  ${name}: ${toMb(size)} MB (${size} bytes)`);
}
console.log(`Initial bundle total: ${toMb(total)} MB (${total} bytes), limit ${toMb(maxBytes)} MB`);

if (total > maxBytes) {
  console.error(`check-bundle-size: total ${toMb(total)} MB exceeds the limit of ${toMb(maxBytes)} MB`);
  process.exit(1);
}
