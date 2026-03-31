// ─── Languages ────────────────────────────────────────────────────────────────
export const LANGUAGES = [
  "Python", "JavaScript", "Java", "C++", "C", "C#",
];

// ─── Scan stage labels (shown during analysis animation) ─────────────────────
export const SCAN_STAGES = [
  "Lexical tokenization",
  "Entropy & perplexity analysis",
  "Naming convention scan",
  "Structural pattern match",
  "Comment density & style",
  "Burstiness scoring",
  "LLM fingerprint check",
  "Compiling results",
];

// ─── Verdict thresholds ───────────────────────────────────────────────────────
export const VERDICT_THRESHOLDS = [
  { min: 78, label: "AI Generated",  color: "#d44" },
  { min: 62, label: "Likely AI",     color: "#c07030" },
  { min: 45, label: "Mixed",         color: "#a08020" },
  { min: 30, label: "Likely Human",  color: "#508850" },
  { min:  0, label: "Human Written", color: "#3a9a60" },
];

export function getVerdict(score) {
  return VERDICT_THRESHOLDS.find(t => score >= t.min);
}

// ─── Example snippets ────────────────────────────────────────────────────────
export const EXAMPLES = {
  ai: {
    label: "AI Sample",
    language: "Python",
    code: `def calculate_fibonacci(n):
    """
    Calculate the nth Fibonacci number using dynamic programming.

    Args:
        n: The position in the Fibonacci sequence

    Returns:
        The nth Fibonacci number
    """
    if n <= 0:
        return 0
    elif n == 1:
        return 1

    # Initialize the dp array with base cases
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1

    # Fill the dp array iteratively
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]

def main():
    # Test with various inputs
    test_cases = [0, 1, 5, 10, 20]
    for n in test_cases:
        result = calculate_fibonacci(n)
        print(f"Fibonacci({n}) = {result}")

if __name__ == "__main__":
    main()`,
  },

  human: {
    label: "Human Sample",
    language: "Python",
    code: `def fib(n):
    # quick fib, no need to overthink
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(n-1):
        a, b = b, a+b  # classic swap trick
    return b

# TODO: memoize later if slow
def run_tests():
    vals = [0,1,5,10,20]
    for x in vals:
        print(fib(x))  # just checking

run_tests()`,
  },
};
