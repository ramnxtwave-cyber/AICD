import { describe, it, expect } from "vitest";
import { computeModeBScore, MODE_B_DEFAULTS } from "./detector.js";

function makeResult(t1Score, t2Score, t3Score, t3Available) {
  return {
    tiers: {
      tier1: { score: t1Score },
      tier2: { score: t2Score },
      tier3: { score: t3Score, available: t3Available },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE_B_DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
describe("MODE_B_DEFAULTS", () => {
  it("has correct default weights", () => {
    expect(MODE_B_DEFAULTS.t1).toBe(0.20);
    expect(MODE_B_DEFAULTS.t2).toBe(0.15);
    expect(MODE_B_DEFAULTS.t3).toBe(0.30);
    expect(MODE_B_DEFAULTS.layer4).toBe(0.35);
  });

  it("weights sum to 1.0", () => {
    const sum = MODE_B_DEFAULTS.t1 + MODE_B_DEFAULTS.t2 + MODE_B_DEFAULTS.t3 + MODE_B_DEFAULTS.layer4;
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeModeBScore
// ─────────────────────────────────────────────────────────────────────────────
describe("computeModeBScore", () => {
  it("uses default weights when none provided", () => {
    const result = makeResult(80, 70, 90, true);
    const score = computeModeBScore(result, 85);
    // 80*0.20 + 70*0.15 + 90*0.30 + 85*0.35 = 16 + 10.5 + 27 + 29.75 = 83.25 → 83
    expect(score).toBe(83);
  });

  it("respects custom weights", () => {
    const result = makeResult(100, 100, 100, true);
    const customW = { t1: 0.25, t2: 0.25, t3: 0.25, layer4: 0.25 };
    const score = computeModeBScore(result, 100, customW);
    expect(score).toBe(100);
  });

  it("all zeros → 0", () => {
    const result = makeResult(0, 0, 0, true);
    expect(computeModeBScore(result, 0)).toBe(0);
  });

  it("all 100s → 100", () => {
    const result = makeResult(100, 100, 100, true);
    expect(computeModeBScore(result, 100)).toBe(100);
  });

  it("clamps to 0 (no negative scores)", () => {
    const result = makeResult(0, 0, 0, true);
    expect(computeModeBScore(result, 0)).toBe(0);
  });

  it("clamps to 100", () => {
    const result = makeResult(100, 100, 100, true);
    expect(computeModeBScore(result, 100)).toBeLessThanOrEqual(100);
  });

  // ── Tier 3 unavailable: redistributes weights ─────────────────────────────
  it("redistributes T3 weight when T3 unavailable", () => {
    const result = makeResult(80, 70, null, false);
    const score = computeModeBScore(result, 90);
    // t3 null → w.t3 = 0, remaining = 0.20 + 0.15 + 0.35 = 0.70
    // scale = 1/0.70 ≈ 1.4286
    // w.t1 = 0.20 * 1.4286 ≈ 0.2857
    // w.t2 = 0.15 * 1.4286 ≈ 0.2143
    // w.layer4 = 0.35 * 1.4286 = 0.5
    // raw = 80 * 0.2857 + 70 * 0.2143 + 0 + 90 * 0.5
    //     = 22.857 + 15.0 + 45.0 = 82.857 → 83
    expect(score).toBe(83);
  });

  it("T3 unavailable with all same scores", () => {
    const result = makeResult(60, 60, null, false);
    const score = computeModeBScore(result, 60);
    // After redistribution, all weights sum to 1.0, all scores = 60 → 60
    expect(score).toBe(60);
  });

  it("T3 unavailable: layer4 gets proportionally more weight", () => {
    const result = makeResult(50, 50, null, false);
    // layer4 = 100, so score should be pulled above 50
    const score = computeModeBScore(result, 100);
    expect(score).toBeGreaterThan(50);
  });

  it("result is always an integer", () => {
    const result = makeResult(33, 67, 45, true);
    const score = computeModeBScore(result, 78);
    expect(Number.isInteger(score)).toBe(true);
  });

  // ── Equal weights scenario ────────────────────────────────────────────────
  it("equal weights give simple average", () => {
    const result = makeResult(40, 60, 80, true);
    const equalW = { t1: 0.25, t2: 0.25, t3: 0.25, layer4: 0.25 };
    const score = computeModeBScore(result, 100, equalW);
    // (40 + 60 + 80 + 100) / 4 = 70
    expect(score).toBe(70);
  });

  // ── Only layer4 matters scenario ──────────────────────────────────────────
  it("100% layer4 weight returns layer4 score", () => {
    const result = makeResult(10, 20, 30, true);
    const w = { t1: 0, t2: 0, t3: 0, layer4: 1.0 };
    expect(computeModeBScore(result, 85, w)).toBe(85);
  });

  // ── Only tier1 matters scenario ───────────────────────────────────────────
  it("100% t1 weight returns tier1 score", () => {
    const result = makeResult(72, 20, 30, true);
    const w = { t1: 1.0, t2: 0, t3: 0, layer4: 0 };
    expect(computeModeBScore(result, 85, w)).toBe(72);
  });
});
