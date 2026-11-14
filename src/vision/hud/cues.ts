/**
 * KAN-256 — Prompt scheduling for corrective text cues (SRS 3.1.5.5).
 *
 * There is one prompt slot. The analyser (KAN-248) already gives each cue a 600 ms dwell and
 * 2° recovery hysteresis, so this scheduler only decides WHICH cue to show and keeps the slot
 * calm:
 *
 *   priority   gating violation (red)  >  framing hint  >  advisory (amber)
 *   sticky     the shown cue stays while it is still active, unless a strictly higher
 *              priority cue appears, which replaces it at once
 *   min time   a prompt stays at least `minVisibleMs` before it is hidden or swapped for an
 *              equal or lower priority one, so a cue that clears quickly doesn't just flash
 *   framing    "get your arms in view" appears only after `compliant === null` (pose missing or
 *              both arms unreadable) has lasted `framingDwellMs`
 *
 * Pure logic with an injected clock (testable). PromptContent objects are cached by key, so
 * steady-state updates allocate nothing.
 */
import type { PostureCue, PostureCueCode, PostureSnapshot, Side } from '../posture/types';

export type PromptSeverity = 'violation' | 'framing' | 'advisory';

export interface PromptContent {
  /** Stable identity, e.g. "WRIST_DROOP:left". */
  key: string;
  code: PostureCueCode | 'FRAMING';
  side: Side | null;
  severity: PromptSeverity;
  /** Small caps line above the title ("LEFT ARM"), or null. */
  eyebrow: string | null;
  title: string;
  message: string;
}

export interface CueSchedulerOptions {
  minVisibleMs: number;
  framingDwellMs: number;
}

export const DEFAULT_CUE_SCHEDULER_OPTIONS: CueSchedulerOptions = {
  minVisibleMs: 800,
  framingDwellMs: 1000,
};

const PRIORITY: Record<PromptSeverity, number> = { violation: 3, framing: 2, advisory: 1 };

export const FRAMING_PROMPT: PromptContent = {
  key: 'FRAMING',
  code: 'FRAMING',
  side: null,
  severity: 'framing',
  eyebrow: null,
  title: 'Get your arms in view',
  message: 'Show your head, shoulders, elbows and hands to the camera.',
};

export function cueKey(cue: Pick<PostureCue, 'code' | 'side'>): string {
  return cue.side ? `${cue.code}:${cue.side}` : cue.code;
}

export class CueScheduler {
  readonly options: CueSchedulerOptions;
  private shown: PromptContent | null = null;
  private shownAtMs = 0;
  private nullSinceMs = Number.NaN;
  /** code → [left, right, no side]. Lookups allocate nothing. */
  private readonly cache = new Map<PostureCueCode, [PromptContent | null, PromptContent | null, PromptContent | null]>();

  constructor(options: Partial<CueSchedulerOptions> = {}) {
    this.options = { ...DEFAULT_CUE_SCHEDULER_OPTIONS, ...options };
  }

  get current(): PromptContent | null {
    return this.shown;
  }

  reset(): void {
    this.shown = null;
    this.nullSinceMs = Number.NaN;
  }

  /**
   * Feeds the snapshot currently on screen (or null when no fresh data).
   * Returns true when the displayed prompt changed.
   */
  update(snapshot: PostureSnapshot | null, nowMs: number): boolean {
    const candidate = this.pick(snapshot, nowMs);
    const shown = this.shown;

    if (candidate === shown) return false;

    if (shown) {
      const shownFor = nowMs - this.shownAtMs;
      const preempts = candidate !== null && PRIORITY[candidate.severity] > PRIORITY[shown.severity];
      const stillActive = snapshot !== null && this.isActive(shown, snapshot);
      // Sticky: keep the shown cue while it is active, unless something more urgent arrives.
      if (stillActive && !preempts) return false;
      // Minimum visible time before hiding or swapping sideways / down.
      if (!preempts && shownFor < this.options.minVisibleMs) return false;
    }

    this.shown = candidate;
    this.shownAtMs = nowMs;
    return true;
  }

  private pick(snapshot: PostureSnapshot | null, nowMs: number): PromptContent | null {
    if (!snapshot) {
      this.nullSinceMs = Number.NaN;
      return null;
    }

    // Best active cue: gating first, then the longest-standing.
    let best: PostureCue | null = null;
    for (const cue of snapshot.cues) {
      if (!best || (cue.gating && !best.gating) || (cue.gating === best.gating && cue.sinceMs > best.sinceMs)) best = cue;
    }

    // Framing hint dwell.
    if (snapshot.compliant === null) {
      if (Number.isNaN(this.nullSinceMs)) this.nullSinceMs = nowMs;
    } else {
      this.nullSinceMs = Number.NaN;
    }
    const framing = !Number.isNaN(this.nullSinceMs) && nowMs - this.nullSinceMs >= this.options.framingDwellMs;

    if (best && best.gating) return this.content(best);
    if (framing) return FRAMING_PROMPT;
    return best ? this.content(best) : null;
  }

  private isActive(prompt: PromptContent, snapshot: PostureSnapshot): boolean {
    if (prompt === FRAMING_PROMPT) return snapshot.compliant === null;
    for (const cue of snapshot.cues) if (cue.code === prompt.code && cue.side === prompt.side) return true;
    return false;
  }

  private content(cue: PostureCue): PromptContent {
    let entry = this.cache.get(cue.code);
    if (!entry) {
      entry = [null, null, null];
      this.cache.set(cue.code, entry);
    }
    const slot = cue.side === 'left' ? 0 : cue.side === 'right' ? 1 : 2;
    let c = entry[slot];
    if (!c) {
      c = {
        key: cueKey(cue),
        code: cue.code,
        side: cue.side,
        severity: cue.gating ? 'violation' : 'advisory',
        eyebrow: cue.side ? `${cue.side === 'left' ? 'Left' : 'Right'} arm` : null,
        title: cue.label,
        message: cue.message,
      };
      entry[slot] = c;
    }
    return c;
  }
}
