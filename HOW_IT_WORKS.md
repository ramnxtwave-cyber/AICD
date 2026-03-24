# CodeSentinel — How It Works

CodeSentinel is an AI code detector that analyzes source code and determines how likely it is to have been written by an AI (such as ChatGPT, Copilot, or similar tools). It does this by running three independent layers of analysis — each looking at the code from a completely different angle — and then combining their opinions into a single verdict.

Think of it like three expert reviewers, each with a different specialty, independently scoring the same piece of code.

---

## The Three Tiers

### Tier 1 — Pattern-based Heuristics

This tier looks at the **style and structure** of the code. AI-generated code tends to follow certain predictable patterns that experienced developers rarely produce. This tier checks for 19 different signals, including:

- **Naming habits** — AI tends to use long, overly descriptive variable and function names. Humans are more likely to use abbreviations, shorthand, or domain-specific names.
- **Documentation density** — AI almost always adds docstrings and type annotations to every function. Human code is often less consistently documented.
- **Comment style** — AI rarely leaves inline comments, TODO markers, or debugging notes. Humans do this all the time.
- **Error handling patterns** — AI tends to write broad, catch-all exception handlers with verbose, formal error messages. Human error handling is usually more targeted and casual.
- **Code regularity** — AI produces functions that are remarkably similar in length, complexity, and structure. Human code is more uneven.
- **Guard clauses** — AI frequently starts functions with early-return validation checks in a uniform pattern.
- **Import organization** — AI neatly groups and sorts imports. Humans tend to add imports as they go.
- **Magic numbers** — AI assigns meaningful constant names to nearly every number. Humans often leave raw numbers in place.

This tier is **language-aware** — it understands the conventions and syntax of Python, JavaScript, TypeScript, Java, Go, Rust, and C++, and applies language-specific checks accordingly. Other languages fall back to general-purpose patterns.

The output is a score from 0 to 100, where higher means more AI-like.

---

### Tier 2 — Statistical Analysis

This tier treats the code as **text** and applies statistical techniques to measure how predictable and uniform the writing is. AI-generated text has measurable statistical fingerprints that differ from human writing.

The techniques used:

- **N-gram entropy** — Measures how predictable sequences of tokens are. AI code tends to produce lower entropy (more predictable patterns) because language models optimize for the most likely next token.
- **Log-rank scoring** — Compares the code's vocabulary against two curated word lists: roughly 120 words that AI tends to favor (like "comprehensive", "robust", "utilize", "implementation") and 80 words that humans use more often (like "hack", "workaround", "kludge", "crap"). The balance between these drives the score.
- **Token frequency histogram** — Inspired by the GLTR method from MIT/Harvard. Measures how concentrated the vocabulary is. AI tends to reuse the same small set of common tokens, while humans use a broader, more varied vocabulary.
- **Moving-average type-token ratio (MATTR)** — A sliding-window measure of vocabulary diversity. Low diversity across windows is a sign of AI generation.
- **Bayesian feature detection** — Checks for specific patterns that are statistically associated with AI, such as JSDoc-style documentation blocks, trailing commas, step-numbered comments ("Step 1:", "Step 2:"), and overly formal error messages.

The output is a score from 0 to 100, where higher means more AI-like.

---

### Tier 3 — Machine Learning Classification

This is the most powerful tier. It sends the code to a backend server that runs two dedicated AI-detection models, both built on the RoBERTa architecture (the same family of models used by OpenAI's own detector):

- **Primary model** — `roberta-large-openai-detector` (355 million parameters). A large RoBERTa model trained to distinguish between AI-generated and human-written text.
- **Secondary model** — `roberta-base-openai-detector` (125 million parameters). A smaller but faster baseline model from the same family.

Both models have a 512-token input window. For longer code, the system splits the input into overlapping chunks (256-token stride), runs each chunk through both models, and aggregates the results using confidence-weighted averaging.

The two models' scores are then ensembled together — the primary model gets 65% weight and the secondary gets 35% — to produce a more robust final ML score.

The backend is a Python API built with FastAPI, running PyTorch inference. It can be run locally or deployed to a cloud platform like Railway.

The output is a score from 0 to 100, where higher means more AI-like.

---

## How the Scores Combine

The three tier scores are combined into a single overall score using a weighted average:

**When ML is available:**
| Tier | Weight |
|------|--------|
| Tier 1 — Heuristics | 40% |
| Tier 2 — Statistical | 30% |
| Tier 3 — ML | 30% |

**When ML is unavailable (backend down or disabled):**
| Tier | Weight |
|------|--------|
| Tier 1 — Heuristics | 57% |
| Tier 2 — Statistical | 43% |

The system gracefully degrades — if the ML backend is unreachable, it still gives a meaningful result using the first two tiers alone.

---

## The Verdict

The combined score maps to a human-readable verdict:

| Score Range | Verdict |
|-------------|---------|
| 78–100 | AI Generated |
| 62–77 | Likely AI |
| 45–61 | Mixed |
| 30–44 | Likely Human |
| 0–29 | Human Written |

---

## Line-by-Line Analysis

Beyond the overall score, the system also classifies **each individual line** of code as AI-written, human-written, or uncertain. This uses the Tier 1 heuristic signals applied at the line level, looking at things like naming patterns, comment style, and structural regularity on a per-line basis.

The results are visualized in the code viewer with color-coded highlights and grouped into contiguous sections for easy scanning.

---

## What This Achieves

- **Multi-angle detection** — No single method can reliably catch AI code. By combining style analysis, statistical fingerprinting, and neural classification, the system is much harder to fool than any single approach.
- **Graceful degradation** — Works without the ML backend (Tier 1 + 2 only), works without internet, works on any language. The ML tier adds accuracy when available but isn't required.
- **Transparency** — Every score is broken down by tier, and every tier shows its individual metrics. Users can see exactly why the system reached its conclusion.
- **Language support** — Heuristics are tuned for 7 languages with specific patterns, and the statistical and ML tiers work on any text, so any programming language can be analyzed.
- **Line-level granularity** — Not just "this file is AI-generated" but "these specific sections look AI-generated." Useful for reviewing code that mixes human and AI contributions.
