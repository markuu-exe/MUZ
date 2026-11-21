// T-05 / DEF-004: without Supabase env the app used to render a blank page.
//
// main.tsx imports this module FIRST. If the env is incomplete it writes a
// readable message into #root and throws, which stops evaluation of the rest
// of the module graph (App, AuthProvider, the Supabase client) before anything
// else runs. A configured app is unaffected. This is a side-effect import
// rather than a dynamic import('./App') so the app stays in the index-*.js
// entry chunk that scripts/check-bundle-size.mjs measures.
import { supabaseConfigError } from './lib/supabase/config';

const configError = supabaseConfigError(import.meta.env);

if (configError) {
  const root = document.getElementById('root');
  if (root) {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    // Inline styles: in dev the stylesheet is injected by modules that never run.
    message.style.cssText =
      'margin:2rem;padding:1rem;border:1px solid #f87171;border-radius:8px;' +
      'background:#1f0a0a;color:#fecaca;font:16px/1.5 system-ui,sans-serif;';
    message.textContent = configError;
    root.replaceChildren(message);
  }
  throw new Error(configError);
}
