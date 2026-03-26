# CodeSentinel — How It Works

CodeSentinel is an AI code detector that analyzes source code and determines how likely it is to have been written by an AI (such as ChatGPT, Copilot, or similar tools). It runs three independent layers of analysis — each looking at the code from a completely different angle — and combines their opinions into a single verdict.

Think of it like three expert reviewers, each with a different specialty, independently scoring the same piece of code.

---

## Tier 1 — Pattern-based Heuristics

**Runs in:** Browser (JavaScript)
**Packages used:** None — pure JavaScript, no external dependencies

This tier looks at the style and structure of the code. AI-generated code follows certain predictable patterns that experienced developers rarely produce. It checks 20 signals and weights them based on how strongly each one distinguishes AI from human code.

**How it works:** Each signal produces a score from 0 to 100. The final Tier 1 score is a weighted sum of all signals (weights add up to 1.0). Higher score means more AI-like.

### The 20 Signals

**Naming & vocabulary**

- **Naming verbosity** (weight: 7%) — Measures how descriptive variable and function names are. AI tends to use long, overly formal names like `calculate_optimal_route` or `user_authentication_service`. Humans prefer shorter, pragmatic names like `calc_route` or `auth_svc`. The function extracts all identifiers from the code, measures their average length and underscore count, and scores accordingly.

- **Type-token ratio** (weight: 6%) — Counts how many unique words appear compared to total words. AI code reuses the same vocabulary over and over ("data", "result", "value"), giving it a low type-token ratio. Human code tends to use more varied, context-specific names.

**Documentation patterns**

- **Type annotations** (weight: 10%) — Checks what percentage of functions have type annotations (like `-> int` in Python or `: string` in TypeScript). AI almost always adds types. Humans often skip them, especially in dynamically-typed languages. This is the single strongest AI signal.

- **Docstring coverage** (weight: 9%) — Measures what fraction of classes and functions have docstrings or doc-comments. AI documents nearly everything. Humans are selective. Constructor methods (`__init__`, `constructor`) are excluded from the count since even AI often skips documenting those.

- **Comment absence** (weight: 7%) — Checks how much of the code lacks inline comments. AI rarely leaves inline explanatory comments — it documents functions but not individual lines. Humans scatter TODOs, notes, and quick explanations throughout their code. A high comment absence score signals AI.

**Structure & regularity**

- **Structural regularity** (weight: 6%) — Measures how consistently functions follow a "canonical" pattern. A function counts as canonical if it has a return type annotation OR a docstring (at least one formal structural element). AI code tends to have nearly all functions in canonical form. The score is the percentage of functions that are canonical.

- **Complexity uniformity** (weight: 7%) — Uses cyclomatic complexity (counting branches, loops, conditionals) for each function. AI generates functions that are remarkably similar in complexity. Humans write some simple functions and some complex ones. The score is based on the standard deviation of complexity values — low deviation means AI-like.

- **Halstead uniformity** (weight: 6%) — Measures Halstead volume (a metric combining operator and operand counts) for each function. Like complexity uniformity, AI produces functions with very similar Halstead volumes. The score reflects how uniform these volumes are.
Real-life analogy (don’t skip this 😄)

Imagine two cooks:

👨‍🍳 Cook A (Uniform)
Uses same ingredients repeatedly
Same cooking style
Predictable taste
🤪 Cook B (Non-uniform)
Random spices everywhere
New ingredients every step
Total chaos

👉 Cook A = High uniformity
👉 Cook B = Low uniformity

Same idea in code.

- **Blank line density** (weight: 3%) — AI uses blank lines very consistently (typically one blank line between logical sections). Human code has more irregular spacing — sometimes multiple blank lines, sometimes none.

- **Indent consistency** (weight: 1%) — Checks whether indentation is perfectly uniform throughout the file. AI never mixes tabs and spaces or uses inconsistent indent widths.

**Error handling**

- **Exception handling style** (weight: 5%) — Analyzes how errors are handled. AI prefers structured patterns — specific exception types in `except`/`catch` blocks, plus explicit `raise`/`throw`/`panic` statements. Humans often use bare `except:` or empty `catch {}` blocks. The score is the ratio of structured error handling to total error handling.

- **Error message verbosity** (weight: 4%) — Checks the length and detail of error messages in `raise`, `throw`, and `Error()` calls. AI writes things like `"Invalid input: expected a positive integer, got {x}"`. Humans write `"bad input"` or skip the message entirely. The regex handles f-strings (`f"..."`), raw strings (`r"..."`), and template literals.

- **Guard clause density** (weight: 4%) — Counts how many functions start with early-return validation checks (like `if not x: raise ValueError(...)`). AI almost always adds guard clauses at the top of functions. A function with even one guard clause in the first 8 lines counts as "guarded." The score is based on the fraction of functions that have guards.

**Code cleanliness**

- **Dead code absence** (weight: 5%) — Checks for commented-out code, unused variables, unreachable code after return statements, and pass/noop placeholders. AI-generated code almost never has dead code. Humans leave leftover code all the time.

- **Variable reuse** (weight: 6%) — Measures how often the same variable names appear in different functions. AI tends to reuse generic names (`result`, `data`, `output`) across functions. Humans use more context-specific, one-off names.

- **Magic number usage** (weight: 3%) — AI almost always defines named constants instead of using raw numbers. Humans frequently leave "magic numbers" like `if retries > 3` or `timeout = 30` directly in the code.

**Imports & formatting**

- **Import organisation** (weight: 4%) — Checks whether imports are grouped by category (standard library, then third-party, then local) and alphabetically sorted within groups. AI does this automatically. Humans add imports wherever convenient.

- **String formatting style** (weight: 3%) — Measures consistency in string formatting (f-strings vs .format() vs % formatting in Python, template literals vs concatenation in JavaScript). AI picks one style and sticks to it. Humans mix styles.

**Miscellaneous**

- **Emoji presence** (weight: 1%) — AI-generated code sometimes includes emojis in log messages, comments, or string literals. Human production code almost never does. Weighted very low because most code has no emojis either way.

- **Entropy** (weight: 3%) — Shannon entropy of the character distribution. AI-generated code tends to use a narrower character set more predictably. Inverted so that low entropy produces a high AI score.

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

**N-gram Entropy** (weight: 10%)

How it works: Takes the full code text, runs it through NLTK's `word_tokenize` function, then filters out any token that doesn't start with a letter (removing punctuation, operators, and numbers that would add noise). From the remaining real words, it builds bigrams (pairs of consecutive words) and computes Shannon entropy — a measure of how unpredictable the word sequences are. The entropy is normalized by dividing by `log2(unique_bigram_count)`, which is the theoretical maximum, giving a 0-100 score.

What it detects: AI code produces more predictable word sequences (lower entropy). Human code has more varied, less predictable patterns. However, well-structured human code can also have low entropy, which is why this signal gets a lower weight.

**Log-Rank Scoring** (weight: 30%)

How it works: Combines three sub-signals using the 610,000-word frequency database:

1. *Curated word-list matching* — About 120 words that AI favours ("comprehensive", "initialize", "implement", "validate", "configuration") and about 90 words that humans use ("tmp", "hack", "buggy", "fixme", "workaround"). The smart tokenizer means compound identifiers like `initializeConfiguration` get split and both "initialize" and "configuration" match the AI list.

2. *Dictionary coverage* — Checks what fraction of tokens appear in the 610K word database. AI uses real, properly spelled English words. Human code uses abbreviations, slang, and shorthand (tmp, cfg, buf, ctx) that aren't in any dictionary.

3. *Formality score* — Looks at where the used words fall in the frequency ranking. AI prefers moderately rare but valid English words (rank 5,000 to 100,000 in the frequency list). Humans tend to use either extremely common words or domain-specific jargon that's very rare or absent from general word lists.

These three sub-signals are combined into a single log-rank score. This is one of the two strongest discriminators.

**Token Frequency Histogram** (weight: 20%)

How it works: Uses the smart tokenizer to split all identifiers into their component words, then counts how often each word appears. It measures how concentrated the vocabulary is — do a few tokens dominate, or is usage spread evenly? Inspired by the GLTR (Giant Language Model Test Room) approach.

What it detects: AI tends to reuse the same small set of common tokens ("data", "result", "value", "error", "response") over and over. Human code uses a broader, more varied vocabulary with context-specific terms.

**Moving-Average Type-Token Ratio — MATTR** (weight: 10%)

How it works: Computed using the `taaled` Python package, which is an academically validated lexical diversity measurement tool from the LCR-ADS Lab. MATTR works by sliding a 50-word window across the entire text and computing the type-token ratio (unique words / total words) in each window, then averaging all the window ratios. If taaled fails, a manual sliding-window fallback calculation runs instead.

What it detects: AI-generated code tends to have low lexical diversity within each window — it uses the same words repeatedly even in different parts of the code. Human code shows more variation in vocabulary from section to section. Like n-gram entropy, this signal has limited discriminative power on well-structured code, so it receives a lower weight.

**Bayesian Feature Detection** (weight: 30%)

How it works: Checks for specific structural and stylistic patterns that are statistically associated with AI or human authorship. Each detected pattern adds or subtracts from the score.

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
- **JavaScript/TypeScript**: optional chaining (`?.`), nullish coalescing (`??`), `console.log` left in code
- **Java**: `@Override`/`@SuppressWarnings` annotations, explicit access modifiers on every method
- **Go**: named return values, `defer` cleanup patterns
- **Rust**: lifetime annotations, `unwrap()` calls (human shortcut)
- **C++**: `auto` type inference, smart pointers, RAII patterns

This is the other strongest discriminator alongside log-rank scoring, which is why both share the highest weight.

### Tier 2 Scoring

The final Tier 2 score is a weighted combination: `(inverted_entropy × 0.10) + (log_rank × 0.30) + (token_histogram × 0.20) + (inverted_mattr × 0.10) + (bayesian_features × 0.30)`. The entropy and MATTR scores are inverted because low values in those metrics indicate AI-like patterns.

---

## Tier 3 — Machine Learning Classification

**Runs in:** Python backend (FastAPI server)
**Packages used:**
- **HuggingFace Transformers** — for loading and running pre-trained detection models
- **PyTorch** — deep learning framework that powers the model inference

This is the most powerful tier. It sends the code to the backend server which runs two dedicated AI-detection models built on the RoBERTa architecture (the same family of models used by OpenAI's own text classifier).

### The Models

- **Primary model: `roberta-large-openai-detector`** (355 million parameters) — A large RoBERTa model fine-tuned to distinguish AI-generated text from human-written text. Developed by the OpenAI community. Gets 65% weight in the ensemble.

- **Secondary model: `roberta-base-openai-detector`** (125 million parameters) — A smaller but faster model from the same family. Acts as a stabilizing second opinion. Gets 35% weight in the ensemble.

### How Inference Works

Both models accept a maximum of 512 tokens at a time. For longer code:

1. The code is split into overlapping chunks with a 256-token stride (each chunk overlaps the previous one by 256 tokens to preserve context at boundaries).
2. Each chunk is run through both models independently.
3. Each chunk produces a probability that the text is AI-generated, along with a confidence value.
4. The chunk results are aggregated using confidence-weighted averaging — chunks where the model is more certain get more influence on the final score.

The two models' aggregated scores are then combined (65% primary + 35% secondary) into a single ML score.

### Backend Infrastructure

The backend is a Python API built with FastAPI. It runs PyTorch inference on CPU (no GPU required). Models are downloaded from HuggingFace Hub on first startup and cached locally. The server exposes two endpoints: `/api/health` for checking model readiness, and `/api/analyze` for running the full analysis. It can be run locally during development or deployed to a cloud platform like Railway.

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

The system gracefully degrades — if the ML backend is unreachable, it still gives a meaningful result using the first two tiers alone. If the backend is available but only Tier 2 resources loaded (ML models still downloading), Tier 2 runs on the backend while Tier 3 is skipped.

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

Beyond the overall score, the system classifies each individual line of code as AI-written, human-written, or uncertain. This uses Tier 1 heuristic signals applied at the line level — examining naming patterns, comment style, documentation markers, error message style, and structural regularity on a per-line basis.

String literal contents are stripped before analyzing variable names, so words inside strings (like format specifiers or English phrases) don't get confused with actual code identifiers.

The results are visualized in the code viewer with color-coded highlights and grouped into contiguous sections for easy scanning.

---

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React + Vite | UI, code viewer, score visualization |
| Tier 1 | Pure JavaScript | Heuristic pattern analysis (no dependencies) |
| Tier 2 (backend) | Python, NLTK, taaled | Statistical analysis with proper NLP tools |
| Tier 2 (fallback) | JavaScript | Lighter statistical analysis in-browser |
| Tier 3 | Python, HuggingFace Transformers, PyTorch | Neural network inference |
| Backend API | FastAPI, Uvicorn | REST API serving Tier 2 + Tier 3 |
| Word database | harshnative/words-dataset (610K words) | Frequency rankings for log-rank scoring |

---

## What This Achieves

- **Multi-angle detection** — No single method reliably catches AI code. By combining style analysis, statistical fingerprinting, and neural classification, the system is much harder to fool than any single approach.
- **Graceful degradation** — Works without the ML backend (Tier 1 + 2 only), works without internet, works on any language. The ML tier adds accuracy when available but isn't required.
- **Transparency** — Every score is broken down by tier, and every tier shows its individual metrics. Users can see exactly why the system reached its conclusion.
- **Language support** — Heuristics are tuned for 7 languages (Python, JavaScript, TypeScript, Java, Go, Rust, C++) with specific patterns. Statistical and ML tiers work on any text.
- **Line-level granularity** — Not just "this file is AI-generated" but "these specific sections look AI-generated." Useful for reviewing code that mixes human and AI contributions.
