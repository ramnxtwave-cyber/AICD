/**
 * algorithms/tier2/statistical.js
 *
 * TIER 2 — Statistical / Token-level Analysis
 * No trained model needed, but uses frequency tables and probability estimates.
 *
 * Techniques:
 *   1. N-gram frequency analysis   — AI token sequences have distinct bigram/trigram patterns
 *   2. Log-rank scoring            — AI prefers high-probability (top-ranked) tokens
 *   3. Token frequency histogram   — AI skews toward small set of common tokens
 *   4. Type-Token Ratio advanced   — segment-level TTR variance (MATTR)
 *   5. Bayesian token features     — naive Bayes-style feature vector on token classes
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared token helpers
// ─────────────────────────────────────────────────────────────────────────────

function tokenise(text) {
  return (text.toLowerCase().match(/\b[a-z_]\w*\b/g) || []);
}

// Common English/code words that AI over-uses vs humans
// Built from analysis of GPT-4 / Copilot output patterns
const AI_FAVOURED_TOKENS = new Set([
  'calculate','compute','process','retrieve','generate','initialize','validate',
  'implement','execute','perform','determine','establish','utilise','utilize',
  'ensure','provide','represent','maintain','indicate','demonstrate','facilitate',
  'comprehensive','appropriate','efficient','effective','functionality','implementation',
  'parameters','arguments','returns','raises','attributes','methods','instances',
  'responsible','based','according','following','specified','given','provided',
  'successfully','correctly','properly','accordingly','additionally','furthermore',
  'however','therefore','consequently','subsequently','respectively',
]);

const HUMAN_FAVOURED_TOKENS = new Set([
  'tmp','buf','ret','val','idx','ptr','cnt','cfg','msg','err','ok','num',
  'hack','quick','temp','fixme','todo','wtf','idk','check','maybe','rough',
  'old','new','bad','good','test','debug','fix','try','run','get','set','add',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. N-gram Frequency Analysis
// Computes bigram entropy of token sequences.
// AI produces very low-entropy bigrams (predictable transitions).
// Returns 0-100: LOW = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function ngramEntropy(text, n = 2) {
  const tokens = tokenise(text);
  if (tokens.length < n + 2) return 50;

  const ngrams = {};
  for (let i = 0; i <= tokens.length - n; i++) {
    const key = tokens.slice(i, i + n).join('|');
    ngrams[key] = (ngrams[key] || 0) + 1;
  }

  const total = Object.values(ngrams).reduce((a, b) => a + b, 0);
  let H = 0;
  Object.values(ngrams).forEach(c => {
    const p = c / total;
    H -= p * Math.log2(p);
  });
  const maxH = Math.log2(total);
  return maxH > 0 ? Math.min(100, Math.round((H / maxH) * 100)) : 50;
  // LOW = AI-like (predictable bigrams)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Log-rank Scoring (DetectLLM-inspired)
// AI text heavily uses the most common/expected tokens.
// We approximate by scoring what fraction of tokens come from our AI-favoured list.
// Returns 0-100: HIGH = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function logRankScore(text) {
  const tokens = tokenise(text);
  if (tokens.length < 10) return 40;

  let aiFavoured   = 0;
  let humanFavoured = 0;

  for (const tok of tokens) {
    if (AI_FAVOURED_TOKENS.has(tok))    aiFavoured++;
    if (HUMAN_FAVOURED_TOKENS.has(tok)) humanFavoured++;
  }

  const aiRate    = aiFavoured    / tokens.length;
  const humanRate = humanFavoured / tokens.length;
  const net = aiRate - humanRate;

  // Scale to 0-100
  return Math.min(100, Math.max(0, Math.round(50 + net * 600)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Token Frequency Histogram (GLTR-inspired)
// GLTR buckets tokens by rank: top-10%, top-25%, top-50%, rest.
// AI skews heavily toward the most common tokens.
// We approximate using our favoured-token lists as a proxy for token rank.
// Returns 0-100: HIGH = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function tokenHistogramScore(text) {
  const tokens = tokenise(text);
  if (tokens.length < 15) return 40;

  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total  = tokens.length;

  // What fraction of tokens come from the top-20% most frequent types?
  const topTypeCount  = Math.ceil(sorted.length * 0.20);
  const topTokenSet   = new Set(sorted.slice(0, topTypeCount).map(([t]) => t));
  const topTokenUsage = tokens.filter(t => topTokenSet.has(t)).length;
  const concentration = topTokenUsage / total;

  // AI: high concentration (uses same words over and over)
  // Human: more spread out
  if (concentration > 0.75) return 85;
  if (concentration > 0.65) return 70;
  if (concentration > 0.55) return 55;
  if (concentration > 0.45) return 40;
  return 25;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Moving-Average TTR (MATTR) — segment-level vocabulary richness
// Standard TTR is biased by text length; MATTR computes TTR in sliding windows.
// AI has consistently low MATTR; humans have variable but higher windows.
// Returns 0-100: LOW = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function mattrScore(text, windowSize = 50) {
  const tokens = tokenise(text);
  if (tokens.length < windowSize) {
    // Fall back to simple TTR
    const unique = new Set(tokens).size;
    return tokens.length > 0 ? Math.min(100, Math.round((unique / tokens.length) * 130)) : 50;
  }

  const windowTtrs = [];
  for (let i = 0; i <= tokens.length - windowSize; i++) {
    const window  = tokens.slice(i, i + windowSize);
    const unique  = new Set(window).size;
    windowTtrs.push(unique / windowSize);
  }

  const meanTtr = windowTtrs.reduce((a, b) => a + b, 0) / windowTtrs.length;
  // Normalise: typical human MATTR ~0.65-0.80, AI ~0.45-0.60
  return Math.min(100, Math.round(meanTtr * 130));
  // LOW = AI-like
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Bayesian Feature Score
// Naive-Bayes-inspired scoring using presence/absence of specific token features.
// Based on known distinguishing features from academic papers.
// Returns 0-100: HIGH = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function bayesianFeatureScore(text, lines) {
  // Each feature: [weight, isAI_signal]
  // Positive weight + isAI_signal=true → increases AI score
  const features = [
    // Strong AI features
    { test: () => /\b(ensure|validate|initialize|implement)\b/i.test(text),          w: 8,  ai: true  },
    { test: () => /\b(Parameters|Returns|Raises|Attributes)\s*:/m.test(text),        w: 10, ai: true  },
    { test: () => /from typing import/.test(text),                                    w: 7,  ai: true  },
    { test: () => /"""[\s\S]{5,200}"""/m.test(text),                                 w: 6,  ai: true  },
    { test: () => (text.match(/"""[\s\S]*?"""/g) || []).length > 3,                  w: 8,  ai: true  },
    { test: () => /\bexcept\s+Exception\s+as\b/.test(text),                          w: 7,  ai: true  },
    { test: () => /\b(comprehensive|appropriate|efficiently)\b/i.test(text),         w: 5,  ai: true  },
    { test: () => /^\s*#\s[A-Z][A-Za-z ]{10,}\./m.test(text),                        w: 6,  ai: true  },
    { test: () => lines.filter(l => /^class \w+/.test(l.trim())).length > 0 &&
                  /class\s+\w+[^:]+:\s*\n\s*"""/.test(text),                         w: 9,  ai: true  },

    // Strong human features
    { test: () => /\bTODO\b|\bFIXME\b|\bHACK\b/i.test(text),                        w: 9,  ai: false },
    { test: () => /^\s*except\s*:/m.test(text),                                       w: 7,  ai: false },
    { test: () => /\b(tmp|buf|ret|idx|cnt)\b/.test(text),                             w: 6,  ai: false },
    { test: () => /print\s*\(\s*\w+\s*\)\s*$/.test(text),                            w: 5,  ai: false },
    { test: () => /#\s*[a-z].{0,30}$/.test(text),                                    w: 5,  ai: false },
    { test: () => /^\s*#.*commented.out|^\s*#\s*(old|prev|broken|bad)\b/im.test(text), w: 8, ai: false },
    { test: () => lines.some(l => /\d{2,}/.test(l) && !/=\s*\d/.test(l) &&
                  !/["']/.test(l)),                                                   w: 4,  ai: false },
  ];

  let aiScore    = 50; // start neutral
  let totalWeight = 0;

  for (const f of features) {
    if (f.test()) {
      totalWeight += f.w;
      if (f.ai) aiScore += f.w;
      else       aiScore -= f.w;
    }
  }

  return Math.min(100, Math.max(0, Math.round(aiScore)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all Tier 2 signals
// ─────────────────────────────────────────────────────────────────────────────
export function runTier2(code, lines) {
  return {
    ngram_entropy:      ngramEntropy(code, 2),  // LOW  = AI
    log_rank:           logRankScore(code),      // HIGH = AI
    token_histogram:    tokenHistogramScore(code), // HIGH = AI
    mattr:              mattrScore(code),         // LOW  = AI
    bayesian_features:  bayesianFeatureScore(code, lines), // HIGH = AI
  };
}

// Weighted score from Tier 2 metrics (0-100, high = AI)
export function scoreTier2(m) {
  return Math.round(
    (100 - m.ngram_entropy)   * 0.20 +  // inverted: low entropy = AI
    m.log_rank                * 0.25 +
    m.token_histogram         * 0.20 +
    (100 - m.mattr)           * 0.15 +  // inverted: low MATTR = AI
    m.bayesian_features       * 0.20
  );
}
