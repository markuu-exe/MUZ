# MUZ logo

**Concept: the M becomes a note.** A single, continuous, round-jointed **M**. Its two peaks read as piano keys and as a sound wave. Its right leg is the **stem of a quarter note**, with an emerald note head at its foot. The letter and the note are one shape, which is the app in one picture: you play, and MUZ hears the note.

Component: `src/components/brand/MuzLogo.tsx` (`MuzMark`, `MuzLogo`). Favicon: `public/favicon.svg`.

## Construction (64 × 64 grid)

| Part | Value |
|---|---|
| Container (app icon) | Rounded square, corner radius 18; 135° gradient `#7c3aed` → `#c026d3`; top-down gloss of white at 22% → 0% |
| M | One stroke `M16 46 V20 L30 35 L44 20 V44`, width 7.5, round caps and joins, white |
| Note head | Ellipse centred (38.4, 46.4), radii 7 × 5.2, rotated −28°, `#6ee7b7` |
| Optical balance | The M sits 2 units left of centre to balance the note head's weight in the bottom right |

## Variants

| Variant | Use |
|---|---|
| `MuzMark` `variant="app"` | App icon, favicon, sidebar, loading screen. The default. |
| `MuzMark` `variant="flat"` | No container. The M takes the text colour and the note head stays emerald. For small inline marks and one-colour contexts. |
| `MuzLogo` | Mark plus the **MUZ** wordmark (UI typeface, black weight, 0.2 em tracking), with an optional tagline. Headers. |

## Rules

- **Clear space:** at least a quarter of the mark's width on every side.
- **Minimum size:** 16 px for the mark; 28 px for the lockup with tagline.
- Don't recolour the container outside the violet→fuchsia gradient. Don't stretch, rotate or outline the mark. Don't separate the note head from the M.
- On light backgrounds, use the flat mark with a dark M (`#0f172a`). The note head keeps its emerald.
