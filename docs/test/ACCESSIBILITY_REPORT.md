# Accessibility pass (E12), 2026-11-27

Scope (owner's request): automated colour contrast in both themes, keyboard navigation through the Skill Tree path, focus visibility, and screen-reader notices. **An automated check is not proof of full WCAG compliance**; what still needs a person is listed at the end.

## 1. Automated contrast, dark and light themes

`src/styles/__tests__/contrast.test.ts` (Vitest, no new dependency) reads the generated theme variables in `src/styles/theme.css` for both themes, paints translucent backgrounds over what lies beneath them, and applies the WCAG 2.x contrast formula to the colour pairings the components really use (found by counting class usage in `src/components`). Thresholds: 4.5:1 for normal text, 3:1 for UI components and focus indicators. It also fails if `text-slate-500` text comes back.

### Failures found and fixed

| Pairing | Dark (before) | Light (before) | Fix | After (dark / light) |
|---|---|---|---|---|
| White text on green "Continue" buttons (`bg-emerald-500`) | 2.54:1 | 7.04:1 | `bg-emerald-700` | passes both |
| White text on red buttons (`bg-rose-500`: wrong-answer Continue, retry, leave, retry save) | 3.67:1 | 4.86:1 | `bg-rose-600` (hover `rose-700`) | passes both |
| Hint text `text-slate-500` (40 places) on cards / panels | 3.80 / 4.21:1 | 4.34 / 4.49:1 | `text-slate-400` everywhere | 7.04 / 6.92:1 |
| Upcoming stage chips and locked badge text (`text-slate-600`) | below 3:1 | — | `text-slate-400` | passes both |
| Suggested-practice button text (`text-slate-950` on amber, flips to near-white in light) | 9.39:1 | 2.05:1 | pinned `text-[#020617]` | 9.39 / 9.39:1 |

All 53 pairings now pass in both themes (table printed by the test). The Skill Tree focus ring is 12.7:1 (dark) and 9.3:1 (light) against its offset.

## 2. Keyboard: Skill Tree path (run by hand in Chromium, demo mode, both themes)

| Check | Result |
|---|---|
| Every node is a native `<button>` in path order; no positive `tabindex` anywhere | Pass (59 nodes) |
| Tab / Shift+Tab move node to node along the path | Pass |
| Focus is visible on nodes in dark and light | Pass (ring flips with the theme) |
| Node labels announce title, kind, status and reward or what unlocks it (e.g. `Locked · finish "X" first`) | Pass (`aria-label`, `aria-current="step"` on the current node) |
| Enter / Space opens the node | Pass |
| **Defect fixed:** the detail panel sits after every node in page order, so a keyboard user had to Tab through the rest of the path to reach Start | Focus now moves to the panel's Start/Replay button when it opens |
| **Defect fixed:** no way to close the panel from the keyboard; ✕ had no accessible name | Escape and ✕ close it and return focus to the node; ✕ is labelled "Close lesson details"; the panel is a labelled region |
| Locked node gives a perceivable message on activation | Pass (shake plus a banner naming the blocker; the label already says it) |
| No focus trap | Pass |

## 3. Screen-reader notices

- **Fixed:** the small-screen notice (window < 1024 px) is now an `alertdialog` with a title and description, so it is announced (finding from the 2026-11-27 smoke run). Its icons are hidden from screen readers and its pulse respects reduced motion.
- Already present and checked in code: live regions for drill status, Hearing, count-in, coach tips, failed-save alerts; `role="alert"` on errors.
- The 10 px kind chip in the node panel is now 12 px.

## 4. Not covered (needs a person)

- A real screen reader pass (NVDA on Windows, VoiceOver on macOS) through sign-in, the Skill Tree, a theory lesson, a drill and Profile.
- Contrast of every decorative gradient, chart colours and canvas content (beat highway): only representative token pairs are tested.
- Zoom to 200 % and Windows High Contrast mode.
- Keyboard use inside every lesson exercise type (theory views were built with buttons and Enter; drills and rhythm use Enter and Space by design, but this was not re-walked end to end here).
