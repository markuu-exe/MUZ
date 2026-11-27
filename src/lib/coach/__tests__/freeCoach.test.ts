import { describe, expect, it } from 'vitest';
import { builtinTip } from '../builtinTip';
import type { CoachInput } from '../coach';
import { COACH_SYSTEM_PROMPT } from '../coach';
import { DEFAULT_GEMINI_MODEL, geminiRequestBody, geminiUrl, parseGeminiResponse } from '../gemini';

const base: CoachInput = {
  lessonTitle: 'C Major',
  status: 'passed',
  accuracy: 90,
  theoryScore: null,
  heartsLost: 0,
  durationSec: 200,
  rhythmConsistency: null,
  pitchAccuracy: 92,
  postureScore: 55,
  struggledWith: [],
};

describe('built-in coach (free, rules, no AI)', () => {
  it('praises the best score and targets the weakest one with concrete advice', () => {
    const tip = builtinTip(base);
    expect(tip).toMatch(/92%/);
    expect(tip).toMatch(/elbow between 80 and 110 degrees/);
  });

  it('uses the chord advice when chords needed retries', () => {
    const tip = builtinTip({ ...base, postureScore: 95, pitchAccuracy: 60, struggledWith: ['chords'] });
    expect(tip).toMatch(/chord keys at exactly the same time/);
  });

  it('rhythm-only lesson: timing advice, never mentions missing parts', () => {
    const tip = builtinTip({ ...base, pitchAccuracy: null, postureScore: null, rhythmConsistency: 62, accuracy: 85 });
    expect(tip).toMatch(/count aloud/);
    expect(tip).not.toMatch(/posture|chord|note/i);
  });

  it('out of hearts: encouragement and how to get a heart back', () => {
    const tip = builtinTip({ ...base, status: 'out-of-hearts' });
    expect(tip).toMatch(/theory lesson/);
    expect(tip).toMatch(/80%/);
  });

  it('a strong pass with nothing weak says to move on; a fail says try again', () => {
    expect(builtinTip({ ...base, postureScore: 97 })).toMatch(/next lesson/);
    expect(builtinTip({ ...base, status: 'failed', accuracy: 40 })).toMatch(/next try/);
  });

  it('only uses numbers it was given and stays short', () => {
    const tip = builtinTip(base);
    for (const n of tip.match(/\d+/g) ?? []) expect(['92', '80', '110']).toContain(n);
    expect(tip.split(/\s+/).length).toBeLessThanOrEqual(60);
  });
});

describe('Gemini free tier (REST shape)', () => {
  it('uses the documented endpoint with the model in the path and no key in the URL', () => {
    const url = geminiUrl(DEFAULT_GEMINI_MODEL);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(url).not.toMatch(/key=/);
    expect(() => geminiUrl('../../evil?x=1')).toThrow();
  });

  it('sends the same coach prompt and the scores as data', () => {
    const body = geminiRequestBody(base);
    expect(body.systemInstruction.parts[0].text).toBe(COACH_SYSTEM_PROMPT);
    expect(body.contents[0].parts[0].text).toContain('"postureScore":55');
  });

  it('reads the answer text and skips thought parts', () => {
    const res = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'planning…', thought: true }, { text: 'Keep your wrist straight.' }] } }] };
    expect(parseGeminiResponse(200, res)).toEqual({ kind: 'tip', text: 'Keep your wrist straight.' });
  });

  it('maps blocks, limits and failures', () => {
    expect(parseGeminiResponse(200, { promptFeedback: { blockReason: 'SAFETY' } })).toEqual({ kind: 'declined' });
    expect(parseGeminiResponse(200, { candidates: [{ finishReason: 'SAFETY' }] })).toEqual({ kind: 'declined' });
    expect(parseGeminiResponse(429, {})).toEqual({ kind: 'error', retryable: true });
    expect(parseGeminiResponse(503, null)).toEqual({ kind: 'error', retryable: true });
    expect(parseGeminiResponse(400, {})).toEqual({ kind: 'error', retryable: false });
    expect(parseGeminiResponse(200, { candidates: [] })).toEqual({ kind: 'error', retryable: true });
    expect(parseGeminiResponse(200, { candidates: [{ content: { parts: [{ text: '  ' }] } }] })).toEqual({ kind: 'error', retryable: true });
  });
});
