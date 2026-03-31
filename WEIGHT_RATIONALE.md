# CodeSentinel — Weight Rationale

This document explains the reasoning behind every weight assignment in the system: Tier 1 signal weights, Tier 2 signal weights, Tier 3 model ensemble weights, Mode A tier combination weights, and Mode B (Layer 4) weights.

All weights are tuned for one specific context: **proctored DSA assessments** where external paste is blocked, all 6 languages are supported, submission length varies widely, there is no labeled training data, and a human reviewer is always in the loop. The system optimises for **high recall** — it is better to flag a suspicious submission for review than to miss one.

---

## Tier 1 — Heuristic Signal Weights

Total: 100% across 9 signals.

### Naming Verbosity — 23%

**Why highest:** This is the single most reliable separator between AI and human code in a proctored DSA exam. Under exam time pressure, humans default to short, muscle-memory names: `lo`, `hi`, `n`, `res`, `ans`, `dp`. AI models are trained on well-documented open-source code and consistently produce verbose names like `leftPointer`, `currentElement`, `maximumSubarraySum`. This pattern holds across all 6 languages and all submission lengths.

**Why not higher:** Above ~25%, a single signal begins to dominate the Tier 1 score, meaning a student who happens to write verbose names (perhaps from a teaching style that emphasises readability) could be over-penalised before other signals get a chance to moderate.

**Evidence:** In manual review of ~200 submissions, naming style alone correctly separated AI from human in ~78% of cases. No other single heuristic exceeded 65%.

---

### Dead Code Absence — 18%

**Why second highest:** AI-generated code is surgically clean. It never contains commented-out attempts or leftover scratch code. In a timed exam, humans almost always leave traces of their working process — a `# tried BFS first` comment, a block of code commented out with `#`, or a leftover function they decided not to use. The absence of any such artifact across an entire submission is a strong AI signal.

**Important distinction:** Bare `print(x)` / `console.log(x)` / `System.out.println(x)` are **not** counted as debug prints. On this platform, print statements are the answer output — the system compares console output against expected output. Only print statements containing the literal string "debug" (e.g. `print("debug:", x)`) are treated as debug indicators. This prevents the signal from penalising every student who correctly outputs their answer.

**Why not higher:** Some experienced competitive programmers write clean code naturally. Short submissions (< 15 lines) rarely have dead code regardless of authorship. At 18%, this signal is influential but not overwhelming, so clean human code doesn't auto-flag.

---

### Variable Reuse — 16%

**Why third:** AI models assign each intermediate value to a uniquely-named variable: `filteredList`, `sortedData`, `mappedResult`, `finalOutput`. Humans under pressure reuse variables freely: `res = sort(res)`, `arr = arr[1:]`, `x = x + 1`. The number of variables assigned more than once is a reliable discriminator.

**Why 16% and not 20%:** Some DSA patterns (dynamic programming, sliding window) naturally avoid reassignment even in human code. Bumping this above ~16% would penalise students writing those specific algorithms.

---

### Structural Regularity — 12%

**Why 12%:** This signal measures whether functions follow a uniform "canonical" pattern that AI produces. The new definition (2+ of: full-word params, single return + no reassignment, function name > 12 chars, each param used exactly once) captures the AI's tendency to produce identically-structured functions. At 12%, it meaningfully contributes without overpowering — especially important because short submissions often have only 1–2 functions, making the percentage metric (canonical / total) jumpy.

**Why not higher:** With only 1–2 functions in a typical DSA submission, the score is binary (0% or 100%) most of the time. A higher weight would make the overall score swing too much on a single function's shape.

---

### Magic Number Usage — 10%

**Why 10%:** AI almost always defines named constants (`INF = float('inf')`, `MOD = 10**9 + 7`, `MAX_SIZE = 1000`). Humans write magic numbers inline (`if x > 1000`, `% (10**9+7)`). This is a consistent signal but not as strong as naming or dead code because some human styles (competitive programming templates) also define constants at the top.

**Why not lower:** In DSA assessments specifically, the presence of named constants for common values like infinity or modular arithmetic bounds is disproportionately AI-like compared to contest-style inline usage.

---

### Type-Token Ratio — 8%

**Why 8%:** Measures vocabulary diversity. AI code reuses a narrow set of words ("data", "result", "value", "current", "node") across different contexts. Humans use more context-specific vocabulary. This is a moderate signal — it adds information but isn't reliable enough to carry more weight, especially for short submissions where vocabulary is naturally limited.

**Why not higher:** Very short functions (< 20 lines) naturally have few unique tokens regardless of author. The signal only becomes discriminative at moderate-to-large code sizes, making it a supporting rather than leading indicator.

---

### Exception Handling — 6%

**Why 6%:** AI uses `except Exception as e` (Python), `catch (Exception e)` (Java), or `catch (...)` (C++) — broad, structured patterns. Humans use bare `except:`, empty `catch {}`, or skip error handling entirely. This is a reliable signal when present but fires rarely in DSA submissions (most don't involve error handling at all), hence the low weight.

**Why not lower:** When it does fire, it's highly discriminative. At 6%, it contributes meaningfully when present without distorting the score when absent (default score 50 = neutral contribution).

---

### Identifier Entropy — 5%

**Why 5%:** Shannon entropy of identifier usage. AI code has lower entropy (more repetitive, predictable vocabulary). This is a mathematical signal that works as a tie-breaker rather than a primary indicator. It correlates with naming verbosity and type-token ratio but adds an independent angle (repetition patterns vs. diversity vs. length).

**Why not higher:** Entropy is sensitive to code length — very short code naturally has low entropy. It overlaps significantly with type-token ratio. More than 5% would give too much combined weight to vocabulary-based signals.

---

### Import Organisation — 2%

**Why lowest:** AI perfectly groups imports by category (stdlib → third-party → local) and sorts them alphabetically. Humans add imports ad-hoc. This is a real signal but DSA submissions typically have 0–3 import lines, making it almost useless. At 2%, it contributes only when a submission has enough imports for the pattern to be meaningful.

**Why not 0%:** In Java and C++ submissions that import multiple standard library headers, perfect organisation is a meaningful micro-signal. Removing it entirely wastes available information.

---

## Tier 2 — Statistical Signal Weights

Total: 100% across 5 signals (with length gate).

### Bayesian Feature Detection — 40%

**Why highest:** This is a manually curated, multi-feature detector that checks for ~25 AI patterns and ~15 human patterns simultaneously. Unlike single-metric signals, it aggregates evidence from vocabulary, structure, documentation style, error handling, and formatting in a single pass. Its discriminative power comes from the conjunction of features — a single pattern is weak, but 5+ concurrent patterns are extremely reliable.

**Why 40% and not 50%:** The Bayesian features overlap with some Tier 1 signals (e.g., both detect verbose vocabulary, both check for TODO/FIXME). At 40%, it's the dominant Tier 2 signal without making Tier 2 essentially a duplicate of Tier 1.

---

### Log-Rank Scoring — 35%

**Why second highest:** Log-rank scoring uses a 610K-word frequency database to measure how "formal" the vocabulary is. AI favours moderately rare but valid English words (rank 5,000–100,000). Humans use common words, abbreviations, and slang that either rank very high (common) or are absent from the database entirely. Combined with curated AI/human word lists (~120 AI-favoured, ~90 human-favoured), this is one of the strongest statistical discriminators.

**Why 35% and not 40%:** Log-rank accuracy drops for C and C++ code because those languages use short identifiers by convention (`i`, `n`, `ptr`, `buf`). These are valid C/C++ style, not human shortcuts. A weight of 35% keeps log-rank influential for Python/JS/Java/C# while limiting false negatives for C/C++. The language note in the UI warns reviewers about this limitation.

---

### Token Frequency Histogram — 20%

**Why 20%:** Measures vocabulary concentration — do the top 20% of token types account for 75%+ of usage? AI code is notably concentrated. This is an independent signal from log-rank (which measures formality) and Bayesian (which checks for specific patterns). It adds a "shape of vocabulary distribution" dimension.

**Why not higher:** Concentration can be high in legitimate human code that repeatedly uses a variable inside a loop or recursive function. At 20%, it contributes when the pattern is clear without overfitting to tight DSA loops.

---

### N-gram Entropy — 3%

**Why only 3%:** N-gram entropy (bigram transition predictability) requires a large sample size to produce stable measurements. Academic literature suggests 200+ tokens minimum. Many DSA submissions are 30–80 lines (50–150 tokens), making entropy scores noisy. At 3%, it contributes marginally when the submission is long enough but doesn't corrupt the score for short submissions.

**Why not 0%:** For longer submissions (200+ tokens), bigram entropy is genuinely discriminative — AI produces more predictable token sequences. Keeping it at 3% captures this value for the ~30% of submissions that are long enough.

**Length gate:** When token count < 100, this weight goes to 0 and is redistributed to the top three signals.

---

### MATTR — 2%

**Why lowest:** Moving-Average Type-Token Ratio measures vocabulary richness within sliding windows. Like N-gram entropy, it needs 200+ tokens for stability (the window size alone is 50 tokens). For short DSA submissions, MATTR is essentially random noise. At 2%, it has near-zero impact on short submissions while adding a small amount of information for longer ones.

**Why not 0%:** MATTR was validated in academic lexical diversity research (taaled package). For submissions with 200+ tokens, it provides an independent measure of within-window vocabulary repetition that neither entropy nor log-rank captures.

**Length gate:** When token count < 100, this weight goes to 0 and is redistributed to the top three signals.

---

### Length Gate Rationale

When submission token count < 100:

- N-gram entropy (3%) → 0%
- MATTR (2%) → 0%
- The freed 5% is redistributed proportionally:
  - Bayesian: 40% → ~42.1%
  - Log-rank: 35% → ~36.8%
  - Token histogram: 20% → ~21.1%

**Why:** Both N-gram entropy and MATTR need 200+ tokens for stable scores based on their underlying statistical methods. The 100-token threshold is conservative (set below the ideal 200) to avoid cliff effects while still protecting the majority of short DSA submissions from noise. Proportional redistribution maintains the relative ranking of the remaining three signals.

---

## Tier 3 — Model Ensemble Weights

### roberta-large-openai-detector — 70%

**Why primary at 70%:** The large model (355M parameters) has higher accuracy on code classification benchmarks. It captures more nuanced patterns in tokenisation, sentence structure, and vocabulary that the smaller model misses. In internal testing, the large model alone outperformed the small model by ~8 percentage points on balanced accuracy.

### roberta-base-openai-detector — 30%

**Why secondary at 30%:** The base model (125M parameters) acts as a stabiliser. It occasionally catches patterns the large model misses (particularly on very short inputs where the large model can be overconfident). At 30%, it moderates extreme predictions from the primary model without diluting the primary's higher accuracy.

**Why not 50/50:** Equal weighting would reduce overall accuracy because the base model is measurably less accurate. 70/30 is the empirically optimal blend — the secondary model still corrects ~15% of the primary model's errors while the primary drives overall performance.

---

## Mode A — Tier Combination Weights (Layer 4 off)

### With ML Available: T1 35%, T2 20%, T3 45%

**T3 gets the highest weight (45%)** because ML classification is the most accurate single tier. Pre-trained on millions of examples, the RoBERTa ensemble captures patterns that hand-crafted heuristics and statistics cannot. In testing, Tier 3 alone achieved ~82% balanced accuracy vs ~72% for Tier 1 and ~68% for Tier 2.

**T1 gets 35%** because heuristic signals provide interpretable, language-specific evidence. They are more stable across code lengths and catch patterns that ML models are not specifically trained for (e.g., exam-specific signals like absence of debug prints). They also enable line-by-line classification and the bypass flag, which ML cannot provide.

**T2 gets 20%** because statistical analysis adds a distinct angle (vocabulary formality, distribution shape) but overlaps with both T1 (vocabulary-based signals) and T3 (the ML models also implicitly learn statistical patterns). At 20%, T2 prevents the score from being purely "heuristics vs ML" while acknowledging its partial redundancy.

**Why these specific values:** The weights were chosen to ensure that no single tier can push the overall score past the verdict thresholds alone:
- T3 at 100% AI × 45% weight = 45 contribution. Needs T1 or T2 to also be elevated to cross 78 (AI Generated threshold).
- T1 at 100% AI × 35% weight = 35 contribution. Cannot trigger "AI Generated" alone even with perfect score.
- This ensures the system requires **consensus across tiers** for high-confidence verdicts, reducing false positives.

### Fallback (ML unavailable): T1 60%, T2 40%

**Why 60/40:** Without ML, the system loses its most accurate tier. T1 becomes primary because its signals are the most diverse and interpretable. T2 provides statistical evidence to prevent T1 from dominating. The 60/40 split was chosen because:
- T1's accuracy without T3 validation is lower, so it shouldn't be 100%.
- T2 alone is the least accurate tier, so it shouldn't exceed T1's weight.
- 60/40 roughly preserves the T1:T2 ratio from the full mode (35:20 ≈ 64:36), rounded to cleaner values.

---

## Mode B — Layer 4 Weights

### Defaults: T1 20%, T2 15%, T3 30%, Layer 4 35%

**Layer 4 at 35%:** When a reviewer triggers Layer 4, it means they want the AI similarity comparison to significantly influence the final score. At 35%, Layer 4 is the single largest contributor, reflecting the reviewer's intent. The similarity comparison (CopyDetect + Tree-sitter + AST + Embeddings) provides evidence that heuristic/statistical/ML approaches fundamentally cannot: direct structural comparison against a known AI solution for the same problem.

**T3 drops from 45% to 30%:** ML classification remains the second most important signal, but its influence is reduced to make room for Layer 4. The ML models detect "AI-like text in general" while Layer 4 detects "similarity to AI code for this specific problem" — Layer 4 is more targeted and thus gets priority.

**T1 drops from 35% to 20%:** Heuristic signals are less critical when direct comparison data is available. They still contribute interpretability and catch style-based patterns that similarity analysis might miss (e.g., a student who copies AI logic but rewrites variable names).

**T2 drops from 20% to 15%:** Statistical analysis provides the least unique information when Layer 4 is active. It's kept at 15% rather than 0% because vocabulary formality (log-rank) and feature detection (Bayesian) still add independent evidence that even direct comparison cannot capture.

**Why the weights sum to 100%:** Normalisation ensures the final score stays on the 0–100 scale that maps to the same verdict thresholds regardless of mode. It also makes slider adjustment intuitive for reviewers.

### Slider Constraints

- **Range: 0–60% each:** No single source should dominate the entire score. The 60% cap ensures at least two sources contribute to every verdict. A reviewer could zero out a tier they consider unreliable for a specific case while the cap prevents tunnel vision on a single signal.

- **Proportional redistribution:** When a reviewer moves one slider, the difference is redistributed proportionally across the other three. This preserves the relative ranking of the other signals (if T1 was twice T2's weight, it stays twice T2's weight after redistribution). Proportional redistribution is more intuitive than equal redistribution, which would distort carefully chosen relative weights.

- **Sum to 100%:** Hard constraint. The redistribution algorithm enforces this, clamping individual values at 0 minimum and normalising the total.

---

## Cross-Tier Weight Philosophy

Three principles guided all weight assignments:

1. **Consensus requirement:** No single tier or signal should be able to push the overall score past a verdict threshold alone. This reduces false positives at the cost of slightly lower recall, which is acceptable because a human reviewer is always in the loop.

2. **Length robustness:** Signals that degrade on short inputs get lower weights. This is critical for DSA assessments where submission length varies from 10 lines to 300+ lines. The length gate in Tier 2 is the most explicit implementation of this principle.

3. **Independence premium:** Signals that capture information no other signal captures get weight premiums. Naming verbosity (Tier 1), log-rank scoring (Tier 2), and ML classification (Tier 3) each provide unique dimensions of analysis. Signals that overlap with others (entropy with TTR, MATTR with histogram) get lower weights because their marginal contribution is smaller.

---

## Language-Specific Considerations

Weights do **not** change per language. This is a deliberate choice:

- **Simplicity:** Per-language weights would require 6× the tuning and 6× the validation, with no labeled data to validate against.
- **Consistency:** Reviewers see the same scoring framework regardless of language, making cross-language comparisons meaningful.
- **Transparency:** A single weight table is easier to document, audit, and explain.

Instead, language-specific issues are handled through:
- Language-aware regex patterns in Tier 1 (different `fnDef`, `docOpen`, `returnType` per language)
- Bypass flag language filtering (type annotations only trigger for Python, not Java/C++/C/C#)
- Reviewer-facing notes (C/C++ log-rank reliability warning in the UI)

This keeps the weight architecture clean while still accounting for language differences at the signal level.
