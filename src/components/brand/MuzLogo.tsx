/**
 * The MUZ logo. Concept: "the M becomes two eighth notes" — a single unified
 * beamed eighth-note pair whose top beam dips into an M, filled with a smooth
 * purple-to-emerald gradient so the stems and note heads flow as one shape.
 * Built on a 64-unit grid and optically centred at (32, 32); see docs/brand/LOGO.md.
 *
 * - MuzMark variant="app": dark indigo-violet squircle with unified purple-to-green
 *   beamed M-note (app icon, favicon).
 * - MuzMark variant="flat": no container; the unified M-note takes currentColor.
 * - MuzLogo: mark + wordmark lockup.
 */
import { useId } from 'react';
import { cn } from '../../lib/cn';

export const BRAND = Object.freeze({
  violet: '#7c3aed',
  violetMid: '#8b5cf6',
  violetBright: '#a78bfa',
  violetSoft: '#c4b5fd',
  note: '#6ee7b7',
  noteDeep: '#34d399',
  surfaceTop: '#1e1145',
  surfaceBottom: '#080d1a',
});

/** Single unified closed silhouette: M-shaped top beam + stems flowing into two note heads, centred by visual mass at (32, 32). */
const NOTE_M_PATH =
  'M 19 17.2 ' +
  'C 19 14.4 21.5 13.1 23.8 14.8 ' +
  'L 33 23 Q 33.95 23.7 34.9 23 L 44.1 14.8 ' +
  'C 46.4 13.1 48.9 14.4 48.9 17.2 ' +
  'L 48.9 40.2 ' +
  'C 48.9 44.2 45 47.2 40.6 47.2 ' +
  'C 36.4 47.2 34 44.6 34.6 41.4 ' +
  'C 35.1 38 39.2 36.6 42.1 37 ' +
  'C 43 37.1 43.5 36.4 43.5 35.2 ' +
  'L 43.5 21.6 ' +
  'L 35 29.1 C 34.3 29.7 33.6 29.7 32.9 29.1 L 24.4 21.6 ' +
  'L 24.4 41.6 ' +
  'C 24.4 45.6 20.5 48.6 16.1 48.6 ' +
  'C 11.9 48.6 9.5 46 10.1 42.8 ' +
  'C 10.6 39.4 14.7 38 17.6 38.4 ' +
  'C 18.5 38.5 19 37.8 19 36.6 ' +
  'Z';

interface MuzMarkProps {
  size?: number;
  variant?: 'app' | 'flat';
  className?: string;
  /** Accessible name; omit when the wordmark next to it already says "MUZ". */
  title?: string;
}

export function MuzMark({ size = 40, variant = 'app', className, title }: MuzMarkProps) {
  const id = useId().replace(/:/g, '');
  const app = variant === 'app';
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {app && (
        <>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={BRAND.surfaceTop} />
              <stop offset="1" stopColor={BRAND.surfaceBottom} />
            </linearGradient>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={BRAND.violetBright} stopOpacity="0.55" />
              <stop offset="1" stopColor={BRAND.note} stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id={`${id}-mark`} x1="0.1" y1="0" x2="0.2" y2="1">
              <stop offset="0" stopColor={BRAND.violetSoft} />
              <stop offset="0.38" stopColor={BRAND.violetMid} />
              <stop offset="0.72" stopColor={BRAND.noteDeep} />
              <stop offset="1" stopColor={BRAND.note} />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="18" fill={`url(#${id}-bg)`} />
          <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.5" />
        </>
      )}
      <path d={NOTE_M_PATH} fill={app ? `url(#${id}-mark)` : 'currentColor'} />
    </svg>
  );
}

interface MuzLogoProps {
  /** Mark size in px; the wordmark scales with it. */
  size?: number;
  className?: string;
  /** Optional line under the wordmark. */
  tagline?: string;
}

/** Mark + wordmark. The wordmark uses the UI typeface, heavy, generously tracked. */
export function MuzLogo({ size = 36, className, tagline }: MuzLogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: size * 0.3 }}>
      <MuzMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-black tracking-[0.2em] text-white" style={{ fontSize: size * 0.5 }}>
          MUZ
        </span>
        {tagline && (
          <span className="mt-1 font-medium text-slate-400" style={{ fontSize: Math.max(10, size * 0.28) }}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
