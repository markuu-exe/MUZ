/**
 * KAN-256 — DOM prompt layer (decision Q2: DOM, not canvas text).
 *
 * One absolutely positioned element that vanilla TS writes directly, and only when the
 * scheduled prompt changes (a few times a minute at most). Compared with canvas text:
 * - the compositor runs the opacity fade (no per-frame main-thread work),
 * - the text is sharp at any DPR and needs no sprite cache or font-load handling,
 * - `role="status"` + `aria-live="polite"` let screen readers announce corrections.
 * React never renders this element's contents, so it keeps the "no React re-renders" rule (SRS 3.2.1).
 */
import type { PromptContent, PromptSeverity } from './cues';
import { TONE_HEX, Tone } from './palette';

export interface PromptLayerOptions {
  fadeMs: number;
  reducedMotion: boolean;
}

const SEVERITY_COLOR: Record<PromptSeverity, string> = {
  violation: TONE_HEX[Tone.Violation],
  advisory: TONE_HEX[Tone.Advisory],
  framing: TONE_HEX[Tone.Unknown],
};

export class PromptLayer {
  readonly element: HTMLDivElement;
  private readonly eyebrow: HTMLSpanElement;
  private readonly title: HTMLSpanElement;
  private readonly message: HTMLSpanElement;
  private shown: PromptContent | null = null;
  private pending: PromptContent | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private fadeMs: number;

  constructor(root: HTMLElement, options: Partial<PromptLayerOptions> = {}) {
    this.fadeMs = options.reducedMotion ? 0 : (options.fadeMs ?? 180);
    const doc = root.ownerDocument;
    const el = doc.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.dataset.hudPrompt = '';
    Object.assign(el.style, {
      position: 'absolute',
      top: '4%',
      left: '50%',
      maxWidth: 'min(80%, 34em)',
      transform: 'translate(-50%, -6px)',
      padding: '0.55em 1em 0.65em',
      borderRadius: '14px',
      background: 'rgba(7, 11, 20, 0.82)',
      border: '2px solid transparent',
      color: '#edf2ff',
      fontFamily: "Inter, 'Segoe UI', sans-serif",
      textAlign: 'center',
      lineHeight: '1.25',
      pointerEvents: 'none',
      opacity: '0',
      visibility: 'hidden',
      transition: `opacity ${this.fadeMs}ms ease, transform ${this.fadeMs}ms ease`,
      willChange: 'opacity, transform',
    } satisfies Partial<CSSStyleDeclaration>);

    this.eyebrow = doc.createElement('span');
    this.title = doc.createElement('span');
    this.message = doc.createElement('span');
    for (const s of [this.eyebrow, this.title, this.message]) s.style.display = 'block';
    Object.assign(this.eyebrow.style, { textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '600', opacity: '0.8' });
    this.title.style.fontWeight = '700';
    this.message.style.opacity = '0.9';
    el.append(this.eyebrow, this.title, this.message);
    root.appendChild(el);
    this.element = el;
    this.setScale(720);
  }

  /** Font sizes follow the rendered video height so the text is readable from the piano bench (SRS 3.2.1). */
  setScale(videoCssHeight: number): void {
    const h = videoCssHeight > 0 ? videoCssHeight : 720;
    this.title.style.fontSize = `${Math.max(20, Math.round(h * 0.034))}px`;
    this.message.style.fontSize = `${Math.max(15, Math.round(h * 0.024))}px`;
    this.eyebrow.style.fontSize = `${Math.max(11, Math.round(h * 0.016))}px`;
  }

  /** Shows `next` (null hides). Only does DOM work when the prompt actually changes. */
  apply(next: PromptContent | null): void {
    if (this.timer === null && next === this.shown) return;
    this.pending = next;
    if (this.timer !== null) return; // a fade-out is in progress; it will pick up `pending`
    if (this.shown === null) {
      this.commit();
      return;
    }
    // Fade the current prompt out, then swap or hide.
    this.element.style.opacity = '0';
    this.element.style.transform = 'translate(-50%, -6px)';
    this.timer = setTimeout(() => {
      this.timer = null;
      this.commit();
    }, this.fadeMs);
  }

  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.element.remove();
  }

  private commit(): void {
    const next = this.pending;
    this.shown = next;
    const el = this.element;
    if (!next) {
      el.style.visibility = 'hidden';
      return;
    }
    this.eyebrow.textContent = next.eyebrow ?? '';
    this.eyebrow.style.display = next.eyebrow ? 'block' : 'none';
    this.title.textContent = next.title;
    this.message.textContent = next.message;
    const color = SEVERITY_COLOR[next.severity];
    el.dataset.severity = next.severity;
    el.style.borderColor = color;
    el.style.boxShadow = `0 0 18px ${color}55, inset 0 0 12px ${color}22`;
    this.eyebrow.style.color = color;
    el.style.visibility = 'visible';
    // Next frame: start the fade-in transition from the hidden state.
    void el.offsetWidth;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, 0)';
  }
}
