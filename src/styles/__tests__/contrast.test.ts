/**
 * Accessibility pass (2026-11-27): automated colour contrast for the colour pairings the app
 * actually uses, in BOTH themes, read from the generated theme variables (src/styles/theme.css).
 * WCAG 2.x relative luminance. Thresholds: 4.5:1 for normal text, 3:1 for large/bold-large
 * text and for UI components and focus indicators (WCAG 1.4.3 / 1.4.11).
 * Translucent backgrounds (`bg-slate-900/90`, `bg-amber-950/40`) are composited over what is
 * beneath them, the way the browser paints them.
 *
 * This checks colour tokens, not rendered pages: it is not proof of full WCAG compliance
 * (see docs/test/ACCESSIBILITY_REPORT.md for what still needs a browser and a screen reader).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type RGB = [number, number, number];
type Theme = 'dark' | 'light';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

function block(theme: Theme): Record<string, RGB> {
  const start = theme === 'dark' ? css.indexOf(':root') : css.indexOf("[data-theme='light']");
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const vars: Record<string, RGB> = {};
  for (const m of body.matchAll(/--c-([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return vars;
}
const THEMES: Record<Theme, Record<string, RGB>> = { dark: block('dark'), light: block('light') };

/** "slate-400", "white", "muz-bg", with an optional "/40" alpha. */
function color(theme: Theme, token: string): { rgb: RGB; alpha: number } {
  // A pinned arbitrary colour (e.g. text-[#020617]) does not change with the theme.
  if (token.startsWith('#')) return { rgb: [1, 3, 5].map((i) => parseInt(token.slice(i, i + 2), 16)) as RGB, alpha: 1 };
  const [name, a] = token.split('/');
  const rgb = THEMES[theme][name];
  if (!rgb) throw new Error(`unknown colour token ${name}`);
  return { rgb, alpha: a ? Number(a) / 100 : 1 };
}

/** Paint `layers` bottom-up (first must be opaque). */
function paint(theme: Theme, layers: string[]): RGB {
  let out: RGB = [0, 0, 0];
  layers.forEach((token, i) => {
    const { rgb, alpha } = color(theme, token);
    out = i === 0 ? rgb : (out.map((c, k) => c * (1 - alpha) + rgb[k] * alpha) as RGB);
  });
  return out;
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAGE = ['muz-bg'];
const CARD = ['muz-bg', 'slate-900/90'];
const PANEL = ['muz-bg', 'slate-950/70'];

interface Pair {
  what: string;
  fg: string;
  bg: string[];
  min: 4.5 | 3;
}

/** Real pairings, found by grepping src/components (most used first). */
const PAIRS: Pair[] = [
  { what: 'body text on page', fg: 'white', bg: PAGE, min: 4.5 },
  { what: 'text on card', fg: 'slate-200', bg: CARD, min: 4.5 },
  { what: 'secondary text on card', fg: 'slate-300', bg: CARD, min: 4.5 },
  { what: 'muted text on card', fg: 'slate-400', bg: CARD, min: 4.5 },
  { what: 'muted text on page', fg: 'slate-400', bg: PAGE, min: 4.5 },
  { what: 'hint text on panel (was text-slate-500, now slate-400)', fg: 'slate-400', bg: PANEL, min: 4.5 },
  { what: 'upcoming stage chip / locked badge text (was slate-600, now slate-400)', fg: 'slate-400', bg: ['slate-900'], min: 4.5 },
  { what: 'muz-muted on page', fg: 'muz-muted', bg: PAGE, min: 4.5 },
  { what: 'violet label on card', fg: 'violet-300', bg: CARD, min: 4.5 },
  { what: 'rose text on card', fg: 'rose-300', bg: CARD, min: 4.5 },
  { what: 'amber text on card', fg: 'amber-300', bg: CARD, min: 4.5 },
  { what: 'emerald text on card', fg: 'emerald-300', bg: CARD, min: 4.5 },
  { what: 'amber status message', fg: 'amber-100', bg: [...CARD, 'amber-950/40'], min: 4.5 },
  { what: 'rose status message', fg: 'rose-100', bg: [...CARD, 'rose-950/40'], min: 4.5 },
  { what: 'emerald status message', fg: 'emerald-100', bg: [...CARD, 'emerald-950/50'], min: 4.5 },
  { what: 'cyan status message', fg: 'cyan-100', bg: [...CARD, 'cyan-950/40'], min: 4.5 },
  { what: 'coach card text', fg: 'slate-100', bg: [...CARD, 'violet-950/30'], min: 4.5 },
  { what: 'button text on violet-600', fg: 'white', bg: ['violet-600'], min: 4.5 },
  { what: 'button text on fuchsia-600 (gradient end)', fg: 'white', bg: ['fuchsia-600'], min: 4.5 },
  { what: 'wrong-answer / retry button text on rose-600 (was rose-500)', fg: 'white', bg: ['rose-600'], min: 4.5 },
  { what: 'retry button hover on rose-700', fg: 'white', bg: ['rose-700'], min: 4.5 },
  { what: 'correct-answer button text on emerald-700 (was emerald-500)', fg: 'white', bg: ['emerald-700'], min: 4.5 },
  { what: 'suggestion button (pinned #020617 on amber-500)', fg: '#020617', bg: ['amber-500'], min: 4.5 },
  { what: 'locked node icon (slate-500 on slate-800)', fg: 'slate-500', bg: ['slate-800'], min: 3 },
  { what: 'Skill Tree focus ring (white/80 over offset slate-950)', fg: 'white/80', bg: ['slate-950'], min: 3 },
  { what: 'violet focus ring on card', fg: 'violet-300', bg: CARD, min: 3 },
];

function fgOver(theme: Theme, fg: string, bg: string[]): RGB {
  return paint(theme, [...bg, fg]);
}

describe('colour contrast in both themes (WCAG 2.x)', () => {
  const rows: string[] = [];
  for (const theme of ['dark', 'light'] as Theme[]) {
    for (const p of PAIRS) {
      it(`${theme}: ${p.what} ≥ ${p.min}:1`, () => {
        const ratio = contrast(fgOver(theme, p.fg, p.bg), paint(theme, p.bg));
        rows.push(`${theme.padEnd(5)} ${ratio.toFixed(2).padStart(5)}:1 (min ${p.min}) ${p.what}`);
        expect(ratio, `${theme}: ${p.what} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(p.min);
      });
    }
  }
  it('prints the table', () => {
    console.log(`\n${rows.join('\n')}\n`);
  });
});

describe('guard: low-contrast hint text does not come back', () => {
  it('no component uses text-slate-500 for text (3.8:1 in dark, 4.3:1 in light)', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = new URL('../../components', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.tsx') && /(^|[\s"'`:])text-slate-500\b/.test(readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(decodeURIComponent(root));
    expect(hits).toEqual([]);
  });
});
