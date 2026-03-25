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
  return text.toLowerCase().match(/\b[a-z_]\w*\b/g) || [];
}

// ~120 words AI over-uses (GPT-4, Claude, Gemini, Copilot patterns)
const AI_FAVOURED_TOKENS = new Set([
  // Verbs AI loves
  "calculate",
  "compute",
  "process",
  "retrieve",
  "generate",
  "initialize",
  "validate",
  "implement",
  "execute",
  "perform",
  "determine",
  "establish",
  "utilise",
  "utilize",
  "ensure",
  "provide",
  "represent",
  "maintain",
  "indicate",
  "demonstrate",
  "facilitate",
  "leverage",
  "streamline",
  "optimize",
  "orchestrate",
  "instantiate",
  "encapsulate",
  "traverse",
  "iterate",
  "aggregate",
  "decouple",
  "designate",
  "configure",
  "invoke",
  "serialize",
  "deserialize",
  "authenticate",
  "authorize",
  "sanitize",
  "normalize",
  "interpolate",
  "propagate",
  "allocate",
  "deallocate",
  "dispatch",
  "intercept",
  "transform",
  "evaluate",
  "concatenate",
  "enumerate",
  "specify",
  "construct",

  // Adjectives / adverbs
  "comprehensive",
  "appropriate",
  "efficient",
  "effective",
  "robust",
  "seamless",
  "modular",
  "scalable",
  "maintainable",
  "reusable",
  "extensible",
  "immutable",
  "asynchronous",
  "concurrent",
  "idempotent",
  "deterministic",
  "polymorphic",
  "declarative",
  "imperative",

  // Nouns
  "functionality",
  "implementation",
  "methodology",
  "paradigm",
  "abstraction",
  "parameters",
  "arguments",
  "returns",
  "raises",
  "attributes",
  "methods",
  "instances",
  "middleware",
  "endpoint",
  "payload",
  "schema",
  "serializer",
  "validator",
  "repository",
  "singleton",
  "factory",
  "observer",
  "decorator",
  "adapter",
  "configuration",
  "dependency",
  "initializer",
  "constructor",
  "destructor",

  // Connector words AI overuses
  "responsible",
  "based",
  "according",
  "following",
  "specified",
  "given",
  "provided",
  "successfully",
  "correctly",
  "properly",
  "accordingly",
  "additionally",
  "furthermore",
  "however",
  "therefore",
  "consequently",
  "subsequently",
  "respectively",
  "moreover",
  "nevertheless",
  "specifically",
  "essentially",
  "fundamentally",
]);

// ~80 words that signal human authorship
const HUMAN_FAVOURED_TOKENS = new Set([
  // Abbreviations humans use
  "tmp",
  "buf",
  "ret",
  "val",
  "idx",
  "ptr",
  "cnt",
  "cfg",
  "msg",
  "err",
  "ok",
  "num",
  "src",
  "dst",
  "ctx",
  "req",
  "res",
  "cb",
  "fn",
  "str",
  "len",
  "pos",
  "cur",
  "prev",
  "fmt",
  "pkg",
  "desc",
  "max",
  "min",
  "avg",
  "acc",
  "sum",

  // Casual / informal
  "hack",
  "quick",
  "temp",
  "fixme",
  "todo",
  "wtf",
  "idk",
  "check",
  "maybe",
  "rough",
  "kludge",
  "nah",
  "hmm",
  "ugh",
  "wip",
  "nope",
  "yep",
  "aka",
  "misc",
  "junk",
  "crap",
  "oops",
  "meh",
  "stub",
  "mock",
  "dummy",
  "workaround",
  "bandaid",
  "monkey",
  "patch",
  "sketchy",
  "janky",
  "brittle",
  "flaky",
  "dodgy",

  // Short practical words
  "old",
  "new",
  "bad",
  "good",
  "test",
  "debug",
  "fix",
  "try",
  "run",
  "get",
  "set",
  "add",
  "del",
  "pop",
  "push",
  "swap",
  "skip",
  "done",
  "fail",
  "pass",
  "drop",
  "grab",
  "tweak",
]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. N-gram Frequency Analysis
// LOW entropy = AI-like (predictable transitions)
// ─────────────────────────────────────────────────────────────────────────────
export function ngramEntropy(text, n = 2) {
  const tokens = tokenise(text);
  if (tokens.length < n + 2) return 50;

  const ngrams = {};
  for (let i = 0; i <= tokens.length - n; i++) {
    const key = tokens.slice(i, i + n).join("|");
    ngrams[key] = (ngrams[key] || 0) + 1;
  }

  const total = Object.values(ngrams).reduce((a, b) => a + b, 0);
  let H = 0;
  Object.values(ngrams).forEach((c) => {
    const p = c / total;
    H -= p * Math.log2(p);
  });
  const maxH = Math.log2(total);
  return maxH > 0 ? Math.min(100, Math.round((H / maxH) * 100)) : 50;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Log-rank Scoring (DetectLLM-inspired)
// HIGH = AI-like (uses formal AI-favoured vocabulary)
// ─────────────────────────────────────────────────────────────────────────────
export function logRankScore(text) {
  const tokens = tokenise(text);
  if (tokens.length < 10) return 40;

  let aiFavoured = 0;
  let humanFavoured = 0;

  for (const tok of tokens) {
    if (AI_FAVOURED_TOKENS.has(tok)) aiFavoured++;
    if (HUMAN_FAVOURED_TOKENS.has(tok)) humanFavoured++;
  }

  const aiRate = aiFavoured / tokens.length;
  const humanRate = humanFavoured / tokens.length;
  const net = aiRate - humanRate;

  return Math.min(100, Math.max(0, Math.round(50 + net * 600)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Token Frequency Histogram (GLTR-inspired)
// HIGH = AI-like (concentrated token usage)
// ─────────────────────────────────────────────────────────────────────────────
export function tokenHistogramScore(text) {
  const tokens = tokenise(text);
  if (tokens.length < 15) return 40;

  const freq = {};
  tokens.forEach((t) => {
    freq[t] = (freq[t] || 0) + 1;
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total = tokens.length;

  const topTypeCount = Math.ceil(sorted.length * 0.2);
  const topTokenSet = new Set(sorted.slice(0, topTypeCount).map(([t]) => t));
  const topTokenUsage = tokens.filter((t) => topTokenSet.has(t)).length;
  const concentration = topTokenUsage / total;

  if (concentration > 0.75) return 85;
  if (concentration > 0.65) return 70;
  if (concentration > 0.55) return 55;
  if (concentration > 0.45) return 40;
  return 25;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Moving-Average TTR (MATTR)
// LOW = AI-like (narrow per-window vocabulary)
// ─────────────────────────────────────────────────────────────────────────────
export function mattrScore(text, windowSize = 50) {
  const tokens = tokenise(text);
  if (tokens.length < windowSize) {
    const unique = new Set(tokens).size;
    return tokens.length > 0
      ? Math.min(100, Math.round((unique / tokens.length) * 130))
      : 50;
  }

  const windowTtrs = [];
  for (let i = 0; i <= tokens.length - windowSize; i++) {
    const window = tokens.slice(i, i + windowSize);
    const unique = new Set(window).size;
    windowTtrs.push(unique / windowSize);
  }

  const meanTtr = windowTtrs.reduce((a, b) => a + b, 0) / windowTtrs.length;
  return Math.min(100, Math.round(meanTtr * 130));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Bayesian Feature Score
// HIGH = AI-like
// ─────────────────────────────────────────────────────────────────────────────
export function bayesianFeatureScore(text, lines) {
  const features = [
    // ── Strong AI features ──
    {
      test: () =>
        /\b(ensure|validate|initialize|implement|leverage|orchestrate)\b/i.test(
          text,
        ),
      w: 8,
      ai: true,
    },
    {
      test: () => /\b(Parameters|Returns|Raises|Attributes)\s*:/m.test(text),
      w: 10,
      ai: true,
    },
    { test: () => /from typing import/.test(text), w: 7, ai: true },
    { test: () => /"""[\s\S]{5,200}"""/m.test(text), w: 6, ai: true },
    {
      test: () => (text.match(/"""[\s\S]*?"""/g) || []).length > 3,
      w: 8,
      ai: true,
    },
    { test: () => /\bexcept\s+Exception\s+as\b/.test(text), w: 7, ai: true },
    {
      test: () =>
        /\b(comprehensive|appropriate|efficiently|seamless|robust)\b/i.test(
          text,
        ),
      w: 6,
      ai: true,
    },
    { test: () => /^\s*#\s[A-Z][A-Za-z ]{10,}\./m.test(text), w: 6, ai: true },
    {
      test: () =>
        lines.filter((l) => /^class \w+/.test(l.trim())).length > 0 &&
        /class\s+\w+[^:]+:\s*\n\s*"""/.test(text),
      w: 9,
      ai: true,
    },

    // JSDoc / doc-comment patterns (AI always adds these)
    { test: () => /^\s*\*\s*@param\b/m.test(text), w: 7, ai: true },
    { test: () => /^\s*\*\s*@returns?\b/m.test(text), w: 6, ai: true },
    { test: () => /^\s*\*\s*@throws?\b/m.test(text), w: 5, ai: true },

    // Numbered step comments (strong AI signal)
    {
      test: () =>
        (text.match(/^\s*(#|\/\/)\s*(Step|Phase)\s+\d+/gm) || []).length >= 2,
      w: 9,
      ai: true,
    },

    // Consistent trailing commas in multi-line objects/arrays (AI pattern)
    {
      test: () => (text.match(/,\s*\n\s*[}\]]/g) || []).length >= 3,
      w: 5,
      ai: true,
    },

    // Verbose error messages
    {
      test: () => {
        const errMsgs =
          text.match(
            /(raise|throw|Error|Exception)\s*\(\s*["'`]([^"'`]+)["'`]/g,
          ) || [];
        return errMsgs.some((m) => {
          const inner = m.match(/["'`]([^"'`]+)["'`]/);
          return inner && inner[1].length > 40;
        });
      },
      w: 6,
      ai: true,
    },

    // ── Strong human features ──
    {
      test: () => /\bTODO\b|\bFIXME\b|\bHACK\b|\bWIP\b|\bXXX\b/i.test(text),
      w: 9,
      ai: false,
    },
    { test: () => /^\s*except\s*:/m.test(text), w: 7, ai: false },
    {
      test: () => /\b(tmp|buf|ret|idx|cnt|ctx|cb|ptr)\b/.test(text),
      w: 6,
      ai: false,
    },
    { test: () => /print\s*\(\s*\w+\s*\)\s*$/.test(text), w: 5, ai: false },
    { test: () => /#\s*[a-z].{0,30}$/.test(text), w: 5, ai: false },
    {
      test: () =>
        /^\s*#.*commented.out|^\s*#\s*(old|prev|broken|bad)\b/im.test(text),
      w: 8,
      ai: false,
    },
    {
      test: () =>
        lines.some(
          (l) => /\d{2,}/.test(l) && !/=\s*\d/.test(l) && !/["']/.test(l),
        ),
      w: 4,
      ai: false,
    },

    // Mixed quote styles (human signal — inconsistency)
    {
      test: () => {
        const singles = (text.match(/'/g) || []).length;
        const doubles = (text.match(/"/g) || []).length;
        return (
          singles > 3 &&
          doubles > 3 &&
          Math.min(singles, doubles) / Math.max(singles, doubles) > 0.3
        );
      },
      w: 5,
      ai: false,
    },

    // console.log with just variables (debug leftover, human)
    {
      test: () => /console\.log\s*\(\s*[a-z_]\w*\s*\)/m.test(text),
      w: 6,
      ai: false,
    },

    // Short error messages (human)
    {
      test: () => {
        const errMsgs =
          text.match(/(raise|throw|Error)\s*\(\s*["'`]([^"'`]+)["'`]/g) || [];
        return errMsgs.some((m) => {
          const inner = m.match(/["'`]([^"'`]+)["'`]/);
          return inner && inner[1].length < 15;
        });
      },
      w: 5,
      ai: false,
    },
  ];

  let aiScore = 50;

  for (const f of features) {
    if (f.test()) {
      if (f.ai) aiScore += f.w;
      else aiScore -= f.w;
    }
  }

  return Math.min(100, Math.max(0, Math.round(aiScore)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all Tier 2 signals
// ─────────────────────────────────────────────────────────────────────────────
export function runTier2(code, lines) {
  return {
    ngram_entropy: ngramEntropy(code, 2),
    log_rank: logRankScore(code),
    token_histogram: tokenHistogramScore(code),
    mattr: mattrScore(code),
    bayesian_features: bayesianFeatureScore(code, lines),
  };
}

// Weighted score from Tier 2 metrics (0-100, high = AI)
export function scoreTier2(m) {
  return Math.round(
    (100 - m.ngram_entropy) * 0.2 +
      m.log_rank * 0.25 +
      m.token_histogram * 0.2 +
      (100 - m.mattr) * 0.15 +
      m.bayesian_features * 0.2,
  );
}
