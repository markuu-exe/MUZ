/** Test 2D contexts: a recorder ("stroke colour inspection") and a no-op context for cost measurement. */
import type { HudContext } from '../skeleton';

export interface RecordedOp {
  op: 'stroke' | 'fill' | 'clearRect';
  style: string;
  alpha: number;
  lineWidth: number;
  /** Sub-paths (moveTo count) in the path being stroked or filled. */
  subpaths: number;
  coords: number[];
}

/** Records the draw calls that matter for "stroke colour inspection" (SDD trace for SRS 3.1.5.4/5). */
export class RecordingContext implements HudContext {
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  readonly ops: RecordedOp[] = [];
  private subpaths = 0;
  private coords: number[] = [];

  beginPath(): void {
    this.subpaths = 0;
    this.coords = [];
  }
  moveTo(x: number, y: number): void {
    this.subpaths++;
    this.coords.push(x, y);
  }
  lineTo(x: number, y: number): void {
    this.coords.push(x, y);
  }
  arc(x: number, y: number): void {
    this.coords.push(x, y);
  }
  stroke(): void {
    this.record('stroke', String(this.strokeStyle));
  }
  fill(): void {
    this.record('fill', String(this.fillStyle));
  }
  clearRect(): void {
    this.ops.push({ op: 'clearRect', style: '', alpha: 1, lineWidth: 0, subpaths: 0, coords: [] });
  }
  setTransform(): void {}

  reset(): void {
    this.ops.length = 0;
  }

  private record(op: 'stroke' | 'fill', style: string): void {
    this.ops.push({ op, style, alpha: this.globalAlpha, lineWidth: this.lineWidth, subpaths: this.subpaths, coords: [...this.coords] });
  }
}

/** A context that does nothing (for measuring the HUD's own JS cost). */
export class NullContext implements HudContext {
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arc(): void {}
  stroke(): void {}
  fill(): void {}
  clearRect(): void {}
  setTransform(): void {}
}
