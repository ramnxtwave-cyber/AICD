import { describe, it, expect } from "vitest";
import {
  countTokens,
  ngramEntropy,
  logRankScore,
  tokenHistogramScore,
  mattrScore,
  bayesianFeatureScore,
  runTier2,
  scoreTier2,
} from "./statistical.js";

// ─────────────────────────────────────────────────────────────────────────────
// countTokens
// ─────────────────────────────────────────────────────────────────────────────
describe("countTokens", () => {
  it("counts lowercase word-boundary tokens", () => {
    expect(countTokens("let x = 1")).toBe(2); // "let", "x"
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("returns 0 for non-word content", () => {
    expect(countTokens("123 + 456")).toBe(0);
  });

  it("handles multiline code", () => {
    const code = "function solve(n) {\n  return n * 2;\n}";
    expect(countTokens(code)).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ngramEntropy
// ─────────────────────────────────────────────────────────────────────────────
describe("ngramEntropy", () => {
  it("returns 50 for very short text (< n+2 tokens)", () => {
    expect(ngramEntropy("x y", 2)).toBe(50);
  });

  it("returns low entropy for highly repetitive tokens", () => {
    const repetitive = Array(50).fill("return value").join(" ");
    const score = ngramEntropy(repetitive, 2);
    expect(score).toBeLessThan(30);
  });

  it("returns higher entropy for diverse tokens", () => {
    const diverse = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
    const score = ngramEntropy(diverse, 2);
    expect(score).toBeGreaterThan(70);
  });

  it("returns score between 0 and 100", () => {
    const score = ngramEntropy("function solve n return n plus one end", 2);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logRankScore
// ─────────────────────────────────────────────────────────────────────────────
describe("logRankScore", () => {
  it("returns 40 for very short text (< 10 tokens)", () => {
    expect(logRankScore("x y z")).toBe(40);
  });

  it("returns high score for AI-favoured vocabulary", () => {
    const aiText = "implement validate initialize compute ensure process generate retrieve establish determine facilitate orchestrate leverage utilize demonstrate appropriate comprehensive efficient robust seamless";
    const score = logRankScore(aiText);
    expect(score).toBeGreaterThan(70);
  });

  it("returns low score for human-favoured vocabulary", () => {
    const humanText = "tmp buf ret idx cnt ctx ptr hack fixme todo wip broken old prev bad quick temp stuff thingy foo bar baz qux";
    const score = logRankScore(humanText);
    expect(score).toBeLessThan(30);
  });

  it("returns moderate score for mostly neutral text", () => {
    const neutral = "the value brown fox jumps over the lazy dog and then runs away fast in the morning light across the field near the edge";
    const score = logRankScore(neutral);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("clamps between 0 and 100", () => {
    const extremeAI = Array(30).fill("implement validate initialize").join(" ");
    expect(logRankScore(extremeAI)).toBeLessThanOrEqual(100);
    expect(logRankScore(extremeAI)).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tokenHistogramScore
// ─────────────────────────────────────────────────────────────────────────────
describe("tokenHistogramScore", () => {
  it("returns 40 for very short text (< 15 tokens)", () => {
    expect(tokenHistogramScore("x y z a b")).toBe(40);
  });

  it("returns high score for concentrated token usage (few types, many repeats)", () => {
    // 2 types repeated many times → top 20% of types = 1 type covering ~50% of tokens
    const concentrated = Array(40).fill("return return return value").join(" ");
    const score = tokenHistogramScore(concentrated);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("returns low score for highly diverse tokens", () => {
    const diverse = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega centauri vega sirius rigel polaris canopus aldebaran antares";
    const score = tokenHistogramScore(diverse);
    expect(score).toBeLessThanOrEqual(40);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mattrScore
// ─────────────────────────────────────────────────────────────────────────────
describe("mattrScore", () => {
  it("returns 50 for empty text", () => {
    expect(mattrScore("")).toBe(50);
  });

  it("handles text shorter than window size", () => {
    const short = "alpha beta gamma delta";
    const score = mattrScore(short, 50);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns low score for highly repetitive long text", () => {
    const repetitive = Array(100).fill("return value").join(" ");
    const score = mattrScore(repetitive, 50);
    expect(score).toBeLessThan(30);
  });

  it("returns higher score for diverse long text", () => {
    const words = [];
    for (let i = 0; i < 100; i++) words.push("word" + i);
    const score = mattrScore(words.join(" "), 50);
    expect(score).toBeGreaterThan(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bayesianFeatureScore
// ─────────────────────────────────────────────────────────────────────────────
describe("bayesianFeatureScore", () => {
  it("returns 50 for neutral code with no features", () => {
    const code = "x = 1\ny = 2\nz = x + y";
    const score = bayesianFeatureScore(code, code.split("\n"));
    expect(score).toBe(50);
  });

  it("returns high score for AI-style code", () => {
    const code = [
      'from typing import List, Optional',
      '',
      'def validate_input(data: List) -> Optional[str]:',
      '    """Validate the input data comprehensively.',
      '',
      '    Parameters:',
      '        data: The input data to validate.',
      '',
      '    Returns:',
      '        An appropriate error message if validation fails.',
      '    """',
      '    # Step 1: Ensure data is not empty.',
      '    # Step 2: Process each element efficiently.',
      '    try:',
      '        result = process(data)',
      '    except Exception as e:',
      '        raise ValueError("Invalid input data provided for processing")',
    ].join("\n");
    const score = bayesianFeatureScore(code, code.split("\n"));
    expect(score).toBeGreaterThan(70);
  });

  it("returns low score for human-style code", () => {
    const code = [
      "# TODO fix this later",
      "def solve(arr):",
      "    # quick hack",
      "    tmp = []",
      "    for idx in range(len(arr)):",
      "        buf = arr[idx]",
      "        tmp.append(buf)",
      "    except:",
      "        pass",
    ].join("\n");
    const score = bayesianFeatureScore(code, code.split("\n"));
    expect(score).toBeLessThan(40);
  });

  it("clamps between 0 and 100", () => {
    const extremeAI = [
      'from typing import List',
      '"""Comprehensive implementation."""',
      '"""Robust validation."""',
      '"""Efficient processing."""',
      '"""Appropriate handling."""',
      'def validate():', '    """Ensure seamless execution."""',
      '    # Step 1: Initialize.', '    # Step 2: Process.',
      '    except Exception as e:', '        raise ValueError("error")',
      '    * @param x', '    * @returns y', '    * @throws Error',
    ].join("\n");
    const score = bayesianFeatureScore(extremeAI, extremeAI.split("\n"));
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("does NOT flag bare print(x) as human signal", () => {
    const withPrints = [
      "def solve(n):",
      "    ans = 0",
      "    for i in range(n):",
      "        ans += i",
      "    print(ans)",
      "    return ans",
    ].join("\n");
    const withoutPrints = [
      "def solve(n):",
      "    ans = 0",
      "    for i in range(n):",
      "        ans += i",
      "    return ans",
    ].join("\n");
    const s1 = bayesianFeatureScore(withPrints, withPrints.split("\n"));
    const s2 = bayesianFeatureScore(withoutPrints, withoutPrints.split("\n"));
    expect(s1).toBe(s2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// runTier2
// ─────────────────────────────────────────────────────────────────────────────
describe("runTier2", () => {
  it("returns all five metric keys", () => {
    const code = "function solve(n) {\n  let ans = 0;\n  for (let i = 0; i < n; i++) ans += i;\n  return ans;\n}";
    const m = runTier2(code, code.split("\n"));
    expect(m).toHaveProperty("ngram_entropy");
    expect(m).toHaveProperty("log_rank");
    expect(m).toHaveProperty("token_histogram");
    expect(m).toHaveProperty("mattr");
    expect(m).toHaveProperty("bayesian_features");
  });

  it("all metrics are numbers between 0 and 100", () => {
    const code = "def calculate_maximum(numbers):\n    return max(numbers)";
    const m = runTier2(code, code.split("\n"));
    for (const key of Object.keys(m)) {
      expect(m[key]).toBeGreaterThanOrEqual(0);
      expect(m[key]).toBeLessThanOrEqual(100);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreTier2 — weights and length gate
// ─────────────────────────────────────────────────────────────────────────────
describe("scoreTier2", () => {
  const uniformMetrics = {
    bayesian_features: 60,
    log_rank: 60,
    token_histogram: 60,
    ngram_entropy: 40, // inverted: (100 - 40) = 60
    mattr: 40,         // inverted: (100 - 40) = 60
  };

  it("uses default weights: Bayesian 40%, Log-rank 35%, Token freq 20%, N-gram 3%, MATTR 2%", () => {
    const score = scoreTier2(uniformMetrics);
    // All signals at 60 → 60 * (0.40 + 0.35 + 0.20 + 0.03 + 0.02) = 60
    expect(score).toBe(60);
  });

  it("applies length gate when tokenCount < 100: N-gram and MATTR become 0", () => {
    const metricsWithDiffNgram = {
      bayesian_features: 60,
      log_rank: 60,
      token_histogram: 60,
      ngram_entropy: 0,  // would contribute 100 * 0.03 = 3 normally
      mattr: 0,          // would contribute 100 * 0.02 = 2 normally
    };
    const withGate = scoreTier2(metricsWithDiffNgram, 50);
    const withoutGate = scoreTier2(metricsWithDiffNgram, 200);

    // With gate: ngram and mattr weights are 0, so their values don't matter
    // Without gate: ngram_entropy=0 → (100-0)*0.03 = 3, mattr=0 → (100-0)*0.02 = 2
    expect(withGate).not.toBe(withoutGate);
  });

  it("length gate redistributes 5% proportionally across Bayesian, Log-rank, Token freq", () => {
    const m = {
      bayesian_features: 100,
      log_rank: 100,
      token_histogram: 100,
      ngram_entropy: 100,
      mattr: 100,
    };
    const gated = scoreTier2(m, 50);
    // ngram: (100 - 100) = 0, mattr: (100 - 100) = 0
    // After redistribution, weights sum to 1.0 across Bayesian/LogRank/Histogram
    // 100 * (0.40 + ?) + 100 * (0.35 + ?) + 100 * (0.20 + ?) = 100
    expect(gated).toBe(100);
  });

  it("no gate when tokenCount >= 100", () => {
    const m = {
      bayesian_features: 80,
      log_rank: 80,
      token_histogram: 80,
      ngram_entropy: 20,
      mattr: 20,
    };
    const s100 = scoreTier2(m, 100);
    const s200 = scoreTier2(m, 200);
    const sInf = scoreTier2(m);
    expect(s100).toBe(s200);
    expect(s100).toBe(sInf);
  });

  it("tokenCount exactly at boundary 99 triggers gate, 100 does not", () => {
    const m = {
      bayesian_features: 50,
      log_rank: 50,
      token_histogram: 50,
      ngram_entropy: 0,
      mattr: 0,
    };
    const at99 = scoreTier2(m, 99);
    const at100 = scoreTier2(m, 100);
    // at99: gate on → ngram/mattr zeroed, redistributed
    // at100: gate off → ngram/mattr contribute
    expect(at99).not.toBe(at100);
  });

  it("returns integer (Math.round)", () => {
    const m = {
      bayesian_features: 33,
      log_rank: 67,
      token_histogram: 45,
      ngram_entropy: 50,
      mattr: 80,
    };
    const score = scoreTier2(m);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("handles all-zero metrics", () => {
    const m = {
      bayesian_features: 0,
      log_rank: 0,
      token_histogram: 0,
      ngram_entropy: 100,
      mattr: 100,
    };
    const score = scoreTier2(m);
    expect(score).toBe(0);
  });

  it("handles all-100 metrics", () => {
    const m = {
      bayesian_features: 100,
      log_rank: 100,
      token_histogram: 100,
      ngram_entropy: 0,
      mattr: 0,
    };
    const score = scoreTier2(m);
    expect(score).toBe(100);
  });
});
