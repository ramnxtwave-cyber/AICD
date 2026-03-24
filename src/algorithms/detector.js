/**
 * algorithms/detector.js  —  ORCHESTRATOR
 *
 * Combines Tier 1 + Tier 2 + Tier 3 into a single unified result.
 *
 * Tier weights (all available):   T1 40%  T2 30%  T3 30%
 * Tier weights (T3 unavailable):  T1 57%  T2 43%
 */

import { runTier1, scoreTier1, classifyLine, buildGroups } from './tier1/heuristics.js';
import { runTier2, scoreTier2 }                            from './tier2/statistical.js';
import { mlClassify, getModelState, preloadModel, setStatusCallback } from './tier3/mlClassifier.js';

export { classifyLine, buildGroups, getModelState, preloadModel, setStatusCallback };

const VERDICT_MAP = [
  { min: 78, label: 'AI Generated'  },
  { min: 62, label: 'Likely AI'     },
  { min: 45, label: 'Mixed'         },
  { min: 30, label: 'Likely Human'  },
  { min:  0, label: 'Human Written' },
];

function getVerdict(score) {
  return (VERDICT_MAP.find(v => score >= v.min) || VERDICT_MAP[4]).label;
}

export async function analyzeCode(code, language, useML = true, onProgress = () => {}) {
  const lines = code.split('\n');

  // ── Tier 1: Heuristics (synchronous, instant) ──────────────────────────────
  onProgress({ tier: 1, status: 'running' });
  const t1Metrics = runTier1(code, lines);
  const t1Score   = scoreTier1(t1Metrics);
  onProgress({ tier: 1, status: 'done', score: t1Score });

  // ── Tier 2: Statistical (synchronous, instant) ─────────────────────────────
  onProgress({ tier: 2, status: 'running' });
  const t2Metrics = runTier2(code, lines);
  const t2Score   = scoreTier2(t2Metrics);
  onProgress({ tier: 2, status: 'done', score: t2Score });

  // ── Tier 3: ML Model (async, may be unavailable) ───────────────────────────
  let t3Result = { score: null, confidence: 0, available: false, reason: 'Not attempted' };
  if (useML) {
    onProgress({ tier: 3, status: 'running' });
    try {
      t3Result = await mlClassify(code);
    } catch (e) {
      t3Result = { score: null, confidence: 0, available: false, reason: e.message };
    }
    onProgress({ tier: 3, status: t3Result.available ? 'done' : 'unavailable', score: t3Result.score });
  }

  // ── Combine ─────────────────────────────────────────────────────────────────
  let overall_score, tier_weights;
  if (t3Result.available && t3Result.score !== null) {
    tier_weights  = { t1: 0.40, t2: 0.30, t3: 0.30 };
    overall_score = Math.round(t1Score * 0.40 + t2Score * 0.30 + t3Result.score * 0.30);
  } else {
    tier_weights  = { t1: 0.57, t2: 0.43, t3: 0 };
    overall_score = Math.round(t1Score * 0.57 + t2Score * 0.43);
  }
  overall_score = Math.min(100, Math.max(0, overall_score));

  const confidence = Math.min(94, Math.round(52 + Math.abs(overall_score - 50) * 0.84));
  const verdict    = getVerdict(overall_score);

  const lineResults = lines.map((line, i) => ({
    n: i + 1, text: line,
    ...classifyLine(line, lines, i),
  }));

  const aiLineCount    = lineResults.filter(l => l.status === 'ai').length;
  const humanLineCount = lineResults.filter(l => l.status === 'human').length;

  return {
    overall_score,
    confidence,
    verdict,
    ai_lines_pct:    Math.round((aiLineCount    / lines.length) * 100),
    human_lines_pct: Math.round((humanLineCount / lines.length) * 100),
    tiers: {
      tier1: { score: t1Score,        weight: tier_weights.t1, metrics: t1Metrics, available: true              },
      tier2: { score: t2Score,        weight: tier_weights.t2, metrics: t2Metrics, available: true              },
      tier3: { score: t3Result.score, weight: tier_weights.t3, metrics: t3Result,  available: t3Result.available },
    },
    lines:     lineResults,
    groups:    buildGroups(lineResults, lines),
    codeLines: lines,
    language,
  };
}
