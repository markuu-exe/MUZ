export function normalizeVector(values: number[]) {
  const magnitude = Math.hypot(...values) || 1;
  return values.map((value) => value / magnitude);
}

export function buildChromagram(fftBins: number[], sampleRate: number, fftSize = 4096) {
  const bins = Array.from({ length: 12 }, () => 0);

  for (let i = 0; i < fftBins.length; i += 1) {
    const magnitude = Math.abs(fftBins[i]);
    const frequency = (i * sampleRate) / fftSize;

    if (frequency <= 20 || frequency >= 20000) {
      continue;
    }

    const midi = 69 + 12 * Math.log2(frequency / 440);
    const pitchClassIndex = ((Math.round(midi) % 12) + 12) % 12;
    bins[pitchClassIndex] += magnitude;
  }

  const total = bins.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return Array.from({ length: 12 }, () => 0);
  }

  return bins.map((value) => value / total);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export const CHORD_TEMPLATES: Record<string, number[]> = {
  C: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  G: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  Am: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  F: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
};

export function matchChordTemplate(chromagram: number[], templateName: keyof typeof CHORD_TEMPLATES) {
  const template = CHORD_TEMPLATES[templateName];
  return cosineSimilarity(normalizeVector(chromagram), normalizeVector(template));
}
