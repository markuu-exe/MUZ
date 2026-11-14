import { describe, expect, it } from 'vitest';
import { CueScheduler, FRAMING_PROMPT } from '../cues';
import { makeSnapshot } from './fixtures';

const droopL = { code: 'WRIST_DROOP' as const, side: 'left' as const, gating: true };
const elbowR = { code: 'ELBOW_TOO_WIDE' as const, side: 'right' as const, gating: true };
const slouch = { code: 'SLOUCH' as const, side: null, gating: false };

describe('prompt scheduling (KAN-256)', () => {
  it('shows nothing when posture is compliant', () => {
    const s = new CueScheduler();
    expect(s.update(makeSnapshot(), 0)).toBe(false);
    expect(s.current).toBeNull();
  });

  it('shows the gating cue with a side eyebrow, and caches the content object', () => {
    const s = new CueScheduler();
    s.update(makeSnapshot({ compliant: false, cues: [droopL] }), 0);
    const first = s.current!;
    expect(first.key).toBe('WRIST_DROOP:left');
    expect(first.severity).toBe('violation');
    expect(first.eyebrow).toBe('Left arm');
    s.reset();
    s.update(makeSnapshot({ compliant: false, cues: [droopL] }), 10);
    expect(s.current).toBe(first);
  });

  it('a gating cue preempts an advisory cue at once', () => {
    const s = new CueScheduler();
    s.update(makeSnapshot({ cues: [slouch] }), 0);
    expect(s.current!.severity).toBe('advisory');
    expect(s.update(makeSnapshot({ compliant: false, cues: [slouch, droopL] }), 50)).toBe(true);
    expect(s.current!.key).toBe('WRIST_DROOP:left');
  });

  it('is sticky: an equal-priority cue does not replace the shown one while it is active', () => {
    const s = new CueScheduler();
    s.update(makeSnapshot({ compliant: false, cues: [droopL] }), 0);
    const later = { ...elbowR, sinceMs: 5000 };
    expect(s.update(makeSnapshot({ compliant: false, cues: [droopL, later] }), 3000)).toBe(false);
    expect(s.current!.key).toBe('WRIST_DROOP:left');
    // once the shown cue resolves, the next one takes the slot
    expect(s.update(makeSnapshot({ compliant: false, cues: [later] }), 3100)).toBe(true);
    expect(s.current!.key).toBe('ELBOW_TOO_WIDE:right');
  });

  it('keeps a prompt for minVisibleMs so a quick fix does not just flash', () => {
    const s = new CueScheduler({ minVisibleMs: 800 });
    s.update(makeSnapshot({ compliant: false, cues: [droopL] }), 0);
    expect(s.update(makeSnapshot(), 300)).toBe(false);
    expect(s.current!.key).toBe('WRIST_DROOP:left');
    expect(s.update(makeSnapshot(), 800)).toBe(true);
    expect(s.current).toBeNull();
  });

  it('shows the framing hint only after compliant === null has lasted framingDwellMs', () => {
    const s = new CueScheduler({ framingDwellMs: 1000 });
    const lost = makeSnapshot({ compliant: null, hasPose: false });
    s.update(lost, 0);
    s.update(lost, 900);
    expect(s.current).toBeNull();
    s.update(lost, 1000);
    expect(s.current).toBe(FRAMING_PROMPT);
    // a brief recovery resets the dwell
    s.update(makeSnapshot(), 2000);
    s.update(makeSnapshot(), 2900);
    s.update(lost, 3000);
    expect(s.current).toBeNull();
  });

  it('framing outranks advisory, gating outranks framing', () => {
    const s = new CueScheduler({ framingDwellMs: 0 });
    s.update(makeSnapshot({ compliant: null, cues: [slouch] }), 0);
    expect(s.current).toBe(FRAMING_PROMPT);
    s.update(makeSnapshot({ compliant: false, cues: [slouch, droopL] }), 10);
    expect(s.current!.key).toBe('WRIST_DROOP:left');
  });

  it('hides when data goes stale (null snapshot), after the minimum time', () => {
    const s = new CueScheduler({ minVisibleMs: 800 });
    s.update(makeSnapshot({ compliant: false, cues: [droopL] }), 0);
    expect(s.update(null, 900)).toBe(true);
    expect(s.current).toBeNull();
  });
});
