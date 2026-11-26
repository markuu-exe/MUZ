/**
 * The MUZ logo. Concept: "the M becomes a note" — a single continuous,
 * round-jointed M (its peaks read as keys and as a sound wave) whose right leg
 * is the stem of a quarter note: an emerald note head sits at its foot, tilted
 * like an engraved note head. The M is shifted 2 units left to balance the
 * head's weight in the bottom right.
 * Built on a 64-unit grid; see docs/brand/LOGO.md for construction and usage.
 *
 * - MuzMark variant="app": gradient squircle container (app icon, favicon).
 * - MuzMark variant="flat": no container; the M takes currentColor (one-colour use).
 * - MuzLogo: mark + wordmark lockup.
 */
import { useId } from 'react';
import { cn } from '../../lib/cn';

export const BRAND = Object.freeze({
  violet: '#7c3aed',
  fuchsia: '#c026d3',
  note: '#6ee7b7',
});

/** The M: one stroke, rounded caps and joins. */
const M_PATH = 'M16 46 V20 L30 35 L44 20 V44';

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
              <stop offset="0" stopColor={BRAND.violet} />
              <stop offset="1" stopColor={BRAND.fuchsia} />
            </linearGradient>
            <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="18" fill={`url(#${id}-bg)`} />
          <rect width="64" height="64" rx="18" fill={`url(#${id}-gloss)`} />
        </>
      )}
      <path
        d={M_PATH}
        fill="none"
        stroke={app ? '#ffffff' : 'currentColor'}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="38.4" cy="46.4" rx="7" ry="5.2" transform="rotate(-28 38.4 46.4)" fill={BRAND.note} />
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
