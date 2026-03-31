/**
 * algorithms/detector.js  —  ORCHESTRATOR
 *
 * Combines Tier 1 + Tier 2 + Tier 3 into a single unified result.
 *
 * Tier 2 now runs on the Python backend (NLTK, taaled, 610K word-frequency DB).
 * Falls back to the local JS implementation if the backend is unavailable.
 *
 * Mode A (default, Layer 4 off):
 *   Tier weights (all available):   T1 35%  T2 20%  T3 45%
 *   Tier weights (T3 unavailable):  T1 60%  T2 40%
 *
 * Mode B (Layer 4 on, reviewer-triggered):
 *   Default: T1 20%  T2 15%  T3 30%  Layer4 35%
 *   Sliders adjustable 0–60%, must sum to 100%
 */

import {
  runTier1,
  scoreTier1,
  computeBypassFlag,
  classifyLine,
  buildGroups,
} from "./tier1/heuristics.js";
import {
  runTier2 as runTier2JS,
  scoreTier2 as scoreTier2JS,
  countTokens,
} from "./tier2/statistical.js";
import {
  mlClassify,
  getModelState,
  preloadModel,
  setStatusCallback,
} from "./tier3/mlClassifier.js";

export {
  classifyLine,
  buildGroups,
  getModelState,
  preloadModel,
  setStatusCallback,
};

const VERDICT_MAP = [
  { min: 78, label: "AI Generated" },
  { min: 62, label: "Likely AI" },
  { min: 45, label: "Mixed" },
  { min: 30, label: "Likely Human" },
  { min: 0, label: "Human Written" },
];

function getVerdict(score) {
  return (VERDICT_MAP.find((v) => score >= v.min) || VERDICT_MAP[4]).label;
}

export async function analyzeCode(
  code,
  language,
  useML = true,
  onProgress = () => {},
) {
  const lines = code.split("\n");
  const tokenCount = countTokens(code);

  // ── Tier 1: Heuristics (local, synchronous, instant) ────────────────────
  onProgress({ tier: 1, status: "running" });
  const t1Metrics = runTier1(code, lines, language);
  const t1Score = scoreTier1(t1Metrics);
  const t1Bypass = computeBypassFlag(code, lines, language);
  onProgress({ tier: 1, status: "done", score: t1Score });

  // ── Backend call: Tier 2 (statistical) + Tier 3 (ML) ───────────────────
  let t2Metrics, t2Score, t2Source;
  let t3Result = {
    score: null,
    confidence: 0,
    available: false,
    reason: "Not attempted",
  };

  if (useML) {
    onProgress({ tier: 2, status: "running" });
    onProgress({ tier: 3, status: "running" });

    let backendResponse;
    try {
      backendResponse = await mlClassify(code, language);
    } catch (e) {
      backendResponse = {
        tier3: {
          score: null,
          confidence: 0,
          available: false,
          reason: e.message,
        },
        backendT2: null,
      };
    }

    t3Result = backendResponse.tier3;

    // Use backend Tier 2 if available, otherwise fall back to local JS
    if (backendResponse.backendT2) {
      t2Metrics = backendResponse.backendT2.metrics;
      t2Score = backendResponse.backendT2.score;
      t2Source = "backend";
    } else {
      t2Metrics = runTier2JS(code, lines);
      t2Score = scoreTier2JS(t2Metrics, tokenCount);
      t2Source = "local";
    }

    onProgress({ tier: 2, status: "done", score: t2Score });
    onProgress({
      tier: 3,
      status: t3Result.available ? "done" : "unavailable",
      score: t3Result.score,
    });
  } else {
    // ML disabled — run JS Tier 2 only
    onProgress({ tier: 2, status: "running" });
    t2Metrics = runTier2JS(code, lines);
    t2Score = scoreTier2JS(t2Metrics, tokenCount);
    t2Source = "local";
    onProgress({ tier: 2, status: "done", score: t2Score });
  }

  // ── Combine (Mode A — Layer 4 off) ─────────────────────────────────────
  let overall_score, tier_weights;
  if (t3Result.available && t3Result.score !== null) {
    tier_weights = { t1: 0.35, t2: 0.20, t3: 0.45 };
    overall_score = Math.round(
      t1Score * 0.35 + t2Score * 0.20 + t3Result.score * 0.45,
    );
  } else {
    tier_weights = { t1: 0.60, t2: 0.40, t3: 0 };
    overall_score = Math.round(t1Score * 0.60 + t2Score * 0.40);
  }
  overall_score = Math.min(100, Math.max(0, overall_score));

  const confidence = Math.min(
    94,
    Math.round(52 + Math.abs(overall_score - 50) * 0.84),
  );
  const verdict = getVerdict(overall_score);

  const lineResults = lines.map((line, i) => ({
    n: i + 1,
    text: line,
    ...classifyLine(line, lines, i, language),
  }));

  const aiLineCount = lineResults.filter((l) => l.status === "ai").length;
  const humanLineCount = lineResults.filter((l) => l.status === "human").length;

  return {
    overall_score,
    confidence,
    verdict,
    ai_lines_pct: Math.round((aiLineCount / lines.length) * 100),
    human_lines_pct: Math.round((humanLineCount / lines.length) * 100),
    tiers: {
      tier1: {
        score: t1Score,
        weight: tier_weights.t1,
        metrics: t1Metrics,
        bypass: t1Bypass,
        available: true,
        source: "local",
      },
      tier2: {
        score: t2Score,
        weight: tier_weights.t2,
        metrics: t2Metrics,
        available: true,
        source: t2Source,
      },
      tier3: {
        score: t3Result.score,
        weight: tier_weights.t3,
        metrics: t3Result,
        available: t3Result.available,
        source: "backend",
      },
    },
    lines: lineResults,
    groups: buildGroups(lineResults),
    codeLines: lines,
    language,
    tokenCount,
  };
}

// ── Mode B: Layer 4 scoring ───────────────────────────────────────────────
export const MODE_B_DEFAULTS = { t1: 0.20, t2: 0.15, t3: 0.30, layer4: 0.35 };

export function computeModeBScore(result, layer4Score, weights = MODE_B_DEFAULTS) {
  const t1 = result.tiers.tier1.score;
  const t2 = result.tiers.tier2.score;
  const t3 = result.tiers.tier3.available ? result.tiers.tier3.score : null;

  let w = { ...weights };
  if (t3 === null) {
    w.t3 = 0;
    const remaining = w.t1 + w.t2 + w.layer4;
    if (remaining > 0) {
      const scale = 1.0 / remaining;
      w.t1 *= scale;
      w.t2 *= scale;
      w.layer4 *= scale;
    }
  }

  const raw = t1 * w.t1 + t2 * w.t2 + (t3 ?? 0) * w.t3 + layer4Score * w.layer4;
  return Math.min(100, Math.max(0, Math.round(raw)));
}
