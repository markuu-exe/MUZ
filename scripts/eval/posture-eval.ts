/**
 * AI-3: offline posture-rule evaluation against hand labels.
 *
 *   npm run eval:posture -- <log.json> <labels.csv>
 *
 * <log.json>   exported from the practice view's PerfOverlay (`?debug`):
 *              "Export landmarks (numbers only)".
 * <labels.csv> rows of startMs,endMs,label with label good|elbow|wrist|unknown,
 *              times in ms from the first logged frame.
 *
 * Replays the frames through a fresh PostureAnalyzer with the app's default config
 * and prints TP/FP/FN/TN, precision and recall per rule. See docs/test/POSTURE_EVAL_METHOD.md.
 */
import * as fs from 'node:fs';
import { LandmarkLog } from '../../src/vision/eval/landmarkLog';
import { evaluateLog, formatReport, labelWarnings, parseLabelsCsv } from '../../src/vision/eval/postureScore';

const USAGE = 'usage: npm run eval:posture -- <log.json> <labels.csv>';

function readJson(path: string): unknown {
  const text = fs.readFileSync(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${path} is not valid JSON (${err instanceof Error ? err.message : String(err)})`);
  }
}

function main(argv: string[]): number {
  const [logPath, labelsPath, ...rest] = argv;
  if (!logPath || !labelsPath || rest.length > 0) {
    console.error(USAGE);
    return 2;
  }
  try {
    const log = LandmarkLog.fromJSON(readJson(logPath));
    const spans = parseLabelsCsv(fs.readFileSync(labelsPath, 'utf8'));
    const report = evaluateLog(log, spans);
    console.log(formatReport(report));
    for (const w of labelWarnings(spans, report)) console.error(`warning: ${w}`);
    return 0;
  } catch (err) {
    console.error(`posture-eval: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
