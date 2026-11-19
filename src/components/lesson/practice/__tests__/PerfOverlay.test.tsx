import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PerfOverlay, { downloadLandmarkLog, LANDMARK_EXPORT_FILENAME } from '../PerfOverlay';
import CameraPanel from '../CameraPanel';
import { LandmarkLog } from '../../../../vision/eval/landmarkLog';
import { ANALYZER_INPUT_LENGTH } from '../../../../vision/eval/analyzerInput';
import type { FrameLoop } from '../../../../vision/pipeline/FrameLoop';
import type { PracticeRig, RigState } from '../../../../practice/PracticeRig';

const frameLoop = { delegate: 'GPU', on: () => () => undefined } as unknown as FrameLoop;

function logWith(frames: number): LandmarkLog {
  const log = new LandmarkLog();
  for (let i = 0; i < frames; i++) log.push(i * 33, new Float32Array(ANALYZER_INPUT_LENGTH));
  return log;
}

const state: RigState = {
  camera: { status: 'active' } as RigState['camera'],
  model: 'ready',
  modelError: null,
  mic: 'idle',
  micError: null,
};

function rig(landmarkLog: LandmarkLog | null): PracticeRig {
  return { video: {}, frameLoop, landmarkLog } as unknown as PracticeRig;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('PerfOverlay landmark export (AI-3)', () => {
  it('shows no export button without a landmark log', () => {
    const html = renderToStaticMarkup(<PerfOverlay frameLoop={frameLoop} engine={null} />);
    expect(html).toContain('perf-overlay');
    expect(html).not.toContain('Export landmarks');
    expect(html).not.toContain('<button');
  });

  it('shows the export button with the frame count when a log is given', () => {
    const html = renderToStaticMarkup(<PerfOverlay frameLoop={frameLoop} engine={null} landmarks={logWith(42)} />);
    expect(html).toContain('Export landmarks (numbers only)');
    expect(html).toContain('42 frames');
  });

  it('says when the log is full', () => {
    const log = new LandmarkLog(2);
    for (let i = 0; i < 3; i++) log.push(i, new Float32Array(ANALYZER_INPUT_LENGTH));
    const html = renderToStaticMarkup(<PerfOverlay frameLoop={frameLoop} engine={null} landmarks={log} />);
    expect(html).toContain('2 frames (full)');
  });
});

describe('CameraPanel (AI-3)', () => {
  it('without ?debug: no overlay and no export button, even if a log exists', () => {
    vi.stubGlobal('window', { location: { search: '' } });
    const html = renderToStaticMarkup(<CameraPanel rig={rig(logWith(3))} state={state} />);
    expect(html).not.toContain('perf-overlay');
    expect(html).not.toContain('Export landmarks');
  });

  it('with ?debug: the overlay offers the rig log for export', () => {
    vi.stubGlobal('window', { location: { search: '?debug' } });
    const html = renderToStaticMarkup(<CameraPanel rig={rig(logWith(3))} state={state} />);
    expect(html).toContain('perf-overlay');
    expect(html).toContain('3 frames');
  });
});

describe('downloadLandmarkLog (AI-3)', () => {
  it('downloads the JSON through a Blob object URL and revokes it afterwards', async () => {
    vi.useFakeTimers();
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    const appended: unknown[] = [];
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { appendChild: (n: unknown) => appended.push(n) } });
    let blob: Blob | null = null;
    const createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:fake'));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const file = logWith(2).toJSON();
    downloadLandmarkLog(file);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe('blob:fake');
    expect(anchor.download).toBe(LANDMARK_EXPORT_FILENAME);
    expect(LANDMARK_EXPORT_FILENAME).toBe('muz-landmarks.json');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    expect(appended).toEqual([anchor]);
    expect(blob!.type).toBe('application/json');
    expect(JSON.parse(await blob!.text())).toEqual(file);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
