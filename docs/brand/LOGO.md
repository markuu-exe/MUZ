# MUZ logo

**Concept: the M becomes a unified beamed eighth-note pair.** Two stems joined by a V-dipped beam flow seamlessly into two tilted note heads as one continuous closed glyph, optically centred in the 64 × 64 frame with a smooth purple-to-emerald gradient.

Component: `src/components/brand/MuzLogo.tsx` (`MuzMark`, `MuzLogo`). Favicon: `public/favicon.svg`.

## Construction (64 × 64 grid)

| Part | Value |
|---|---|
| Container (app icon) | Rounded square, corner radius 18; 135° dark indigo-navy gradient `#1e1145` → `#080d1a`; 1.5 px border gradient `#a78bfa` (55%) → `#6ee7b7` (45%) |
| Unified M-note glyph | Single closed path (`NOTE_M_PATH`) spanning `x: 9.9–48.9`, `y: 13.7–48.6` (visual centroid at `(32.0, 32.0)`), blending `#c4b5fd` → `#8b5cf6` → `#34d399` → `#6ee7b7` top to bottom |

## Variants

| Variant | Use |
|---|---|
| `MuzMark` `variant="app"` | App icon, favicon, sidebar, loading screen. The default. |
| `MuzMark` `variant="flat"` | No container. The unified glyph takes `currentColor` for small inline marks and one-colour contexts. |
| `MuzLogo` | Mark plus the **MUZ** wordmark (UI typeface, black weight, 0.2 em tracking), with an optional tagline. Headers. |

## Rules

- **Clear space:** at least a quarter of the mark's width on every side.
- **Minimum size:** 16 px for the mark; 28 px for the lockup with tagline.
- Don't stretch, rotate or outline the mark. Don't separate the note heads from the M.
- On light backgrounds, use the flat mark with a dark colour (`#0f172a`).
