// CI guard for the Vercel Functions in api/: compile them to ES modules (the project is
// "type": "module", like Vercel runs them), import each one in Node and call POST once with no
// AI keys set. Catches the failure that took /api/coach down from #66 to #74: a relative import
// without a .js extension is fine for TypeScript and Vite but crashes Node's ES module loader
// (FUNCTION_INVOCATION_FAILED on Vercel).
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve('.api-check');
rmSync(out, { recursive: true, force: true });
execSync(`npx tsc -p api/tsconfig.json --noEmit false --outDir "${out}" --rootDir .`, { stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"module"}');

delete process.env.GEMINI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

let failed = false;
for (const file of readdirSync(join(out, 'api')).filter((f) => f.endsWith('.js'))) {
  try {
    const mod = await import(pathToFileURL(join(out, 'api', file)).href);
    if (typeof mod.POST !== 'function') throw new Error('no POST export');
    const res = await mod.POST(new Request(`https://muz.example/api/${file.replace('.js', '')}`, { method: 'POST', body: '{}' }));
    if (res.status !== 503) throw new Error(`expected 503 not_configured without keys, got ${res.status}`);
    console.log(`api/${file}: loads and answers 503 without keys`);
  } catch (e) {
    failed = true;
    console.error(`api/${file}: FAILED: ${e && e.message ? e.message.split('\n')[0] : e}`);
  }
}
rmSync(out, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
