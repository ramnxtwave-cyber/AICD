# CodeSentinel — How It Works

CodeSentinel is an AI code detector that analyzes source code and determines how likely it is to have been written by an AI (such as ChatGPT, Copilot, or similar tools). It runs three independent layers of analysis — each looking at the code from a completely different angle — and combines their opinions into a single verdict. An optional Layer 4 can be triggered by a reviewer to compare the submission against an AI-generated reference solution.

Think of it like three expert reviewers, each with a different specialty, independently scoring the same piece of code — with a fourth reviewer available on demand.

---

## Tier 1 — Pattern-based Heuristics

**Runs in:** Browser (JavaScript)
**Packages used:** None — pure JavaScript, no external dependencies
**Context:** Tuned for proctored DSA/coding assessments where external paste is blocked and code is typed directly in the editor under time pressure.

This tier looks at the style and structure of the code. AI-generated code follows certain predictable patterns that experienced developers rarely produce. It scores 9 active signals and runs a separate bypass flag check for rare high-confidence markers.

**How it works:** Each signal produces a score from 0 to 100. The final Tier 1 score is a weighted sum of the 9 active signals (weights add up to 1.0). Higher score means more AI-like. A separate bypass flag runs outside the scoring pipeline to catch rare but near-certain AI markers.

### Bypass Flag (outside the scoring pipeline)

In a proctored DSA exam, type annotations, docstrings, and emojis are near-impossible to type naturally under time pressure. Including them in the weighted score would overfit to the <2% of submissions that contain them, diluting accuracy for the other 98%. Instead, they trigger a high-confidence flag for immediate reviewer attention.

**Triggers if ANY of the following are detected:**

- **Type annotations** — e.g. `-> int`, `: str`, `: List[int]` (Python only — statically-typed languages like Java/C++/C/C# require type declarations by syntax, so they don't trigger the bypass)
- **Docstrings** — triple-quoted string immediately after a `def`/`class` (Python), `/**` JSDoc/Javadoc/Doxygen blocks (JavaScript/Java/C++), `///` XML doc-comments (C#)
- **Emoji** — any emoji character anywhere in the code

**When triggered:**

- The weighted Tier 1 score is NOT modified
- A separate `bypass_confidence` of 0.92 is set (high confidence, not 1.0 — allows for edge cases like a student who habitually annotates types)
- Surfaced to the reviewer as: "Structural AI markers detected — immediate review recommended"
- The normal score runs in parallel so the reviewer sees both

### The 9 Active Scoring Signals

**Naming & vocabulary**

- **Naming verbosity** (weight: 28%) — The strongest signal. Measures how descriptive variable and function names are. AI tends to use long, overly formal names like `leftPointer` or `currentElement`. Humans under exam pressure use shorter, pragmatic names like `lo`, `hi`, `res`. The function extracts all identifiers, filters out keywords and stdlib names, and scores based on the ratio of verbose identifiers (length > 9, or contains underscore and length > 6).

- **Variable reuse** (weight: 19%) — Measures how often the same variable names are reassigned. AI reuses generic names (`result`, `temp`, `current`) — each intermediate value gets a fresh named variable. Humans use context-specific throwaway names and reassign variables freely.

**Structure & regularity**

- **Structural regularity** (weight: 12%) — Measures how many functions exhibit an AI-like "canonical" pattern. A function is classified as canonical if it meets 2 or more of the following 4 criteria: (a) all parameter names are full English words (length >= 4, no abbreviations like `lo`, `hi`, `ptr`, `idx`); (b) single return statement with no intermediate variable reassignment (also catches compound assignments like `+=` and increment/decrement operators); (c) function name is longer than 12 characters; (d) every parameter has a corresponding variable used exactly once before return. The score is the percentage of functions that are canonical.

**Code cleanliness**

- **Dead code absence** (weight: 10%) — Checks for commented-out code blocks only (lines that look like real code but are commented out, e.g. `# return old_result`, `// if (x > 0)`). AI-generated code is surgically clean — never has dead code. A student trying a brute force approach, commenting it out, then writing the optimised solution is a strong human fingerprint. No debug-print detection — on this platform `print()` / `console.log()` / `System.out.println()` are how students produce output, so every submission has them.

- **Magic number usage** (weight: 10%) — AI almost always defines named constants (e.g. `INF = float('inf')`). Humans write magic numbers inline (e.g. `if retries > 3`). The score checks for named constant declarations (`UPPER_CASE = ...`) vs raw numeric literals.

- **Type-token ratio** (weight: 8%) — Counts how many unique words appear compared to total words. AI code reuses the same vocabulary over and over ("data", "result", "value"), giving it a low type-token ratio. Human code tends to use more varied, context-specific names. Score is inverted so low TTR produces a high AI score.

**Error handling**

- **Exception handling style** (weight: 6%) — Analyzes how errors are handled. AI prefers structured patterns — specific exception types in `except`/`catch` blocks, plus explicit `raise`/`throw`/`panic` statements. Humans often use bare `except:` or empty `catch {}` blocks.

**Entropy & imports**

- **Identifier entropy** (weight: 5%) — Shannon entropy of identifier usage. AI-generated code tends to use a narrower, more repetitive vocabulary. Inverted so that low entropy produces a high AI score.

- **Import organisation** (weight: 2%) — Checks whether imports are grouped by category and sorted. AI does this automatically. Humans add imports wherever convenient. Weighted low because DSA submissions rarely have enough imports for this to matter.

### Signals Removed from Scoring

These signals are still computed for diagnostic purposes but no longer affect the weighted score:

| Signal                  | Why Removed                                                     |
| ----------------------- | --------------------------------------------------------------- |
| Inline comment absence  | Commenting style is personal preference, not an AI signal       |
| Guard clause density    | Humans also write guard clauses — not discriminative            |
| Complexity uniformity   | Not stable across different code sizes and languages            |
| Type annotations        | Moved to bypass flag — too rare in exams to weight              |
| Docstring coverage      | Moved to bypass flag — same reasoning                           |
| Halstead uniformity     | Too noisy on short DSA functions                                |
| String formatting style | DSA solutions rarely use complex strings                        |
| Blank line density      | Meaningless at DSA scale                                        |
| Indent consistency      | Editor auto-formats — zero signal                               |
| Emoji presence          | Moved to bypass flag                                            |
| Error message verbosity | Too sparse in DSA code to be reliable                           |

### Line-by-Line Classification

Beyond the overall score, Tier 1 also classifies each individual line as AI-written, human-written, or uncertain. It strips string literal contents first (so format specifiers like `%s` inside logging strings don't get misread as variable names), then checks for signals like verbose naming, doc-comment patterns, casual markers (TODO, FIXME, hack), type annotations, error message style, and emoji usage. Each line gets a status and confidence score based on the ratio of AI signals to human signals found on that line.

---

## Tier 2 — Statistical Analysis

**Runs in:** Python backend (FastAPI server), with a lighter JavaScript fallback in the browser if the backend is unavailable
**Packages used:**

- **NLTK** — for word tokenization in n-gram entropy calculation
- **taaled** — for academically validated Moving-Average Type-Token Ratio (MATTR)
- **610K word-frequency database** from [harshnative/words-dataset](https://github.com/harshnative/words-dataset) — for log-rank scoring and dictionary coverage

This tier applies statistical techniques to measure how predictable and uniform the writing is. AI-generated text has measurable statistical fingerprints that differ from human writing.

### Smart Code Tokenizer

Before any analysis begins, a custom tokenizer breaks compound identifiers apart. `calculateOptimalRoute` becomes `["calculate", "optimal", "route"]` and `get_user_by_id` becomes `["get", "user", "by", "id"]`. It handles camelCase, snake_case, and SCREAMING_CASE. This lets every technique below analyze actual vocabulary choices instead of opaque identifier strings.

### The 5 Techniques

**Bayesian Feature Detection** (weight: 40%)

The strongest discriminator. Checks for specific structural and stylistic patterns statistically associated with AI or human authorship. Each detected pattern adds or subtracts from the score.

Universal signals (any language):

- Formal vocabulary density (words like "utilize", "implement", "comprehensive")
- Step-numbered comments ("Step 1:", "Phase 2:")
- Error message verbosity (long, descriptive error strings)
- TODO/FIXME/hack markers (human signal)
- Abbreviated variable names under 3 characters (human signal)
- Debug print statements left in code (human signal)
- Commented-out code blocks (human signal)

Language-specific signals:

- **Python**: f-string usage, `__all__` exports, `@staticmethod`/`@classmethod` decorators, walrus operator
- **JavaScript**: optional chaining (`?.`), nullish coalescing (`??`), `console.log` left in code
- **Java**: `@Override`/`@SuppressWarnings` annotations, explicit access modifiers on every method
- **C++**: `auto` type inference, smart pointers, RAII patterns
- **C**: `malloc`/`free` patterns, pointer arithmetic style
- **C#**: LINQ expressions, `async`/`await` patterns, `var` vs explicit types

**Log-Rank Scoring** (weight: 35%)

The second strongest discriminator. Combines three sub-signals using the 610,000-word frequency database:

1. _Curated word-list matching_ — About 120 words that AI favours ("comprehensive", "initialize", "implement", "validate", "configuration") and about 90 words that humans use ("tmp", "hack", "buggy", "fixme", "workaround"). The smart tokenizer means compound identifiers like `initializeConfiguration` get split and both "initialize" and "configuration" match the AI list.

2. _Dictionary coverage_ — Checks what fraction of tokens appear in the 610K word database. AI uses real, properly spelled English words. Human code uses abbreviations, slang, and shorthand (tmp, cfg, buf, ctx) that aren't in any dictionary.

3. _Formality score_ — Looks at where the used words fall in the frequency ranking. AI prefers moderately rare but valid English words (rank 5,000 to 100,000 in the frequency list). Humans tend to use either extremely common words or domain-specific jargon that's very rare or absent from general word lists.

**Token Frequency Histogram** (weight: 20%)

Uses the smart tokenizer to split all identifiers into their component words, then counts how often each word appears. It measures how concentrated the vocabulary is — do a few tokens dominate, or is usage spread evenly? Inspired by the GLTR (Giant Language Model Test Room) approach. AI tends to reuse the same small set of common tokens ("data", "result", "value", "error", "response") over and over. Human code uses a broader, more varied vocabulary with context-specific terms.

**N-gram Entropy** (weight: 3%)

Takes the full code text, tokenizes it, builds bigrams (pairs of consecutive words) and computes Shannon entropy — a measure of how unpredictable the word sequences are. AI code produces more predictable word sequences (lower entropy). Weight is low because this signal needs 200+ tokens for stable scores; short DSA submissions produce noise.

**Moving-Average Type-Token Ratio — MATTR** (weight: 2%)

Computed using the `taaled` Python package, which is an academically validated lexical diversity measurement tool. MATTR works by sliding a 50-word window across the entire text and computing the type-token ratio (unique words / total words) in each window, then averaging all the window ratios. Weight is low because this signal also needs 200+ tokens for stability.

### Length Gate

If the submission has fewer than 100 tokens, N-gram entropy and MATTR weights are set to 0 and their combined 5% is redistributed proportionally across the remaining three signals (Bayesian, Log-rank, Token histogram). Both N-gram and MATTR need 200+ tokens for stable scores; short DSA submissions produce noise without this gate.

### Tier 2 Scoring

The final Tier 2 score is a weighted combination: `(bayesian_features x 0.40) + (log_rank x 0.35) + (token_histogram x 0.20) + (inverted_ngram_entropy x 0.03) + (inverted_mattr x 0.02)`. The entropy and MATTR scores are inverted because low values in those metrics indicate AI-like patterns.

### Language Note

Weights do not change per language. The detected language is passed to the reviewer UI alongside the Tier 2 score. C/C++ submissions may produce less reliable Tier 2 scores because short identifiers by convention skew log-rank toward false human scores.

---

## Tier 3 — Machine Learning Classification

**Runs in:** Python backend (FastAPI server)
**Packages used:**

- **HuggingFace Transformers** — for loading and running pre-trained detection models
- **PyTorch** — deep learning framework that powers the model inference

This is the most powerful tier. It sends the code to the backend server which runs two dedicated AI-detection models built on the RoBERTa architecture (the same family of models used by OpenAI's own text classifier).

### The Models

- **Primary model: `roberta-large-openai-detector`** (355 million parameters) — A large RoBERTa model fine-tuned to distinguish AI-generated text from human-written text. Developed by the OpenAI community. Gets **70%** weight in the ensemble.

- **Secondary model: `roberta-base-openai-detector`** (125 million parameters) — A smaller but faster model from the same family. Acts as a stabilizing second opinion. Gets **30%** weight in the ensemble.

### How Inference Works

Both models accept a maximum of 512 tokens at a time. For longer code:

1. The code is split into overlapping chunks with a 256-token stride (each chunk overlaps the previous one by 256 tokens to preserve context at boundaries).
2. Each chunk is run through both models independently.
3. Each chunk produces a probability that the text is AI-generated, along with a confidence value.
4. The chunk results are aggregated using confidence-weighted averaging — chunks where the model is more certain get more influence on the final score.

The two models' aggregated scores are then combined (70% primary + 30% secondary) into a single ML score.

### Backend Infrastructure

The backend is a Python API built with FastAPI. It runs PyTorch inference on CPU (no GPU required). Models are downloaded from HuggingFace Hub on first startup and cached locally. The server exposes two endpoints: `/api/health` for checking model readiness, and `/api/analyze` for running the full analysis. It can be run locally during development or deployed to a cloud platform like Railway.

---

## How the Scores Combine

### Mode A (default — Layer 4 off)

The three tier scores are combined into a single overall score using a weighted average:

**When ML is available:**

| Tier                 | Weight |
| -------------------- | ------ |
| Tier 1 — Heuristics  | 35%    |
| Tier 2 — Statistical | 20%    |
| Tier 3 — ML          | 45%    |

**When ML is unavailable (backend down or disabled):**

| Tier                 | Weight |
| -------------------- | ------ |
| Tier 1 — Heuristics  | 60%    |
| Tier 2 — Statistical | 40%    |

The system gracefully degrades — if the ML backend is unreachable, it still gives a meaningful result using the first two tiers alone.

### Mode B (Layer 4 on — reviewer-triggered)

When a reviewer triggers Layer 4, all four scores are combined:

| Source               | Default Weight |
| -------------------- | -------------- |
| Tier 1 — Heuristics  | 20%            |
| Tier 2 — Statistical | 15%            |
| Tier 3 — ML          | 30%            |
| Layer 4 — Similarity | 35%            |

The reviewer can adjust each weight using sliders (range 0–60% each, must sum to 100%). When one slider moves, the difference is redistributed proportionally across the other three. A "Reset to defaults" button restores the values above.

---

## Layer 4 — AI Similarity Check (optional, reviewer-triggered)

**Triggered by:** Reviewer clicking the "Layer 4" button on a submission
**Requires:** Question ID, OpenAI API key (for GPT-4 reference generation if not already cached)

This optional layer compares the student's submission against an AI-generated reference solution for the same problem.

### Flow

1. Reviewer clicks the Layer 4 button
2. The system checks if a GPT-4 reference solution already exists for this question (caching is already implemented)
3. If no cached solution exists, GPT-4 generates one and caches it
4. The existing comparison tool runs CopyDetect + Tree-sitter + AST + Embeddings analysis (treated as a black box)
5. Returns a single `layer4_score` (0–100) representing similarity to the AI reference solution
6. The score is combined with Tier 1–3 scores using Mode B weights

### Score Label

The Layer 4 score is displayed as:

> **Similarity to GPT-4 reference solution: {score}%**
> Compares token patterns, code structure, and logical approach against an AI-generated solution for this problem.

This is a similarity score, not a plagiarism score.

---

## The Verdict

The combined score (Mode A or Mode B) maps to a human-readable verdict:

| Score Range | Verdict       |
| ----------- | ------------- |
| 78-100      | AI Generated  |
| 62-77       | Likely AI     |
| 45-61       | Mixed         |
| 30-44       | Likely Human  |
| 0-29        | Human Written |

---

## Line-by-Line Analysis

Beyond the overall score, the system classifies each individual line of code as AI-written, human-written, or uncertain. This uses Tier 1 heuristic signals applied at the line level — examining naming patterns, comment style, documentation markers, error message style, and structural regularity on a per-line basis.

String literal contents are stripped before analyzing variable names, so words inside strings (like format specifiers or English phrases) don't get confused with actual code identifiers.

The results are visualized in the code viewer with color-coded highlights and grouped into contiguous sections for easy scanning.

---

## Technology Stack Summary

| Component         | Technology                                | Purpose                                      |
| ----------------- | ----------------------------------------- | -------------------------------------------- |
| Frontend          | React + Vite                              | UI, code viewer, score visualization         |
| Tier 1            | Pure JavaScript                           | Heuristic pattern analysis (no dependencies) |
| Tier 2 (backend)  | Python, NLTK, taaled                      | Statistical analysis with proper NLP tools   |
| Tier 2 (fallback) | JavaScript                                | Lighter statistical analysis in-browser      |
| Tier 3            | Python, HuggingFace Transformers, PyTorch | Neural network inference                     |
| Layer 4           | CopyDetect, Tree-sitter, AST, Embeddings  | AI similarity comparison                     |
| Backend API       | FastAPI, Uvicorn                          | REST API serving Tier 2 + Tier 3             |
| Word database     | harshnative/words-dataset (610K words)    | Frequency rankings for log-rank scoring      |

---

## What This Achieves

- **Multi-angle detection** — No single method reliably catches AI code. By combining style analysis, statistical fingerprinting, neural classification, and optional AI similarity comparison, the system is much harder to fool than any single approach.
- **Graceful degradation** — Works without the ML backend (Tier 1 + 2 only), works without internet, works on any language. The ML tier adds accuracy when available but isn't required. Layer 4 is optional and reviewer-triggered.
- **Transparency** — Every score is broken down by tier, and every tier shows its individual metrics. Users can see exactly why the system reached its conclusion.
- **Reviewer control** — Mode B sliders let reviewers adjust tier weights based on their domain knowledge. The human reviewer is always in the loop.
- **Language support** — Heuristics are tuned for 6 languages (Python, JavaScript, Java, C++, C, C#) with specific patterns. Statistical and ML tiers work on any text. C/C++ reliability notes are surfaced to reviewers.
- **Line-level granularity** — Not just "this file is AI-generated" but "these specific sections look AI-generated." Useful for reviewing code that mixes human and AI contributions.
