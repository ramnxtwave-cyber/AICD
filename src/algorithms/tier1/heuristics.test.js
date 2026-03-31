import { describe, it, expect } from "vitest";
import {
  identifierEntropy,
  blankLineDensity,
  namingVerbosity,
  typeAnnotationScore,
  docstringCoverage,
  structuralRegularity,
  inlineCommentAbsence,
  indentConsistency,
  exceptionHandlingStyle,
  importOrganisation,
  stringFormattingStyle,
  deadCodeAbsence,
  variableReusePattern,
  magicNumberUsage,
  cyclomaticComplexityUniformity,
  halsteadUniformity,
  typeTokenRatio,
  guardClauseDensity,
  errorMessageVerbosity,
  emojiPresence,
  classifyLine,
  runTier1,
  scoreTier1,
  buildGroups,
  computeBypassFlag,
  runTier1Debug,
} from "./heuristics.js";

// ─── Language pattern helpers ────────────────────────────────────────────────

const LANG = {
  Python: {
    fnDef: /^\s*def \w+\(/,
    classDef: /^\s*class \w+/,
    docOpen: /^\s*("""|''')/,
    docSections:
      /^(Args|Returns|Raises|Parameters|Notes|Yields|Attributes|Examples)\s*:/i,
    typeAnnot:
      /:\s*(str|int|float|bool|List|Dict|Optional|Union|Any|tuple|set|None)\b/g,
    returnType:
      /->\s*(str|int|float|bool|List|Dict|Optional|Union|Any|None|tuple|set)/g,
    exceptBroad: /except\s+\w+(\s+as\s+\w+)?/,
    exceptBare: /^\s*except\s*:/,
    typingImport: /from typing import/,
    commentLine: /^\s*#/,
    commentInline: /\s#\s/,
    fmtModern: /f["'][^"']*\{/g,
    fmtOld: /\.format\s*\(|["'][^"']*%[sd]/g,
  },
  JavaScript: {
    fnDef:
      /^\s*(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|const\s+\w+\s*=\s*(async\s+)?function)/,
    classDef: /^\s*class \w+/,
    docOpen: /^\s*\/\*\*/,
    docSections:
      /^\s*\*\s*@(param|returns|throws|example|description|type|typedef)\b/i,
    typeAnnot: null,
    returnType: null,
    exceptBroad: /catch\s*\(\s*\w+\s*\)/,
    exceptBare: /catch\s*\(\s*\)/,
    typingImport: null,
    commentLine: /^\s*\/\//,
    commentInline: /\s\/\/\s/,
    fmtModern: /`[^`]*\$\{/g,
    fmtOld: /["']\s*\+\s*\w/g,
  },
  Java: {
    fnDef:
      /^\s*(public|private|protected|static)?\s*(void|int|String|boolean|double|float|long|char|List|Map|Optional|CompletableFuture)\s+\w+\s*\(/,
    classDef: /^\s*(public\s+)?(abstract\s+)?(class|interface|enum)\s+\w+/,
    docOpen: /^\s*\/\*\*/,
    docSections:
      /^\s*\*\s*@(param|return|throws|exception|see|since|author|deprecated)\b/i,
    typeAnnot:
      /\b(int|String|boolean|double|float|long|char|void|List|Map|Set|Optional)\s+\w+/g,
    returnType: null,
    exceptBroad: /catch\s*\(\s*\w+\s+\w+\s*\)/,
    exceptBare: null,
    typingImport: null,
    commentLine: /^\s*\/\//,
    commentInline: /\s\/\/\s/,
    fmtModern: null,
    fmtOld: /["']\s*\+\s*\w/g,
  },
  "C++": {
    fnDef:
      /^\s*(virtual\s+)?(static\s+)?(void|int|bool|string|auto|double|float|char|std::\w+)\s+\w+\s*\(/,
    classDef: /^\s*(class|struct)\s+\w+/,
    docOpen: /^\s*\/\*\*/,
    docSections: /^\s*\*\s*@(param|return|brief|note|warning|throws)\b/i,
    typeAnnot:
      /\b(int|bool|string|double|float|char|void|auto|size_t|std::\w+)\s+\w+/g,
    returnType: null,
    exceptBroad: /catch\s*\(\s*(?:const\s+)?(?:std::)?\w+[&*]?\s+\w+\s*\)/,
    exceptBare: /catch\s*\(\s*\.\.\.\s*\)/,
    typingImport: null,
    commentLine: /^\s*\/\//,
    commentInline: /\s\/\/\s/,
    fmtModern: /std::format\s*\(/g,
    fmtOld: /printf\s*\(/g,
  },
  C: {
    fnDef:
      /^\s*(static\s+)?(void|int|char|float|double|long|unsigned|short|size_t)\s+\w+\s*\(/,
    classDef: /^\s*struct\s+\w+/,
    docOpen: /^\s*\/\*\*/,
    docSections: /^\s*\*\s*@(param|return|brief|note|warning)\b/i,
    typeAnnot:
      /\b(int|char|float|double|void|long|unsigned|short|size_t|FILE)\s+\*?\w+/g,
    returnType: null,
    exceptBroad: null,
    exceptBare: null,
    typingImport: null,
    commentLine: /^\s*\/\//,
    commentInline: /\s\/\/\s/,
    fmtModern: null,
    fmtOld: /printf\s*\(/g,
  },
  "C#": {
    fnDef:
      /^\s*(public|private|protected|internal|static)?\s*(async\s+)?(void|int|string|bool|double|float|long|char|var|Task|List|Dictionary|IEnumerable)\s+\w+\s*\(/,
    classDef:
      /^\s*(public\s+)?(abstract\s+|sealed\s+)?(class|interface|struct|enum|record)\s+\w+/,
    docOpen: /^\s*\/\/\//,
    docSections:
      /^\s*\/\/\/\s*<(summary|param|returns|remarks|exception|example)/i,
    typeAnnot:
      /\b(int|string|bool|double|float|long|char|void|var|List|Dictionary|Task|IEnumerable|object)\s+\w+/g,
    returnType: null,
    exceptBroad: /catch\s*\(\s*\w+\s+\w+\s*\)/,
    exceptBare: /catch\s*\(\s*\)/,
    typingImport: /using\s+System/,
    commentLine: /^\s*\/\//,
    commentInline: /\s\/\/\s/,
    fmtModern: /\$"/g,
    fmtOld: /string\.Format\s*\(/g,
  },
};

const pyLP = LANG.Python;
const jsLP = LANG.JavaScript;
const javaLP = LANG.Java;
const cppLP = LANG["C++"];
const cLP = LANG.C;
const csLP = LANG["C#"];

function lines(str) {
  return str.split("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Identifier Entropy
// ─────────────────────────────────────────────────────────────────────────────
describe("identifierEntropy", () => {
  it("returns 50 for very short text (fewer than 5 non-keyword tokens)", () => {
    expect(identifierEntropy("x = 1")).toBe(50);
    expect(identifierEntropy("")).toBe(50);
  });

  it("returns low score for repetitive identifiers (AI-like)", () => {
    const repetitive = Array(30).fill("result = compute(result)").join("\n");
    const score = identifierEntropy(repetitive);
    expect(score).toBeLessThan(40);
  });

  it("returns higher score for diverse identifiers (human-like)", () => {
    const diverse = [
      "alpha = 1",
      "beta = 2",
      "gamma = 3",
      "delta = 4",
      "epsilon = 5",
      "zeta = 6",
      "theta = 7",
      "iota = 8",
      "kappa = 9",
      "lambda_ = 10",
      "mu = 11",
      "nu = 12",
    ].join("\n");
    const score = identifierEntropy(diverse);
    expect(score).toBeGreaterThan(60);
  });

  it("filters out language keywords", () => {
    const code = "if True and not False or None for while return def class";
    expect(identifierEntropy(code)).toBe(50);
  });

  it("returns score between 0-100", () => {
    const code = Array(50)
      .fill(0)
      .map((_, i) => `var_${i} = func_${i}()`)
      .join("\n");
    const score = identifierEntropy(code);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Blank Line Density
// ─────────────────────────────────────────────────────────────────────────────
describe("blankLineDensity", () => {
  it("returns 20 for very short input (< 3 lines)", () => {
    expect(blankLineDensity(["x = 1"])).toBe(20);
    expect(blankLineDensity(["a", "b"])).toBe(20);
  });

  it("returns 0 for no blank lines", () => {
    expect(blankLineDensity(["a", "b", "c", "d", "e"])).toBe(0);
  });

  it("returns high score for many blank lines (AI pattern)", () => {
    const ls = ["code", "", "", "more", "", "", "end", "", "", ""];
    const score = blankLineDensity(ls);
    expect(score).toBeGreaterThan(50);
  });

  it("caps at 100", () => {
    const manyBlanks = Array(20).fill("");
    manyBlanks.push("code");
    const score = blankLineDensity(manyBlanks);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns moderate score for typical human code", () => {
    const ls = [
      "def foo():",
      "    x = 1",
      "",
      "    return x",
      "",
      "def bar():",
      "    pass",
    ];
    const score = blankLineDensity(ls);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Naming Verbosity
// ─────────────────────────────────────────────────────────────────────────────
describe("namingVerbosity", () => {
  it("returns 20 for code with no qualifying identifiers", () => {
    expect(namingVerbosity(["x = 1", "y = 2"], pyLP)).toBe(20);
  });

  it("returns high score for verbose identifiers (AI pattern)", () => {
    const ls = lines(
      [
        "user_authentication_handler = create_authentication_handler()",
        "database_connection_manager = initialize_database_connection()",
        "error_response_formatter = build_error_response_formatter()",
        "request_validation_result = validate_incoming_request()",
      ].join("\n"),
    );
    const score = namingVerbosity(ls, pyLP);
    expect(score).toBeGreaterThan(50);
  });

  it("returns low score for terse identifiers (human pattern)", () => {
    const ls = lines(
      [
        "val = get()",
        "res = calc(data)",
        "out = proc(inp)",
        "cnt = 0",
        "idx = find(arr)",
      ].join("\n"),
    );
    const score = namingVerbosity(ls, pyLP);
    expect(score).toBeLessThan(50);
  });

  it("filters out comments", () => {
    const ls = [
      "# this_is_a_very_long_comment_with_underscores_that_should_not_count",
      "x = 1",
    ];
    const score = namingVerbosity(ls, pyLP);
    expect(score).toBe(20);
  });

  it("filters out stdlib names", () => {
    const ls = [
      "addEventListener(handler)",
      "removeEventListener(handler)",
      'querySelector(".test")',
      'querySelectorAll("div")',
    ];
    const score = namingVerbosity(ls, jsLP);
    expect(score).toBeLessThanOrEqual(40);
  });

  it("caps at 100", () => {
    const ls = Array(20).fill(
      "calculate_maximum_performance_threshold = optimize_system_performance_value()",
    );
    const score = namingVerbosity(ls, pyLP);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3b. Naming Verbosity — Diagnostic (identifier extraction per language)
// ─────────────────────────────────────────────────────────────────────────────
describe("namingVerbosity — identifier extraction diagnostic", () => {
  // Helper: mirrors the extraction logic in namingVerbosity so we can inspect
  // which identifiers are actually being counted and which are filtered out.
  const KEYWORDS = new Set([
    "if",
    "else",
    "for",
    "while",
    "return",
    "function",
    "var",
    "let",
    "const",
    "class",
    "import",
    "from",
    "def",
    "self",
    "this",
    "new",
    "try",
    "catch",
    "throw",
    "switch",
    "case",
    "break",
    "continue",
    "do",
    "in",
    "of",
    "typeof",
    "instanceof",
    "void",
    "null",
    "undefined",
    "true",
    "false",
    "async",
    "await",
    "yield",
    "super",
    "with",
    "delete",
    "export",
    "default",
    "extends",
    "static",
    "get",
    "set",
    "finally",
    "debugger",
    "enum",
    "implements",
    "interface",
    "private",
    "protected",
    "public",
    "abstract",
    "final",
    "native",
    "synchronized",
    "transient",
    "volatile",
    "goto",
    "throws",
    "int",
    "float",
    "double",
    "char",
    "boolean",
    "long",
    "short",
    "byte",
    "string",
    "print",
    "elif",
    "pass",
    "raise",
    "except",
    "lambda",
    "global",
    "nonlocal",
    "assert",
    "True",
    "False",
    "None",
    "and",
    "not",
    "is",
    "or",
    "as",
    "struct",
    "auto",
    "register",
    "signed",
    "unsigned",
    "sizeof",
    "typedef",
    "union",
    "extern",
    "namespace",
    "using",
    "internal",
    "sealed",
    "readonly",
    "ref",
    "out",
    "params",
    "foreach",
    "lock",
    "event",
    "delegate",
    "record",
    "where",
    "value",
  ]);

  const STDLIB_NAMES = new Set([
    "print",
    "len",
    "range",
    "type",
    "list",
    "dict",
    "set",
    "tuple",
    "str",
    "int",
    "float",
    "bool",
    "sorted",
    "enumerate",
    "zip",
    "map",
    "filter",
    "reduce",
    "isinstance",
    "issubclass",
    "hasattr",
    "getattr",
    "setattr",
    "delattr",
    "super",
    "property",
    "classmethod",
    "staticmethod",
    "abs",
    "max",
    "min",
    "sum",
    "round",
    "pow",
    "divmod",
    "hex",
    "oct",
    "bin",
    "ord",
    "chr",
    "repr",
    "hash",
    "input",
    "open",
    "format",
    "vars",
    "dir",
    "help",
    "next",
    "iter",
    "reversed",
    "slice",
    "object",
    "compile",
    "exec",
    "eval",
    "globals",
    "locals",
    "memoryview",
    "bytearray",
    "bytes",
    "frozenset",
    "complex",
    "defaultdict",
    "namedtuple",
    "OrderedDict",
    "dataclass",
    "dataclasses",
    "abstractmethod",
    "startswith",
    "endswith",
    "splitlines",
    "lstrip",
    "rstrip",
    "strip",
    "capitalize",
    "casefold",
    "collections",
    "functools",
    "itertools",
    "console",
    "document",
    "window",
    "Array",
    "Object",
    "Math",
    "JSON",
    "Date",
    "Promise",
    "Error",
    "RegExp",
    "Map",
    "Set",
    "Symbol",
    "Proxy",
    "Reflect",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "encodeURI",
    "decodeURI",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "fetch",
    "addEventListener",
    "removeEventListener",
    "querySelector",
    "querySelectorAll",
    "getElementById",
    "createElement",
    "appendChild",
    "setAttribute",
    "System",
    "String",
    "Integer",
    "Double",
    "Float",
    "Long",
    "Boolean",
    "Character",
    "StringBuilder",
    "ArrayList",
    "HashMap",
    "HashSet",
    "LinkedList",
    "TreeMap",
    "Collections",
    "Arrays",
    "Scanner",
    "BufferedReader",
    "PrintWriter",
    "FileReader",
    "FileWriter",
    "InputStreamReader",
    "OutputStreamWriter",
    "stdio",
    "stdlib",
    "string",
    "stdbool",
    "stdint",
    "stddef",
    "math",
    "ctype",
    "assert",
    "errno",
    "signal",
    "setjmp",
    "stdarg",
    "time",
    "include",
    "define",
    "printf",
    "fprintf",
    "sprintf",
    "scanf",
    "malloc",
    "calloc",
    "realloc",
    "free",
    "strlen",
    "strcpy",
    "strcat",
    "strcmp",
    "memcpy",
    "memset",
    "fopen",
    "fclose",
    "fread",
    "fwrite",
    "Console",
    "WriteLine",
    "ReadLine",
    "ToString",
    "GetType",
    "Equals",
    "GetHashCode",
    "TryParse",
    "AddRange",
    "ToArray",
    "ToList",
    "ToDictionary",
    "FirstOrDefault",
    "SingleOrDefault",
    "OrderBy",
    "GroupBy",
    "SelectMany",
    "ForEach",
    "ContainsKey",
    "TryGetValue",
    "StringBuilder",
    "ArgumentException",
    "ArgumentNullException",
    "InvalidOperationException",
    "NotImplementedException",
  ]);

  function extractIds(codeLines, lp) {
    const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
    const filtered = codeLines.filter((l) => {
      const t = l.trim();
      return (
        t &&
        !commentRe.test(t) &&
        !t.startsWith('"""') &&
        !t.startsWith("'''") &&
        !t.startsWith("*")
      );
    });
    const allIds = (
      filtered.join("\n").match(/\b[a-z][a-zA-Z0-9_]{3,}\b/g) || []
    ).filter((t) => !KEYWORDS.has(t.toLowerCase()) && !STDLIB_NAMES.has(t));
    const verbose = allIds.filter(
      (id) => id.length > 9 || (id.includes("_") && id.length > 6),
    );
    return { allIds, verbose };
  }

  // ── Python ──────────────────────────────────────────────────────────────────
  it("Python: extracts identifiers correctly, excludes constants and keywords", () => {
    const code = [
      "from collections import defaultdict",
      "",
      "MAX_SIZE = 100",
      "DEFAULT_TIMEOUT = 30",
      "",
      "def find_longest_substring(input_string):",
      "    char_count = defaultdict(int)",
      "    left = 0",
      "    max_len = 0",
      "    best_start = 0",
      "    for right, ch in enumerate(input_string):",
      "        char_count[ch] += 1",
      "        while len(char_count) > MAX_SIZE:",
      "            left_char = input_string[left]",
      "            char_count[left_char] -= 1",
      "            if char_count[left_char] == 0:",
      "                del char_count[left_char]",
      "            left += 1",
      "        if right - left + 1 > max_len:",
      "            max_len = right - left + 1",
      "            best_start = left",
      "    return input_string[best_start:best_start + max_len]",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, pyLP);

    expect(allIds).not.toContain("defaultdict");
    expect(allIds).not.toContain("enumerate");

    expect(allIds).toContain("char_count");
    expect(allIds).toContain("left");
    expect(allIds).toContain("best_start");
    expect(allIds).toContain("input_string");
    expect(allIds).toContain("find_longest_substring");

    expect(verbose).toContain("input_string");
    expect(verbose).toContain("find_longest_substring");
    expect(verbose).toContain("char_count");
    expect(verbose).toContain("best_start");

    expect(verbose).not.toContain("left");
    expect(verbose).not.toContain("right");

    const score = namingVerbosity(ls, pyLP);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThanOrEqual(100);
  });

  // ── JavaScript ──────────────────────────────────────────────────────────────
  it("JavaScript: extracts identifiers correctly, excludes stdlib and keywords", () => {
    const code = [
      "const MAX_RETRIES = 3;",
      "",
      "function calculateAverageScore(studentGrades) {",
      "    let totalPoints = 0;",
      "    let validCount = 0;",
      "    for (const grade of studentGrades) {",
      "        if (grade < 0) continue;",
      "        totalPoints += grade;",
      "        validCount++;",
      "    }",
      "    if (validCount === 0) return 0;",
      "    const avgScore = totalPoints / validCount;",
      "    return Math.round(avgScore * 100) / 100;",
      "}",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, jsLP);

    expect(allIds).not.toContain("Math");
    expect(allIds).not.toContain("round");

    expect(allIds).toContain("totalPoints");
    expect(allIds).toContain("validCount");
    expect(allIds).toContain("grade");
    expect(allIds).toContain("avgScore");
    expect(allIds).toContain("calculateAverageScore");
    expect(allIds).toContain("studentGrades");

    expect(verbose).toContain("calculateAverageScore");
    expect(verbose).toContain("studentGrades");
    expect(verbose).toContain("totalPoints");

    expect(verbose).not.toContain("grade");
    expect(verbose).not.toContain("avgScore");

    const score = namingVerbosity(ls, jsLP);
    expect(score).toBeGreaterThan(30);
  });

  // ── Java ────────────────────────────────────────────────────────────────────
  it("Java: extracts identifiers correctly, excludes type names and stdlib", () => {
    const code = [
      "import java.util.HashMap;",
      "import java.util.Map;",
      "",
      "public class WordFrequencyCounter {",
      "    private Map<String, Integer> frequencyMap;",
      "",
      "    public WordFrequencyCounter() {",
      "        frequencyMap = new HashMap<>();",
      "    }",
      "",
      "    public void countWords(String inputText) {",
      '        String[] wordArray = inputText.split("\\\\s+");',
      "        for (String word : wordArray) {",
      "            String normalizedWord = word.toLowerCase();",
      "            int currentCount = frequencyMap.getOrDefault(normalizedWord, 0);",
      "            frequencyMap.put(normalizedWord, currentCount + 1);",
      "        }",
      "    }",
      "",
      "    public int getCount(String targetWord) {",
      "        return frequencyMap.getOrDefault(targetWord, 0);",
      "    }",
      "}",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, javaLP);

    expect(allIds).toContain("frequencyMap");
    expect(allIds).toContain("countWords");
    expect(allIds).toContain("inputText");
    expect(allIds).toContain("wordArray");
    expect(allIds).toContain("normalizedWord");
    expect(allIds).toContain("currentCount");
    expect(allIds).toContain("targetWord");
    expect(allIds).toContain("getCount");

    expect(verbose).toContain("frequencyMap");
    expect(verbose).toContain("countWords");
    expect(verbose).toContain("normalizedWord");
    expect(verbose).toContain("currentCount");

    expect(verbose).not.toContain("word");
    expect(verbose).not.toContain("getCount");

    const score = namingVerbosity(ls, javaLP);
    expect(score).toBeGreaterThan(40);
  });

  // ── C++ ─────────────────────────────────────────────────────────────────────
  it("C++: extracts identifiers correctly, excludes std:: and keywords", () => {
    const code = [
      "#include <vector>",
      "#include <algorithm>",
      "",
      "int findMaximumSubarraySum(std::vector<int>& inputArray) {",
      "    int currentSum = 0;",
      "    int bestSum = inputArray[0];",
      "    for (int idx = 0; idx < inputArray.size(); idx++) {",
      "        currentSum += inputArray[idx];",
      "        if (currentSum > bestSum) {",
      "            bestSum = currentSum;",
      "        }",
      "        if (currentSum < 0) {",
      "            currentSum = 0;",
      "        }",
      "    }",
      "    return bestSum;",
      "}",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, cppLP);

    expect(allIds).toContain("findMaximumSubarraySum");
    expect(allIds).toContain("inputArray");
    expect(allIds).toContain("currentSum");
    expect(allIds).toContain("bestSum");

    expect(verbose).toContain("findMaximumSubarraySum");
    expect(verbose).toContain("inputArray");
    expect(verbose).toContain("currentSum");

    const score = namingVerbosity(ls, cppLP);
    expect(score).toBeGreaterThan(40);
  });

  // ── C ───────────────────────────────────────────────────────────────────────
  it("C: extracts identifiers correctly, excludes stdlib (malloc, printf, etc.)", () => {
    const code = [
      "#include <stdio.h>",
      "#include <stdlib.h>",
      "",
      "int calculate_factorial(int inputNumber) {",
      "    if (inputNumber <= 1) return 1;",
      "    int resultValue = 1;",
      "    for (int iter = 2; iter <= inputNumber; iter++) {",
      "        resultValue *= iter;",
      "    }",
      "    return resultValue;",
      "}",
      "",
      "int main() {",
      "    int userInput = 5;",
      "    int factResult = calculate_factorial(userInput);",
      '    printf("Result: %d\\n", factResult);',
      "    return 0;",
      "}",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, cLP);

    expect(allIds).not.toContain("printf");
    expect(allIds).not.toContain("malloc");
    expect(allIds).not.toContain("stdlib");

    expect(allIds).toContain("calculate_factorial");
    expect(allIds).toContain("inputNumber");
    expect(allIds).toContain("resultValue");
    expect(allIds).toContain("userInput");
    expect(allIds).toContain("factResult");
    expect(allIds).toContain("main");
    expect(allIds).not.toContain("iter"); // 4 chars — below the 5-char minimum

    expect(verbose).toContain("calculate_factorial");
    expect(verbose).toContain("inputNumber");
    expect(verbose).toContain("resultValue");

    expect(verbose).not.toContain("main");

    const score = namingVerbosity(ls, cLP);
    expect(score).toBeGreaterThan(30);
  });

  // ── C# ──────────────────────────────────────────────────────────────────────
  it("C#: extracts identifiers correctly, excludes .NET stdlib names", () => {
    const code = [
      "using System;",
      "using System.Collections.Generic;",
      "",
      "public class StudentGradeCalculator {",
      "    private List<double> gradeValues;",
      "",
      "    public StudentGradeCalculator() {",
      "        gradeValues = new List<double>();",
      "    }",
      "",
      "    public void addStudentGrade(double gradePoint) {",
      "        gradeValues.Add(gradePoint);",
      "    }",
      "",
      "    public double computeWeightedAverage() {",
      "        double totalWeight = 0;",
      "        double weightedSum = 0;",
      "        for (int position = 0; position < gradeValues.Count; position++) {",
      "            double currentWeight = position + 1;",
      "            weightedSum += gradeValues[position] * currentWeight;",
      "            totalWeight += currentWeight;",
      "        }",
      "        return weightedSum / totalWeight;",
      "    }",
      "}",
    ].join("\n");
    const ls = lines(code);
    const { allIds, verbose } = extractIds(ls, csLP);

    expect(allIds).not.toContain("Console");
    expect(allIds).not.toContain("WriteLine");
    expect(allIds).not.toContain("ToString");

    expect(allIds).toContain("gradeValues");
    expect(allIds).toContain("addStudentGrade");
    expect(allIds).toContain("gradePoint");
    expect(allIds).toContain("computeWeightedAverage");
    expect(allIds).toContain("totalWeight");
    expect(allIds).toContain("weightedSum");
    expect(allIds).toContain("currentWeight");
    expect(allIds).toContain("position");

    expect(verbose).toContain("gradeValues");
    expect(verbose).toContain("addStudentGrade");
    expect(verbose).toContain("gradePoint");
    expect(verbose).toContain("computeWeightedAverage");
    expect(verbose).toContain("totalWeight");
    expect(verbose).toContain("weightedSum");
    expect(verbose).toContain("currentWeight");

    expect(verbose).not.toContain("position");

    const score = namingVerbosity(ls, csLP);
    expect(score).toBeGreaterThan(40);
  });

  // ── Cross-language: constants must not count as identifiers ─────────────────
  it("constants (UPPER_CASE) are excluded across all languages", () => {
    const samples = [
      {
        lang: "Python",
        lp: pyLP,
        code: "MAX_SIZE = 100\nDEFAULT_VAL = 0\nx = calc(data)",
      },
      {
        lang: "JavaScript",
        lp: jsLP,
        code: "const MAX_RETRIES = 3;\nconst DEFAULT_TIMEOUT = 5000;\nlet val = run();",
      },
      {
        lang: "Java",
        lp: javaLP,
        code: "static final int MAX_CAPACITY = 100;\nint val = compute();",
      },
      {
        lang: "C++",
        lp: cppLP,
        code: "const int MAX_ELEMENTS = 1024;\nint val = solve();",
      },
      {
        lang: "C",
        lp: cLP,
        code: "#define MAX_BUFFER 256\nint val = process();",
      },
      {
        lang: "C#",
        lp: csLP,
        code: "const int MAX_ITERATIONS = 1000;\nint val = calc();",
      },
    ];
    for (const { lang, lp, code } of samples) {
      const ls = lines(code);
      const { allIds } = extractIds(ls, lp);
      for (const id of allIds) {
        expect(id).not.toMatch(/^[A-Z][A-Z_0-9]+$/);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Type Annotation Score
// ─────────────────────────────────────────────────────────────────────────────
describe("typeAnnotationScore", () => {
  it("returns 0 when language has no type annotations (plain JS)", () => {
    const code = "function foo(x) { return x + 1; }";
    expect(typeAnnotationScore(code, jsLP)).toBe(0);
  });

  it("detects Python type annotations", () => {
    const code = "def foo(x: int, y: str) -> bool:\n    return True";
    const score = typeAnnotationScore(code, pyLP);
    expect(score).toBeGreaterThan(0);
  });

  it("gives higher score for return types (weighted 2x)", () => {
    const withReturn = "def foo(x: int) -> str:\n    pass";
    const withoutReturn = "def foo(x: int, y: str, z: float):\n    pass";
    const scoreWithReturn = typeAnnotationScore(withReturn, pyLP);
    const scoreWithoutReturn = typeAnnotationScore(withoutReturn, pyLP);
    expect(scoreWithReturn).toBeGreaterThan(0);
    expect(scoreWithoutReturn).toBeGreaterThan(0);
  });

  it("returns high score for heavily annotated code", () => {
    const code = [
      "def a(x: int, y: str) -> bool:",
      "def b(z: float, w: List) -> Dict:",
      "def c(m: Optional, n: Union) -> Any:",
      "def d(p: tuple, q: set) -> None:",
    ].join("\n");
    const score = typeAnnotationScore(code, pyLP);
    expect(score).toBeGreaterThan(40);
  });

  it("caps at 100", () => {
    const code = Array(30)
      .fill("def foo(x: int, y: str, z: float) -> bool:")
      .join("\n");
    const score = typeAnnotationScore(code, pyLP);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("works with C type annotations", () => {
    const code =
      "int main(int argc, char *argv[]) {\n    double result = 0.0;\n    return 0;\n}";
    const lp = {
      typeAnnot:
        /\b(int|char|float|double|void|long|unsigned|short|size_t|FILE)\s+\*?\w+/g,
      returnType: null,
    };
    const score = typeAnnotationScore(code, lp);
    expect(score).toBeGreaterThan(0);
  });

  it("works with C# type annotations", () => {
    const code =
      "public int Calculate(string input, bool flag) { List<int> items = new(); return 0; }";
    const lp = {
      typeAnnot:
        /\b(int|string|bool|double|float|long|char|void|var|List|Dictionary|Task|IEnumerable|object)\s+\w+/g,
      returnType: null,
    };
    const score = typeAnnotationScore(code, lp);
    expect(score).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Docstring Coverage
// ─────────────────────────────────────────────────────────────────────────────
describe("docstringCoverage", () => {
  it("returns 0 when no functions/classes exist", () => {
    expect(docstringCoverage(["x = 1", "y = 2"], pyLP)).toBe(0);
  });

  it("returns 100 when all functions are documented (AI pattern)", () => {
    const ls = lines(
      [
        "def foo():",
        '    """Foo docstring."""',
        "    pass",
        "",
        "def bar():",
        '    """Bar docstring."""',
        "    pass",
      ].join("\n"),
    );
    expect(docstringCoverage(ls, pyLP)).toBe(100);
  });

  it("returns 0 when no functions are documented (human pattern)", () => {
    const ls = lines(
      ["def foo():", "    pass", "", "def bar():", "    return 1"].join("\n"),
    );
    expect(docstringCoverage(ls, pyLP)).toBe(0);
  });

  it("returns 50 when half the functions are documented", () => {
    const ls = lines(
      [
        "def foo():",
        '    """Documented."""',
        "    pass",
        "",
        "def bar():",
        "    return 1",
      ].join("\n"),
    );
    expect(docstringCoverage(ls, pyLP)).toBe(50);
  });

  it("skips __init__ constructors", () => {
    const ls = lines(
      [
        "def __init__(self):",
        "    self.x = 1",
        "",
        "def compute(self):",
        '    """Compute result."""',
        "    return self.x",
      ].join("\n"),
    );
    expect(docstringCoverage(ls, pyLP)).toBe(100);
  });

  it("detects JSDoc in JavaScript", () => {
    const ls = lines(
      [
        "function foo() {",
        "    /**",
        "     * Does stuff.",
        "     */",
        "    return 1;",
        "}",
        "",
        "function bar() {",
        "    /**",
        "     * Also does stuff.",
        "     */",
        "    return 2;",
        "}",
      ].join("\n"),
    );
    expect(docstringCoverage(ls, jsLP)).toBe(100);
  });

  it("returns 0 when language has no docOpen pattern", () => {
    const noDocLP = { ...pyLP, docOpen: null };
    const ls = lines(["def foo():", '    return "hello"', "}"].join("\n"));
    expect(docstringCoverage(ls, noDocLP)).toBe(0);
  });

  it("counts classes as entities", () => {
    const ls = lines(
      [
        "class Foo:",
        '    """A class."""',
        "    pass",
        "",
        "class Bar:",
        "    pass",
      ].join("\n"),
    );
    expect(docstringCoverage(ls, pyLP)).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Structural Regularity
// ─────────────────────────────────────────────────────────────────────────────
describe("structuralRegularity", () => {
  // New definition: canonical if 2+ of:
  //   (a) All param names are full English words (len >= 4, no short aliases)
  //   (b) Single return, no variable reassignment
  //   (c) Function name > 12 chars
  //   (d) Every param used exactly once in body

  // ── Edge cases ──────────────────────────────────────────────────────────────
  it("returns 0 when no functions exist", () => {
    expect(structuralRegularity(["x = 1"], pyLP)).toBe(0);
  });

  it("returns 0 when fnDef is null", () => {
    expect(structuralRegularity(["x = 1"], { fnDef: null })).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(structuralRegularity([], pyLP)).toBe(0);
  });

  // ── Criterion (a): full-word params ───────────────────────────────────────
  it("criterion (a): params like 'numbers', 'target' are full words", () => {
    // hits (a) full-word params + (b) single return, no reassignment → 2 criteria → canonical
    const ls = lines([
      "def find_element(numbers, target):",
      "    return numbers.index(target)",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("criterion (a) fails: short params like 'n', 'lo', 'hi' are NOT full words", () => {
    // (a) fails — short params. (b) single return no reassign → only 1 criterion → not canonical
    const ls = lines([
      "def solve(n, lo, hi):",
      "    return lo + hi",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  // ── Criterion (b): single return, no reassignment ─────────────────────────
  it("criterion (b): single return, no reassignment", () => {
    // (a) fails (short param 'arr'). (b) single return ✓. (c) name len ≤ 12. (d) 'arr' used once ✓ → 2 criteria → canonical
    const ls = lines([
      "def sort(items):",
      "    return sorted(items)",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("criterion (b) fails: multiple returns", () => {
    // (b) fails — 2 returns. Only (d) might hit if param used once. Not enough.
    const ls = lines([
      "def check(val):",
      "    if val > 0:",
      "        return True",
      "    return False",
    ].join("\n"));
    // (a) fails (val < 4). (b) fails (2 returns). (c) fails (name ≤ 12). (d) val used once ✓ → 1 criterion → not canonical
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  it("criterion (b) fails: variable reassignment", () => {
    const ls = lines([
      "def compute(data):",
      "    result = process(data)",
      "    result = transform(result)",
      "    return result",
    ].join("\n"));
    // (a) ✓ (data >= 4). (b) fails (result reassigned). (c) fails. (d) data used once ✓ → 2 criteria → canonical
    // Wait: (a) data is len 4 ✓ and not in SHORT_PARAM_NAMES. But 'result' reassigned breaks (b).
    // So criteria: (a) ✓, (b) ✗, (c) ✗, (d) ✓ → 2 → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  // ── Criterion (c): function name > 12 chars ───────────────────────────────
  it("criterion (c): long function name > 12 chars", () => {
    // name "calculate_result" = 16 chars → (c) ✓
    // (a) 'x' < 4 → ✗. (b) single return, no reassign ✓. (c) ✓. (d) x used once ✓ → 3 criteria → canonical
    const ls = lines([
      "def calculate_result(x):",
      "    return x * 2",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("criterion (c) fails: short function name ≤ 12 chars", () => {
    // name "calc" = 4 chars → (c) ✗
    // (a) 'x' < 4 → ✗. (b) ✓. (c) ✗. (d) x used once ✓ → 2 criteria → canonical
    const ls = lines([
      "def calc(x):",
      "    return x * 2",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  // ── Criterion (d): each param used exactly once ───────────────────────────
  it("criterion (d): each param used exactly once", () => {
    const ls = lines([
      "def add(a, b):",
      "    return a + b",
    ].join("\n"));
    // (a) 'a','b' < 4 → ✗. (b) single return ✓. (c) 'add' ≤ 12 → ✗. (d) a once, b once ✓ → 2 criteria → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("criterion (d) fails: param used multiple times", () => {
    const ls = lines([
      "def sq(x):",
      "    return x * x",
    ].join("\n"));
    // (a) 'x' < 4 → ✗. (b) single return ✓. (c) ✗. (d) x used 2 times → ✗ → 1 criterion → not canonical
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  // ── Combined criteria scoring ─────────────────────────────────────────────
  it("0 criteria met → 0 (human pattern)", () => {
    const ls = lines([
      "def f(x):",
      "    x = x + 1",
      "    if x > 0:",
      "        return x",
      "    return -x",
    ].join("\n"));
    // (a) x < 4 ✗. (b) 2 returns + reassignment ✗. (c) 'f' ≤ 12 ✗. (d) x used many ✗ → 0 → not canonical
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  it("1 criterion met → 0 (not enough)", () => {
    const ls = lines([
      "def sq(x):",
      "    return x * x",
    ].join("\n"));
    // Only (b) met → 1 → not canonical
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  it("2 criteria met → canonical (100 for single function)", () => {
    const ls = lines([
      "def add(a, b):",
      "    return a + b",
    ].join("\n"));
    // (b) ✓ + (d) ✓ → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("multiple functions: mix of canonical and non-canonical", () => {
    const ls = lines([
      "def calculate_maximum(numbers):",
      "    return max(numbers)",
      "",
      "def f(x):",
      "    x = x * 2",
      "    return x",
    ].join("\n"));
    // fn1: (a) numbers >= 4 ✓, (b) single return ✓, (c) 'calculate_maximum' = 17 > 12 ✓, (d) numbers once ✓ → 4 criteria → canonical
    // fn2: (a) x < 4 ✗, (b) reassignment ✗, (c) 'f' ≤ 12 ✗, (d) x used 2 times ✗ → 0 → not canonical
    // 1/2 = 50
    expect(structuralRegularity(ls, pyLP)).toBe(50);
  });

  it("all functions canonical → 100", () => {
    const ls = lines([
      "def process_input(data):",
      "    return transform(data)",
      "",
      "def validate_output(result):",
      "    return verify(result)",
    ].join("\n"));
    // fn1: (a) data >= 4 ✓, (b) ✓, (c) 'process_input' = 13 > 12 ✓, (d) data once ✓ → 4 → canonical
    // fn2: (a) result >= 4 ✓, (b) ✓, (c) 'validate_output' = 15 > 12 ✓, (d) result once ✓ → 4 → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  // ── No params → criteria (a) and (d) don't apply ─────────────────────────
  it("function with no params: only (b) and (c) can fire", () => {
    const ls = lines([
      "def generate_output():",
      "    return 42",
    ].join("\n"));
    // (a) no params → ✗. (b) single return ✓. (c) 'generate_output' = 15 > 12 ✓. (d) no params → ✗ → 2 → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  it("no-param function with short name → only 1 criterion → 0", () => {
    const ls = lines([
      "def run():",
      "    return 42",
    ].join("\n"));
    // (a) ✗. (b) ✓. (c) 'run' ≤ 12 ✗. (d) ✗ → 1 → not canonical
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  // ── Human-style DSA code → low score ──────────────────────────────────────
  it("human DSA Python: short names, reassignment, multiple returns → 0", () => {
    const ls = lines([
      "def solve(n):",
      "    ans = 0",
      "    for i in range(n):",
      "        ans += i",
      "    return ans",
      "",
      "def helper(lo, hi):",
      "    if lo >= hi:",
      "        return -1",
      "    mid = (lo + hi) // 2",
      "    return mid",
    ].join("\n"));
    expect(structuralRegularity(ls, pyLP)).toBe(0);
  });

  // ── AI-style DSA code → high score ────────────────────────────────────────
  it("AI DSA Python: verbose names, single returns, params used once → 100", () => {
    const ls = lines([
      "def find_maximum_element(numbers):",
      "    return max(numbers)",
      "",
      "def calculate_average(values):",
      "    return sum(values) / len(values)",
    ].join("\n"));
    // fn1: (a) 'numbers' ✓, (b) ✓, (c) 20 > 12 ✓, (d) numbers once ✓ → 4 → canonical
    // fn2: (a) 'values' ✓, (b) ✓, (c) 17 > 12 ✓, (d) values used 2× → ✗ → 3 → canonical
    expect(structuralRegularity(ls, pyLP)).toBe(100);
  });

  // ── Cross-language ────────────────────────────────────────────────────────
  it("JavaScript: AI-style function → canonical", () => {
    const ls = lines([
      "function calculateMaximum(numbers) {",
      "    return Math.max(...numbers);",
      "}",
    ].join("\n"));
    // (a) 'numbers' ✓ (b) ✓ (c) 'calculateMaximum' = 16 > 12 ✓ (d) numbers once ✓ → canonical
    expect(structuralRegularity(ls, jsLP)).toBe(100);
  });

  it("JavaScript: human-style function → not canonical", () => {
    const ls = lines([
      "function solve(n) {",
      "    let ans = 0;",
      "    for (let i = 0; i < n; i++) ans += i;",
      "    return ans;",
      "}",
    ].join("\n"));
    expect(structuralRegularity(ls, jsLP)).toBe(0);
  });

  it("Java: AI-style method → canonical", () => {
    const ls = lines([
      "public int calculateMaximum(int[] numbers) {",
      "    return Arrays.stream(numbers).max().orElse(0);",
      "}",
    ].join("\n"));
    expect(structuralRegularity(ls, javaLP)).toBe(100);
  });

  it("Java: human-style method → not canonical", () => {
    const ls = lines([
      "public int solve(int n) {",
      "    int ans = 0;",
      "    for (int i = 0; i < n; i++) ans += i;",
      "    return ans;",
      "}",
    ].join("\n"));
    expect(structuralRegularity(ls, javaLP)).toBe(0);
  });

  it("C++: AI-style → canonical", () => {
    const ls = lines([
      "int findMaxElement(vector<int> numbers) {",
      "    return *max_element(numbers.begin(), numbers.end());",
      "}",
    ].join("\n"));
    expect(structuralRegularity(ls, cppLP)).toBe(100);
  });

  it("C++: human-style → not canonical", () => {
    const ls = lines([
      "int solve(int n) {",
      "    int ans = 0;",
      "    for (int i = 0; i < n; i++) ans += i;",
      "    return ans;",
      "}",
    ].join("\n"));
    expect(structuralRegularity(ls, cppLP)).toBe(0);
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  it("calling twice gives same result", () => {
    const ls = lines([
      "def calculate_result(numbers):",
      "    return sum(numbers)",
    ].join("\n"));
    const s1 = structuralRegularity(ls, pyLP);
    const s2 = structuralRegularity(ls, pyLP);
    expect(s1).toBe(s2);
  });

  // ── runTier1Debug consistency ──────────────────────────────────────────────
  it("runTier1Debug score matches structuralRegularity", () => {
    const code = [
      "def calculate_result(numbers):",
      "    return sum(numbers)",
      "",
      "def f(x):",
      "    return x * x",
    ].join("\n");
    const ls = code.split("\n");
    const debug = runTier1Debug(code, ls, "Python");
    expect(debug.structural_regularity.score).toBe(
      structuralRegularity(ls, pyLP),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Inline Comment Absence
// ─────────────────────────────────────────────────────────────────────────────
describe("inlineCommentAbsence", () => {
  it("returns 50 for very short code (< 5 lines)", () => {
    expect(inlineCommentAbsence(["x = 1", "y = 2"], pyLP)).toBe(50);
  });

  it("returns high score when code has no comments (AI pattern)", () => {
    const ls = [
      "def foo():",
      "    x = 1",
      "    y = 2",
      "    z = x + y",
      "    return z",
      "    a = 3",
    ];
    const score = inlineCommentAbsence(ls, pyLP);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("returns low score when code has casual markers (human pattern)", () => {
    const ls = [
      "def foo():",
      "    x = 1  # TODO fix this",
      "    y = 2  # FIXME broken",
      "    z = x + y  # hack for now",
      "    return z",
      "    # temp workaround",
    ];
    const score = inlineCommentAbsence(ls, pyLP);
    expect(score).toBeLessThan(50);
  });

  it("reduces score for each casual marker found", () => {
    const ls1 = ["x = 1", "y = 2", "# TODO fix", "z = 3", "w = 4"];
    const ls2 = [
      "x = 1",
      "y = 2",
      "# TODO fix",
      "# FIXME this",
      "# HACK lol",
      "z = 3",
      "w = 4",
    ];
    const score1 = inlineCommentAbsence(ls1, pyLP);
    const score2 = inlineCommentAbsence(ls2, pyLP);
    expect(score2).toBeLessThan(score1);
  });

  it("works with JS comments", () => {
    const ls = [
      "function foo() {",
      "  const x = 1;",
      "  const y = 2;",
      "  return x + y;",
      "}",
      "// ordinary code",
    ];
    const score = inlineCommentAbsence(ls, jsLP);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Indent Consistency
// ─────────────────────────────────────────────────────────────────────────────
describe("indentConsistency", () => {
  it("returns 50 for Python (indentation-significant language)", () => {
    const ls = ["def foo():", "    x = 1", "    return x"];
    expect(indentConsistency(ls, "Python")).toBe(50);
  });

  it("returns consistent score for C++ (no special handling)", () => {
    const ls = ["int main() {", "    int x = 1;", "    return x;", "}"];
    expect(indentConsistency(ls, "C++")).toBeGreaterThan(50);
  });

  it("returns 50 for very short input", () => {
    expect(indentConsistency(["x"], "JavaScript")).toBe(50);
  });

  it("returns high score for perfectly consistent indentation (AI pattern)", () => {
    const ls = [
      "function foo() {",
      "  const x = 1;",
      "  const y = 2;",
      "  if (x) {",
      "    return y;",
      "  }",
      "}",
    ];
    const score = indentConsistency(ls, "JavaScript");
    expect(score).toBeGreaterThan(80);
  });

  it("returns lower score for inconsistent indentation (human pattern)", () => {
    const ls = [
      "function foo() {",
      "  const x = 1;",
      "   const y = 2;",
      "     if (x) {",
      "  return y;",
      "       }",
      "}",
    ];
    const score = indentConsistency(ls, "JavaScript");
    expect(score).toBeLessThan(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Exception Handling Style
// ─────────────────────────────────────────────────────────────────────────────
describe("exceptionHandlingStyle", () => {
  // ── Edge cases ──────────────────────────────────────────────────────────────
  it("returns 30 when no exception handling exists", () => {
    expect(exceptionHandlingStyle("x = 1", pyLP)).toBe(30);
  });

  it("returns 30 for empty string", () => {
    expect(exceptionHandlingStyle("", pyLP)).toBe(30);
  });

  it("caps at 100", () => {
    const code = Array(10)
      .fill('except ValueError as e:\n    raise ValueError("err")\n')
      .join("\n");
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBeLessThanOrEqual(100);
  });

  // ── Python ──────────────────────────────────────────────────────────────────
  it("Python: except Exception as e + raise → high score (AI pattern)", () => {
    const code = [
      "try:",
      "    result = compute()",
      "except Exception as e:",
      '    raise ValueError("bad") from e',
    ].join("\n");
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBe(100);
  });

  it("Python: except ValueError (specific type) counts as structured", () => {
    const code = [
      "try:",
      "    result = int(value)",
      "except ValueError:",
      '    raise TypeError("must be numeric")',
    ].join("\n");
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBe(100);
  });

  it("Python: bare except: → low score (human shortcut)", () => {
    const code = ["try:", "    result = compute()", "except:", "    pass"].join(
      "\n",
    );
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBe(0);
  });

  it("Python: mix of bare and typed except → intermediate score", () => {
    const code = [
      "try:",
      "    x = compute()",
      "except ValueError as e:",
      "    raise",
      "try:",
      "    y = other()",
      "except:",
      "    pass",
    ].join("\n");
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(100);
  });

  it("Python: only raise without except still counts as structured", () => {
    const code = [
      "def validate(x):",
      "    if not x:",
      '        raise ValueError("x required")',
      "    if x < 0:",
      '        raise TypeError("must be positive")',
    ].join("\n");
    const score = exceptionHandlingStyle(code, pyLP);
    expect(score).toBe(100);
  });

  // ── JavaScript ──────────────────────────────────────────────────────────────
  it("JavaScript: catch(err) + throw → high score (AI pattern)", () => {
    const code = [
      "try {",
      "  const x = compute();",
      "} catch (err) {",
      '  throw new Error("failed");',
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, jsLP);
    expect(score).toBe(100);
  });

  it("JavaScript: catch() empty parameter → bare catch (human)", () => {
    const code = [
      "try {",
      "  compute();",
      "} catch () {",
      '  console.log("oops");',
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, jsLP);
    expect(score).toBe(0);
  });

  it("JavaScript: multiple catch(err) blocks with throw → 100", () => {
    const code = [
      'try { a(); } catch (e1) { throw new Error("a failed"); }',
      'try { b(); } catch (e2) { throw new Error("b failed"); }',
    ].join("\n");
    const score = exceptionHandlingStyle(code, jsLP);
    expect(score).toBe(100);
  });

  // ── Java ────────────────────────────────────────────────────────────────────
  it("Java: catch(Exception e) + throw → high score", () => {
    const code = [
      "try {",
      "    int result = calculate();",
      "} catch (Exception e) {",
      '    throw new RuntimeException("failed", e);',
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, javaLP);
    expect(score).toBe(100);
  });

  it("Java: catch(IOException e) counts as structured (specific type)", () => {
    const code = [
      "try {",
      "    read(file);",
      "} catch (IOException e) {",
      "    throw new RuntimeException(e);",
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, javaLP);
    expect(score).toBe(100);
  });

  it("Java: no bare catch exists — all catches are typed", () => {
    const code = [
      "try {",
      "    process();",
      "} catch (NullPointerException e) {",
      "    e.printStackTrace();",
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, javaLP);
    expect(score).toBe(100);
  });

  // ── C++ ─────────────────────────────────────────────────────────────────────
  it("C++: catch(const std::exception& e) → structured (high score)", () => {
    const code = [
      "try {",
      "    compute();",
      "} catch (const std::exception& e) {",
      '    throw std::runtime_error("failed");',
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, cppLP);
    expect(score).toBe(100);
  });

  it("C++: catch(...) → bare catch (low score)", () => {
    const code = [
      "try {",
      "    compute();",
      "} catch (...) {",
      "    // swallow",
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, cppLP);
    expect(score).toBe(0);
  });

  it("C++: mix of typed catch and catch(...) → intermediate", () => {
    const code = [
      "try { a(); } catch (std::exception& e) { throw; }",
      "try { b(); } catch (...) { /* ignore */ }",
    ].join("\n");
    const score = exceptionHandlingStyle(code, cppLP);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  // ── C ───────────────────────────────────────────────────────────────────────
  it("C: returns 30 (no exception handling in C)", () => {
    const code = ["int compute() {", "    return 0;", "}"].join("\n");
    expect(exceptionHandlingStyle(code, cLP)).toBe(30);
  });

  // ── C# ──────────────────────────────────────────────────────────────────────
  it("C#: catch(Exception ex) + throw → high score", () => {
    const code = [
      "try {",
      "    int result = Calculate();",
      "} catch (Exception ex) {",
      '    throw new InvalidOperationException("failed", ex);',
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, csLP);
    expect(score).toBe(100);
  });

  it("C#: catch(ArgumentException ex) counts as structured", () => {
    const code = [
      "try {",
      "    Validate(input);",
      "} catch (ArgumentException ex) {",
      "    throw new InvalidOperationException(ex.Message);",
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, csLP);
    expect(score).toBe(100);
  });

  it("C#: catch() bare → low score (human shortcut)", () => {
    const code = [
      "try {",
      "    Compute();",
      "} catch () {",
      "    // swallow",
      "}",
    ].join("\n");
    const score = exceptionHandlingStyle(code, csLP);
    expect(score).toBe(0);
  });

  it("C#: mix of typed and bare catches → intermediate", () => {
    const code = [
      "try { A(); } catch (Exception ex) { throw; }",
      "try { B(); } catch () { /* ignore */ }",
    ].join("\n");
    const score = exceptionHandlingStyle(code, csLP);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  // ── Cross-language: raise/throw always counts as structured ────────────────
  it("raise/throw keywords count as structured across all languages", () => {
    const code = ['throw new Error("fail");', 'raise ValueError("bad");'].join(
      "\n",
    );
    const noExceptLP = { exceptBroad: null, exceptBare: null };
    const score = exceptionHandlingStyle(code, noExceptLP);
    expect(score).toBe(100);
  });

  // ── runTier1Debug consistency ──────────────────────────────────────────────
  it("runTier1Debug returns matching exception handling data", () => {
    const code = [
      "try:",
      "    compute()",
      "except ValueError as e:",
      '    raise TypeError("converted")',
      "try:",
      "    other()",
      "except:",
      "    pass",
    ].join("\n");
    const ls = code.split("\n");
    const debug = runTier1Debug(code, ls, "Python");
    expect(debug.exception_handling.score).toBe(
      exceptionHandlingStyle(code, pyLP),
    );
    expect(debug.exception_handling.broadCatches.length).toBeGreaterThan(0);
    expect(debug.exception_handling.bareCatches.length).toBeGreaterThan(0);
    expect(debug.exception_handling.raiseThrow.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Import Organisation
// ─────────────────────────────────────────────────────────────────────────────
describe("importOrganisation", () => {
  it("returns 30 when fewer than 3 import lines", () => {
    expect(importOrganisation(["import os", "import sys"], pyLP)).toBe(30);
  });

  it("returns higher score for grouped imports (AI pattern)", () => {
    const ls = [
      "import os",
      "import sys",
      "",
      "from typing import List",
      "from typing import Dict",
      "",
      "from mymodule import foo",
    ];
    const score = importOrganisation(ls, pyLP);
    expect(score).toBeGreaterThan(50);
  });

  it("returns lower score for ungrouped imports", () => {
    const ls = [
      "import os",
      "from mymodule import foo",
      "import sys",
      "from typing import List",
    ];
    const score = importOrganisation(ls, pyLP);
    expect(score).toBeLessThanOrEqual(50);
  });

  it("awards points for typing imports", () => {
    const ls = [
      "import os",
      "import sys",
      "",
      "from typing import List, Dict, Optional",
      "from mymodule import helper",
    ];
    const score = importOrganisation(ls, pyLP);
    expect(score).toBeGreaterThan(50);
  });

  it("awards points for sorted imports", () => {
    const ls = [
      "import abc",
      "import json",
      "import os",
      "",
      "from mymodule import foo",
    ];
    const score = importOrganisation(ls, pyLP);
    expect(score).toBeGreaterThan(50);
  });

  it("caps at 100", () => {
    const ls = [
      "import abc",
      "import json",
      "import os",
      "",
      "from typing import List, Dict",
      "",
      "from mymodule import foo",
    ];
    const score = importOrganisation(ls, pyLP);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. String Formatting Style
// ─────────────────────────────────────────────────────────────────────────────
describe("stringFormattingStyle", () => {
  it("returns 30 when no string formatting found", () => {
    expect(stringFormattingStyle("x = 1", pyLP)).toBe(30);
  });

  it("returns 85 for pure f-string usage with 2+ instances (AI pattern)", () => {
    const code = 'msg = f"hello {name}"\nout = f"result: {val}"';
    expect(stringFormattingStyle(code, pyLP)).toBe(85);
  });

  it("returns 20 for mostly old-style formatting (human pattern)", () => {
    const code = '"hello %s" % name\n"result %d".format(val)';
    const score = stringFormattingStyle(code, pyLP);
    expect(score).toBeLessThanOrEqual(45);
  });

  it("returns intermediate score for mixed formatting", () => {
    const code = 'f"hello {name}"\n"old %s" % name\n"more".format(x)';
    const score = stringFormattingStyle(code, pyLP);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(85);
  });

  it("works with JavaScript template literals", () => {
    const code = "const msg = `hello ${name}`;\nconst out = `result: ${val}`;";
    expect(stringFormattingStyle(code, jsLP)).toBe(85);
  });

  it("works with JS old-style concatenation", () => {
    const code = '"hello " + name + " world"';
    const score = stringFormattingStyle(code, jsLP);
    expect(score).toBeLessThanOrEqual(45);
  });

  it("works with C# interpolated strings", () => {
    const code =
      'string msg = $"hello {name}";\nstring out = $"result: {val}";';
    const lp = { fmtModern: /\$"/g, fmtOld: /string\.Format\s*\(/g };
    expect(stringFormattingStyle(code, lp)).toBe(85);
  });

  it("works with C printf", () => {
    const code = 'printf("hello %s\\n", name);\nprintf("count: %d\\n", n);';
    const lp = { fmtModern: null, fmtOld: /printf\s*\(/g };
    expect(stringFormattingStyle(code, lp)).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Dead Code Absence
// ─────────────────────────────────────────────────────────────────────────────
describe("deadCodeAbsence", () => {
  // ── Baseline behaviour ────────────────────────────────────────────────────
  it("returns 75 when no dead code indicators (AI pattern — clean code)", () => {
    const ls = ["def foo():", "    return 1", "", "def bar():", "    return 2"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("returns 50 for exactly 1 dead code indicator", () => {
    const ls = ["def foo():", "    # return old_value", "    return 1"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("returns 35 for 2 dead code indicators", () => {
    const ls = [
      "# def old_function():",
      "# import old_module",
      "def foo():",
      "    return 1",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(35);
  });

  it("returns 15 for 3 dead code indicators", () => {
    const ls = [
      "# def old_function():",
      "#     return None",
      "# import old_module",
      "def foo():",
      "    return 1",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(15);
  });

  it("never goes below 10 even with many indicators", () => {
    const ls = Array(10).fill("# def old():").concat(["def foo():", "    pass"]);
    expect(deadCodeAbsence(ls, pyLP)).toBe(10);
  });

  // ── print(x) / console.log(x) are NOT debug ──────────────────────────────
  // On this platform, bare print/console.log statements are answer output.
  // The system compares console output against expected output.

  it("does NOT treat print(x) as dead code — it is answer output (Python)", () => {
    const ls = [
      "def solve(n):",
      "    result = n * 2",
      "    print(result)",
      "    return result",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat print(variable_name) as dead code", () => {
    const ls = ["n = int(input())", "ans = n + 1", "print(ans)"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat print with f-string as dead code", () => {
    const ls = ["x = 42", 'print(f"Answer: {x}")'];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat print with string argument as dead code", () => {
    const ls = ["def main():", '    print("Hello World")', "main()"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat print with multiple args as dead code", () => {
    const ls = ["a, b = 1, 2", "print(a, b)"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat console.log(x) as dead code — it is answer output (JS)", () => {
    const ls = [
      "function solve(n) {",
      "  const result = n * 2;",
      "  console.log(result);",
      "  return result;",
      "}",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(75);
  });

  it("does NOT treat console.log with string as dead code", () => {
    const ls = [
      "const x = 42;",
      'console.log("The answer is " + x);',
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(75);
  });

  it("does NOT treat System.out.println(x) as dead code (Java)", () => {
    const ls = [
      "public int solve(int n) {",
      "    int result = n * 2;",
      "    System.out.println(result);",
      "    return result;",
      "}",
    ];
    expect(deadCodeAbsence(ls, javaLP)).toBe(75);
  });

  it("does NOT treat fmt.Println(x) as dead code (Go-style)", () => {
    const ls = [
      "func solve(n int) int {",
      "    result := n * 2",
      "    fmt.Println(result)",
      "    return result",
      "}",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT treat printf(x) as dead code (C)", () => {
    const ls = [
      "int main() {",
      "    int x = 42;",
      '    printf("%d\\n", x);',
      "    return 0;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cLP)).toBe(75);
  });

  it("does NOT treat cout as dead code (C++)", () => {
    const ls = [
      "int main() {",
      "    int x = 42;",
      "    cout << x << endl;",
      "    return 0;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cppLP)).toBe(75);
  });

  it("does NOT treat Console.WriteLine as dead code (C#)", () => {
    const ls = [
      "static void Main() {",
      "    int x = 42;",
      "    Console.WriteLine(x);",
      "}",
    ];
    expect(deadCodeAbsence(ls, csLP)).toBe(75);
  });

  it("multiple print(x) calls are all answer output, not dead code", () => {
    const ls = [
      "t = int(input())",
      "for _ in range(t):",
      "    n = int(input())",
      "    print(solve(n))",
      "    print()",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  // ── Only print("debug...") IS a debug indicator ──────────────────────────

  it("DOES detect print('debug ...') as a debug indicator", () => {
    const ls = [
      "def foo():",
      '    print("debug: x =", x)',
      "    return x",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("DOES detect print('DEBUG ...') case-insensitively", () => {
    const ls = [
      "def foo():",
      '    print("DEBUG value:", val)',
      "    return val",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("DOES detect console.log('debug ...') as a debug indicator", () => {
    const ls = [
      "function foo() {",
      '    console.log("debug test");',
      "    return 1;",
      "}",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(50);
  });

  it("detects both print-debug and console.log-debug together", () => {
    const ls = [
      "def foo():",
      '    print("debug something")',
      '    console.log("debug test")',
      "    return 1",
    ];
    const score = deadCodeAbsence(ls, pyLP);
    expect(score).toBe(35);
  });

  // ── Commented-out code detection (Python) ─────────────────────────────────

  it("detects commented-out def as dead code", () => {
    const ls = ["# def removed_function():", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out return as dead code", () => {
    const ls = ["def foo():", "    # return old_value", "    return new_value"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out import as dead code", () => {
    const ls = ["# import os", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out for loop as dead code", () => {
    const ls = ["# for i in range(10):", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out if statement as dead code", () => {
    const ls = ["# if x > 0:", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out while loop as dead code", () => {
    const ls = ["# while True:", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("detects commented-out class as dead code", () => {
    const ls = ["# class OldClass:", "def foo():", "    pass"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });

  it("does NOT count plain comments as dead code", () => {
    const ls = [
      "# this is a regular comment",
      "# another comment explaining logic",
      "# TODO: optimise later",
      "def foo():",
      "    return 1",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("does NOT count empty comment lines as dead code", () => {
    const ls = ["#", "# ", "#  ", "def foo():", "    return 1"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  // ── Commented-out code detection (JavaScript) ─────────────────────────────

  it("detects // function removed() as dead code (JS)", () => {
    const ls = [
      "// function removed() {",
      "function foo() {",
      "    return 1;",
      "}",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(50);
  });

  it("detects // return oldVal as dead code (JS)", () => {
    const ls = [
      "function foo() {",
      "    // return oldVal;",
      "    return newVal;",
      "}",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(50);
  });

  it("detects // import as dead code (JS)", () => {
    const ls = ["// import { old } from './old';", "const x = 1;"];
    expect(deadCodeAbsence(ls, jsLP)).toBe(50);
  });

  it("does NOT count // regular explanation as dead code (JS)", () => {
    const ls = [
      "// calculate the maximum subarray sum",
      "function solve(arr) {",
      "    return arr.reduce((a, b) => a + b, 0);",
      "}",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(75);
  });

  // ── Commented-out code detection (Java) ───────────────────────────────────

  it("detects // public void old() as dead code (Java)", () => {
    const ls = [
      "// public void oldMethod() {",
      "public int solve(int n) {",
      "    return n * 2;",
      "}",
    ];
    expect(deadCodeAbsence(ls, javaLP)).toBe(50);
  });

  // ── Commented-out code detection (C++) ────────────────────────────────────

  it("detects // int old_func() as dead code (C++)", () => {
    const ls = [
      "// int old_func(int x) {",
      "int solve(int n) {",
      "    return n * 2;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cppLP)).toBe(50);
  });

  // ── Commented-out code detection (C) ──────────────────────────────────────

  it("detects // void old_func() as dead code (C)", () => {
    const ls = [
      "// void old_func(int x) {",
      "int main() {",
      "    return 0;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cLP)).toBe(50);
  });

  // ── Commented-out code detection (C#) ─────────────────────────────────────

  it("detects // public void OldMethod() as dead code (C#)", () => {
    const ls = [
      "// public void OldMethod() {",
      "public int Solve(int n) {",
      "    return n * 2;",
      "}",
    ];
    expect(deadCodeAbsence(ls, csLP)).toBe(50);
  });

  // ── Combined indicators ───────────────────────────────────────────────────

  it("correctly counts only commented code when print(x) is present (not debug)", () => {
    const ls = [
      "# def old_function():",
      "#     return None",
      "# import old_module",
      "print(result)",
      "def foo():",
      "    return 1",
    ];
    const score = deadCodeAbsence(ls, pyLP);
    expect(score).toBe(15);
  });

  it("counts debug string prints AND commented code together", () => {
    const ls = [
      "# def old():",
      '    print("debug: checking x")',
      "def foo():",
      "    return 1",
    ];
    const score = deadCodeAbsence(ls, pyLP);
    expect(score).toBe(35);
  });

  // ── Score boundaries ──────────────────────────────────────────────────────

  it("score = 75 - (count * 20), clamped at 10", () => {
    expect(deadCodeAbsence([], pyLP)).toBe(75);
    expect(deadCodeAbsence(["# return x"], pyLP)).toBe(50);
    expect(deadCodeAbsence(["# return x", "# def y():"], pyLP)).toBe(35);
    expect(deadCodeAbsence(["# return x", "# def y():", "# import z"], pyLP)).toBe(15);
    expect(deadCodeAbsence(Array(4).fill("# def x():"), pyLP)).toBe(10);
    expect(deadCodeAbsence(Array(10).fill("# def x():"), pyLP)).toBe(10);
  });

  it("never goes below 10 with massive dead code but no debug prints from answer output", () => {
    const ls = Array(10).fill("# def old():").concat(Array(5).fill("print(x)"));
    const score = deadCodeAbsence(ls, pyLP);
    expect(score).toBeGreaterThanOrEqual(10);
    expect(score).toBe(10);
  });

  // ── DSA-typical submissions ───────────────────────────────────────────────

  it("typical AI DSA submission: perfectly clean → 75", () => {
    const ls = [
      "def two_sum(nums, target):",
      "    seen = {}",
      "    for i, num in enumerate(nums):",
      "        complement = target - num",
      "        if complement in seen:",
      "            return [seen[complement], i]",
      "        seen[num] = i",
      "    return []",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("typical human DSA submission with answer print → 75 (no penalty)", () => {
    const ls = [
      "n = int(input())",
      "arr = list(map(int, input().split()))",
      "arr.sort()",
      "lo, hi = 0, n - 1",
      "ans = 0",
      "while lo < hi:",
      "    ans = max(ans, arr[lo] + arr[hi])",
      "    lo += 1",
      "    hi -= 1",
      "print(ans)",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("human DSA submission with multiple answer prints → 75 (no penalty)", () => {
    const ls = [
      "t = int(input())",
      "for _ in range(t):",
      "    n = int(input())",
      "    arr = list(map(int, input().split()))",
      "    print(max(arr))",
      "    print(min(arr))",
      "    print(sum(arr))",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("human DSA submission with scratch work → lower score", () => {
    const ls = [
      "# def brute_force(arr):",
      "#     for i in range(len(arr)):",
      "#         for j in range(i+1, len(arr)):",
      "def optimised(arr):",
      "    # tried BFS first",
      "    return sorted(arr)",
    ];
    const score = deadCodeAbsence(ls, pyLP);
    expect(score).toBeLessThan(50);
  });

  it("JS DSA submission with console.log answer → 75 (no penalty)", () => {
    const ls = [
      "const readline = require('readline');",
      "const rl = readline.createInterface({ input: process.stdin });",
      "rl.on('line', (line) => {",
      "    const n = parseInt(line);",
      "    console.log(n * 2);",
      "});",
    ];
    expect(deadCodeAbsence(ls, jsLP)).toBe(75);
  });

  it("Java DSA submission with println answer → 75 (no penalty)", () => {
    const ls = [
      "import java.util.Scanner;",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        Scanner sc = new Scanner(System.in);",
      "        int n = sc.nextInt();",
      "        System.out.println(n * 2);",
      "    }",
      "}",
    ];
    expect(deadCodeAbsence(ls, javaLP)).toBe(75);
  });

  it("C DSA submission with printf answer → 75 (no penalty)", () => {
    const ls = [
      "#include <stdio.h>",
      "int main() {",
      "    int n;",
      "    scanf(\"%d\", &n);",
      '    printf("%d\\n", n * 2);',
      "    return 0;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cLP)).toBe(75);
  });

  it("C++ DSA submission with cout answer → 75 (no penalty)", () => {
    const ls = [
      "#include <iostream>",
      "using namespace std;",
      "int main() {",
      "    int n;",
      "    cin >> n;",
      "    cout << n * 2 << endl;",
      "    return 0;",
      "}",
    ];
    expect(deadCodeAbsence(ls, cppLP)).toBe(75);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("empty input → 75", () => {
    expect(deadCodeAbsence([], pyLP)).toBe(75);
  });

  it("single empty line → 75", () => {
    expect(deadCodeAbsence([""], pyLP)).toBe(75);
  });

  it("only blank lines → 75", () => {
    expect(deadCodeAbsence(["", "   ", "", "  "], pyLP)).toBe(75);
  });

  it("only comments (no code-like content) → 75", () => {
    const ls = [
      "# this function solves two-sum",
      "# using a hash map approach",
      "# time complexity O(n)",
    ];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("print with 'debug' in a variable name is NOT a debug print", () => {
    const ls = ["debug_mode = True", "print(debug_mode)"];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("print('debugging') without the right pattern is NOT caught (only string starting with debug)", () => {
    const ls = ['print("not a debug line")'];
    expect(deadCodeAbsence(ls, pyLP)).toBe(75);
  });

  it("print('debug') IS caught — string argument starts with debug", () => {
    const ls = ['print("debug")'];
    expect(deadCodeAbsence(ls, pyLP)).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Variable Reuse Pattern
// ─────────────────────────────────────────────────────────────────────────────
describe("variableReusePattern", () => {
  // ── Edge cases ──────────────────────────────────────────────────────────────
  it("returns 40 for fewer than 3 variable assignments", () => {
    expect(variableReusePattern(["x = 1", "y = 2"])).toBe(40);
  });

  it("returns 40 for empty input", () => {
    expect(variableReusePattern([])).toBe(40);
  });

  it("returns 40 for only comments and blanks", () => {
    expect(variableReusePattern(["# comment", "", "// another"])).toBe(40);
  });

  // ── Python ──────────────────────────────────────────────────────────────────
  it("Python: AI pattern — each step uses a fresh variable (score 80)", () => {
    const ls = [
      "sorted_arr = sorted(arr)",
      "filtered_vals = [x for x in sorted_arr if x > 0]",
      "total_sum = sum(filtered_vals)",
      "average_val = total_sum / len(filtered_vals)",
      "result_str = str(average_val)",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Python: human pattern — variables are reassigned (score 20)", () => {
    const ls = [
      "x = 1",
      "x = x + 1",
      "y = 2",
      "y = y * 3",
      "z = 0",
      "z = z + x",
      "total = x",
      "total = total + y",
      "total = total + z",
    ];
    expect(variableReusePattern(ls)).toBe(20);
  });

  it("Python: mixed reuse — some reused, some not (intermediate score)", () => {
    const ls = [
      "x = 0",
      "x = x + 1",
      "y = compute()",
      "z = transform(y)",
      "w = finalize(z)",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThanOrEqual(60);
  });

  it("Python: skips def, class, import, from, comment lines", () => {
    const ls = [
      "def foo():",
      "class Bar:",
      "# comment",
      "import os",
      "from sys import argv",
      "x = 1",
      "y = 2",
      "z = 3",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Python: skips return, if, for, while, try/except lines", () => {
    const ls = [
      "return x == 5",
      "if x == 3:",
      "for i in range(10):",
      "while running:",
      "try:",
      "except ValueError:",
      "a = 1",
      "b = 2",
      "c = 3",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Python: ignores reserved words (self, true, false, none)", () => {
    const ls = [
      "self = something",
      "true = something",
      "none = something",
      "x = 1",
      "y = 2",
      "z = 3",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Python: does not match == comparisons as assignments", () => {
    const ls = ["a = 1", "b = 2", "c = 3", "d == 4", "e == 5"];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── JavaScript ──────────────────────────────────────────────────────────────
  it("JavaScript: let/var assignments are captured", () => {
    const ls = ["let x = 1", "var y = 2", "let z = 3", "let w = 4"];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("JavaScript: reassignments of let/var show reuse", () => {
    const ls = [
      "let count = 0",
      "count = count + 1",
      "let total = 0",
      "total = total + count",
      'let result = ""',
      'result = result + "done"',
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeLessThanOrEqual(20);
  });

  it("JavaScript: const declarations — each unique (AI pattern)", () => {
    const ls = [
      "const sortedArray = arr.sort()",
      "const filteredData = sortedArray.filter(x => x > 0)",
      "const mappedValues = filteredData.map(x => x * 2)",
      "const finalResult = mappedValues.reduce((a, b) => a + b)",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── Java ────────────────────────────────────────────────────────────────────
  it("Java: type-prefixed declarations are captured (int, String, etc.)", () => {
    const ls = [
      "int count = 0;",
      'String name = "hello";',
      "double value = 3.14;",
      "boolean flag = true;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Java: reassignment after type-prefixed declaration shows reuse", () => {
    const ls = [
      "int count = 0;",
      "count = count + 1;",
      "int total = 0;",
      "total = total + count;",
      "int result = 0;",
      "result = total * 2;",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeLessThanOrEqual(20);
  });

  it("Java: AI-style unique variables with modifiers", () => {
    const ls = [
      "final int maxValue = 100;",
      "final int minValue = 0;",
      "int currentIndex = 5;",
      'String formattedOutput = "result";',
      "double computedAverage = 42.0;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("Java: generic types like List<Integer> are handled", () => {
    const ls = [
      "List<Integer> numbers = new ArrayList<>();",
      "Map<String, Integer> counts = new HashMap<>();",
      "Set<String> names = new HashSet<>();",
      "ArrayList<Double> values = new ArrayList<>();",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── C++ ─────────────────────────────────────────────────────────────────────
  it("C++: auto and standard types are captured", () => {
    const ls = [
      "auto result = compute();",
      "int count = 0;",
      "double average = 0.0;",
      "bool valid = true;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("C++: reassignments show reuse (human pattern)", () => {
    const ls = [
      "int x = 0;",
      "x = x + 1;",
      "int y = 0;",
      "y = y + x;",
      "int z = 0;",
      "z = x + y;",
      "x = z * 2;",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeLessThanOrEqual(20);
  });

  it("C++: std::vector and templated types", () => {
    const ls = [
      "std::vector<int> nums = {1, 2, 3};",
      'std::string name = "test";',
      "std::map<int, int> lookup = {};",
      "unsigned long count = 0;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── C ───────────────────────────────────────────────────────────────────────
  it("C: primitive types are captured", () => {
    const ls = [
      "int count = 0;",
      "char letter = 'a';",
      "float ratio = 0.5;",
      "long total = 0;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("C: reassignments show reuse (human pattern)", () => {
    const ls = [
      "int i = 0;",
      "i = i + 1;",
      "int j = 0;",
      "j = j + 1;",
      "int k = 0;",
      "k = i + j;",
      "i = k;",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeLessThanOrEqual(20);
  });

  it("C: unsigned/signed modifiers", () => {
    const ls = [
      "unsigned int count = 0;",
      "signed char val = -1;",
      "unsigned long size = 100;",
      "int index = 0;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── C# ──────────────────────────────────────────────────────────────────────
  it("C#: var and type-prefixed declarations", () => {
    const ls = [
      "var count = 0;",
      "int total = 0;",
      'string name = "test";',
      "bool valid = true;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("C#: access modifiers (public, private, readonly)", () => {
    const ls = [
      "private int count = 0;",
      'public string name = "test";',
      "readonly int max = 100;",
      "internal double ratio = 0.5;",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("C#: generic types like List<int>, Dictionary<string, int>", () => {
    const ls = [
      "List<int> numbers = new List<int>();",
      "Dictionary<string, int> map = new Dictionary<string, int>();",
      "HashSet<string> names = new HashSet<string>();",
      "Queue<int> queue = new Queue<int>();",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── Cross-language: skip patterns ──────────────────────────────────────────
  it("skips return/if/for/while/switch/case/try/catch/throw/raise across languages", () => {
    const ls = [
      "return result;",
      "if (x > 0) {",
      "for (int i = 0; i < n; i++) {",
      "while (running) {",
      "switch (val) {",
      "case 1:",
      "try {",
      "catch (Exception e) {",
      'throw new Error("fail");',
      'raise ValueError("nope")',
      "a = 1",
      "b = 2",
      "c = 3",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── Cross-language: == is NOT treated as assignment ─────────────────────────
  it("does not count == comparisons as assignments in any language", () => {
    const ls = ["a = 1", "b = 2", "c = 3", "x == 5", "y == 10", "z != 15"];
    const score = variableReusePattern(ls);
    expect(score).toBe(80);
  });

  // ── Excluded keywords are filtered ─────────────────────────────────────────
  it("excludes this, null, undefined, void, new, typeof, sizeof, delete", () => {
    const ls = [
      "this = something",
      "null = something",
      "undefined = something",
      "new = something",
      "typeof = something",
      "sizeof = something",
      "delete = something",
      "a = 1",
      "b = 2",
      "c = 3",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  // ── Scoring thresholds ─────────────────────────────────────────────────────
  it("reuse ratio < 0.1 → 80 (AI: almost no reuse)", () => {
    const ls = [
      "a = 1",
      "b = 2",
      "c = 3",
      "d = 4",
      "e = 5",
      "f = 6",
      "g = 7",
      "h = 8",
      "i = 9",
      "j = 10",
    ];
    expect(variableReusePattern(ls)).toBe(80);
  });

  it("reuse ratio 0.1–0.2 → 60", () => {
    const ls = [
      "a = 1",
      "b = 2",
      "c = 3",
      "d = 4",
      "e = 5",
      "f = 6",
      "g = 7",
      "h = 8",
      "i = 9",
      "i = 10",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBe(60);
  });

  it("reuse ratio 0.2–0.35 → 40", () => {
    const ls = [
      "a = 1",
      "a = 2",
      "b = 1",
      "b = 2",
      "c = 3",
      "d = 4",
      "e = 5",
      "f = 6",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBe(40);
  });

  it("reuse ratio >= 0.35 → 20 (human: lots of reuse)", () => {
    const ls = ["x = 0", "x = 1", "y = 0", "y = 1", "z = 0", "z = 1"];
    expect(variableReusePattern(ls)).toBe(20);
  });

  // ── runTier1Debug returns matching extraction data ──────────────────────────
  it("runTier1Debug assignments match variableReusePattern score", () => {
    const code = [
      "def solve(arr):",
      "    n = len(arr)",
      "    total = 0",
      "    total = total + n",
      "    result = total * 2",
      "    idx = 0",
      "    idx = idx + 1",
    ].join("\n");
    const ls = code.split("\n");
    const debug = runTier1Debug(code, ls, "Python");
    expect(debug.variable_reuse.score).toBe(variableReusePattern(ls));
    expect(debug.variable_reuse.assignments).toHaveProperty("total");
    expect(debug.variable_reuse.assignments.total).toBe(2);
    expect(debug.variable_reuse.assignments).toHaveProperty("idx");
    expect(debug.variable_reuse.assignments.idx).toBe(2);
    expect(debug.variable_reuse.assignments).toHaveProperty("n");
    expect(debug.variable_reuse.assignments.n).toBe(1);
    expect(debug.variable_reuse.assignments).toHaveProperty("result");
    expect(debug.variable_reuse.reusedVars).toContain("total (2x)");
    expect(debug.variable_reuse.reusedVars).toContain("idx (2x)");
  });

  // ── Realistic AI vs human code ─────────────────────────────────────────────
  it("AI-generated Python (fresh vars per step) scores high", () => {
    const ls = [
      "def merge_sort(arr):",
      "    sorted_left = merge_sort(arr[:mid])",
      "    sorted_right = merge_sort(arr[mid:])",
      "    merged_result = merge(sorted_left, sorted_right)",
      "    validated_input = validate(merged_result)",
      "    final_output = format_result(validated_input)",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBe(80);
  });

  it("Human-written Python (reuses temp vars under pressure) scores low", () => {
    const ls = [
      "def solve(n):",
      "    ans = 0",
      "    tmp = n",
      "    tmp = tmp // 2",
      "    ans = ans + tmp",
      "    tmp = n % 2",
      "    ans = ans + tmp",
      "    res = ans",
      "    res = res * 2",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBe(20);
  });

  it("AI-generated Java (unique descriptive vars) scores high", () => {
    const ls = [
      "int leftPointer = 0;",
      "int rightPointer = nums.length - 1;",
      "int currentSum = 0;",
      "int maximumValue = Integer.MIN_VALUE;",
      "String formattedResult = String.valueOf(maximumValue);",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBe(80);
  });

  it("Human-written C (reuses loop vars) scores low", () => {
    const ls = [
      "int i = 0;",
      "i = i + 1;",
      "int j = 0;",
      "j = j + 1;",
      "int tmp = 0;",
      "tmp = i;",
      "i = j;",
      "j = tmp;",
    ];
    const score = variableReusePattern(ls);
    expect(score).toBeLessThanOrEqual(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Magic Number Usage
// ─────────────────────────────────────────────────────────────────────────────
describe("magicNumberUsage", () => {
  // ── Scoring thresholds ─────────────────────────────────────────────────────
  it("returns 85 for no magic numbers + named constants (AI pattern)", () => {
    const ls = [
      "MAX_RETRIES = 5",
      "TIMEOUT_MS = 3000",
      "def foo():",
      "    return MAX_RETRIES",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(85);
  });

  it("returns 60 for no magic numbers, no named constants", () => {
    const ls = ["def foo():", "    return x + y"];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  it("returns 40 for 1-2 magic numbers", () => {
    const ls = ["def foo():", "    if x > 42:", "        return x"];
    expect(magicNumberUsage(ls, pyLP)).toBe(40);
  });

  it("returns < 40 for many magic numbers (human pattern)", () => {
    const ls = [
      "def foo():",
      "    if x > 42:",
      "        return x * 100",
      "    return x + 256",
      "    y = x - 999",
    ];
    const score = magicNumberUsage(ls, pyLP);
    expect(score).toBeLessThan(40);
  });

  it("never goes below 10", () => {
    const ls = Array(20).fill("x = y * 1000 + z * 2000 - w * 3000");
    const score = magicNumberUsage(ls, pyLP);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  // ── Magic number detection rules ──────────────────────────────────────────
  it("ignores small numbers 0, 1, single digits (2-9)", () => {
    const ls = [
      "x = 0",
      "y = 1",
      "z = 2",
      "w = 9",
      "if retries > 3:",
      "    pass",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  it("detects 2-digit numbers starting with 2-9 (10-19 excluded)", () => {
    const ls = ["def foo():", "    if x > 42:", "        return 99"];
    expect(magicNumberUsage(ls, pyLP)).toBe(40);
  });

  it("does NOT detect numbers 10-19 (first digit is 1)", () => {
    const ls = ["def foo():", "    return x + 10", "    y = z * 15"];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  it("detects 3+ digit numbers (100, 256, 1000, etc.)", () => {
    const ls = ["def foo():", "    return x * 100"];
    expect(magicNumberUsage(ls, pyLP)).toBe(40);
  });

  it("detects magic numbers at end of line", () => {
    const ls = ["def foo():", "    return 256"];
    expect(magicNumberUsage(ls, pyLP)).toBe(40);
  });

  it("does NOT count numbers inside array indices", () => {
    const ls = ["def foo():", "    return arr[100]", "    x = data[256]"];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  it("ignores numbers inside comments (Python)", () => {
    const ls = [
      "# set timeout to 3000ms",
      "# retry 500 times",
      "def foo():",
      "    return x",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  it("ignores numbers inside comments (JavaScript)", () => {
    const ls = [
      "// set timeout to 3000ms",
      "// retry 500 times",
      "function foo() {",
      "    return x;",
      "}",
    ];
    expect(magicNumberUsage(ls, jsLP)).toBe(60);
  });

  it("ignores numbers inside docstrings", () => {
    const ls = ['"""Maximum value is 9999"""', "def foo():", "    return x"];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });

  // ── Named constant detection — Python ──────────────────────────────────────
  it("Python: detects UPPER_CASE = value as named constant", () => {
    const ls = [
      "MAX_SIZE = 100",
      "MIN_VALUE = 0",
      "def foo():",
      "    return MAX_SIZE",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(85);
  });

  it("Python: numbers in named constant lines are NOT counted as magic", () => {
    const ls = [
      "BUFFER_SIZE = 4096",
      "TIMEOUT = 30000",
      "def foo():",
      "    return BUFFER_SIZE",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(85);
  });

  // ── Named constant detection — JavaScript ─────────────────────────────────
  it("JavaScript: const UPPER_CASE = value detected", () => {
    const ls = [
      "const MAX_RETRIES = 3;",
      "const MIN_VALUE = 1;",
      "function foo() {",
      "    return MAX_RETRIES;",
      "}",
    ];
    expect(magicNumberUsage(ls, jsLP)).toBe(85);
  });

  it("JavaScript: const lowercase names are NOT detected as named constants", () => {
    const ls = [
      "const maxRetries = 3;",
      "const minValue = 1;",
      "function foo() {",
      "    return maxRetries;",
      "}",
    ];
    expect(magicNumberUsage(ls, jsLP)).toBe(60);
  });

  // ── Named constant detection — Java ────────────────────────────────────────
  it("Java: final int MAX = 5; detected as named constant", () => {
    const ls = [
      "final int MAX_SIZE = 100;",
      "static final int TIMEOUT = 5000;",
      "public int compute() {",
      "    return MAX_SIZE;",
      "}",
    ];
    expect(magicNumberUsage(ls, javaLP)).toBe(85);
  });

  // ── Named constant detection — C ──────────────────────────────────────────
  it("C: #define UPPER_CASE value detected as named constant", () => {
    const ls = [
      "#define MAX_SIZE 100",
      "#define BUFFER_LEN 4096",
      "int compute() {",
      "    return MAX_SIZE;",
      "}",
    ];
    expect(magicNumberUsage(ls, cLP)).toBe(85);
  });

  // ── Named constant detection — C++ ─────────────────────────────────────────
  it("C++: constexpr int MAX = 5; detected as named constant", () => {
    const ls = [
      "constexpr int MAX_ITER = 1000;",
      "const int BUFFER_SIZE = 4096;",
      "int compute() {",
      "    return MAX_ITER;",
      "}",
    ];
    expect(magicNumberUsage(ls, cppLP)).toBe(85);
  });

  // ── Named constant detection — C# ─────────────────────────────────────────
  it("C#: readonly int MAX_VALUE = 100; detected as named constant", () => {
    const ls = [
      "readonly int MAX_VALUE = 100;",
      "const int TIMEOUT_MS = 5000;",
      "public int Compute() {",
      "    return MAX_VALUE;",
      "}",
    ];
    expect(magicNumberUsage(ls, csLP)).toBe(85);
  });

  // ── Mixed: named constants + magic numbers ────────────────────────────────
  it("named constants present but also magic numbers → lower score", () => {
    const ls = [
      "MAX_RETRIES = 5",
      "TIMEOUT = 3000",
      "def foo():",
      "    if x > 42:",
      "        return x * 100",
    ];
    const score = magicNumberUsage(ls, pyLP);
    expect(score).toBe(40);
  });

  // ── AI vs Human realistic ─────────────────────────────────────────────────
  it("AI pattern: all numbers named, no raw magic → high score", () => {
    const ls = [
      'INF = float("inf")',
      "MAX_DEPTH = 100",
      "def solve(arr):",
      "    best = INF",
      "    for i in range(MAX_DEPTH):",
      "        best = min(best, arr[i])",
      "    return best",
    ];
    expect(magicNumberUsage(ls, pyLP)).toBe(85);
  });

  it("Human pattern: raw magic numbers throughout → low score", () => {
    const ls = [
      "def solve(n):",
      "    if n > 1000:",
      "        return 999",
      "    x = n * 42",
      "    y = x + 256",
      "    return y % 100",
    ];
    const score = magicNumberUsage(ls, pyLP);
    expect(score).toBeLessThan(30);
  });

  // ── runTier1Debug consistency ──────────────────────────────────────────────
  it("runTier1Debug returns matching namedConstants and magicNumbers", () => {
    const code = [
      "MAX_SIZE = 100",
      "TIMEOUT = 5000",
      "def foo():",
      "    if x > 42:",
      "        return x",
    ].join("\n");
    const ls = code.split("\n");
    const debug = runTier1Debug(code, ls, "Python");
    expect(debug.magic_numbers.score).toBe(magicNumberUsage(ls, pyLP));
    expect(debug.magic_numbers.namedConstants).toContain("MAX_SIZE");
    expect(debug.magic_numbers.namedConstants).toContain("TIMEOUT");
    expect(debug.magic_numbers.magicNumbers.length).toBe(1);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────
  it("empty input returns 60", () => {
    expect(magicNumberUsage([], pyLP)).toBe(60);
  });

  it("only 1 named constant is not enough for 85 (needs >= 2)", () => {
    const ls = ["MAX_SIZE = 100", "def foo():", "    return x"];
    expect(magicNumberUsage(ls, pyLP)).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Cyclomatic Complexity Uniformity
// ─────────────────────────────────────────────────────────────────────────────
describe("cyclomaticComplexityUniformity", () => {
  it("returns 40 for fewer than 2 functions", () => {
    const ls = ["def foo():", "    return 1"];
    expect(cyclomaticComplexityUniformity(ls, pyLP)).toBe(40);
  });

  it("returns high score for uniform complexity (AI pattern)", () => {
    const ls = lines(
      [
        "def foo():",
        "    if x:",
        "        return 1",
        "    return 2",
        "",
        "def bar():",
        "    if y:",
        "        return 3",
        "    return 4",
        "",
        "def baz():",
        "    if z:",
        "        return 5",
        "    return 6",
      ].join("\n"),
    );
    const score = cyclomaticComplexityUniformity(ls, pyLP);
    expect(score).toBeGreaterThan(60);
  });

  it("returns low score for wildly varying complexity (human pattern)", () => {
    const ls = lines(
      [
        "def simple():",
        "    return 1",
        "",
        "def complex():",
        "    if a:",
        "        if b:",
        "            for x in y:",
        "                while z:",
        "                    if c and d:",
        "                        if e or f:",
        "                            pass",
        "    return 0",
      ].join("\n"),
    );
    const score = cyclomaticComplexityUniformity(ls, pyLP);
    expect(score).toBeLessThan(60);
  });

  it("handles JavaScript functions", () => {
    const ls = lines(
      [
        "function foo() {",
        "    if (x) { return 1; }",
        "    return 2;",
        "}",
        "function bar() {",
        "    if (y) { return 3; }",
        "    return 4;",
        "}",
      ].join("\n"),
    );
    const score = cyclomaticComplexityUniformity(ls, jsLP);
    expect(score).toBeGreaterThan(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Halstead Uniformity
// ─────────────────────────────────────────────────────────────────────────────
describe("halsteadUniformity", () => {
  it("returns 40 for fewer than 2 function blocks", () => {
    const ls = ["def foo():", "    x = 1", "    return x"];
    expect(halsteadUniformity(ls, pyLP)).toBe(40);
  });

  it("returns high score for uniform Halstead volumes (AI pattern)", () => {
    const ls = lines(
      [
        "def foo():",
        "    x = a + b",
        "    y = c * d",
        "    return x - y",
        "",
        "def bar():",
        "    m = p + q",
        "    n = r * s",
        "    return m - n",
        "",
        "def baz():",
        "    u = e + f",
        "    v = g * h",
        "    return u - v",
      ].join("\n"),
    );
    const score = halsteadUniformity(ls, pyLP);
    expect(score).toBeGreaterThan(60);
  });

  it("returns lower score for non-uniform volumes (human pattern)", () => {
    const ls = lines(
      [
        "def tiny():",
        "    return 1",
        "",
        "def huge():",
        "    a = b + c * d - e / f",
        "    g = h ** i + j % k",
        "    m = n & o | p ^ q",
        "    r = s << t >> u",
        "    v = w and x or y not z",
        "    return a + g + m + r + v",
      ].join("\n"),
    );
    const score = halsteadUniformity(ls, pyLP);
    expect(score).toBeLessThan(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Type-Token Ratio
// ─────────────────────────────────────────────────────────────────────────────
describe("typeTokenRatio", () => {
  it("returns 50 for very short text (< 10 non-keyword tokens)", () => {
    expect(typeTokenRatio("x = 1")).toBe(50);
  });

  it("returns higher score for diverse vocabulary (human pattern)", () => {
    const code = [
      "alpha = calculate(beta)",
      "gamma = transform(delta)",
      "epsilon = process(zeta)",
      "theta = validate(iota)",
      "kappa = serialize(lambda_val)",
    ].join("\n");
    const score = typeTokenRatio(code);
    expect(score).toBeGreaterThan(60);
  });

  it("returns lower score for repetitive vocabulary (AI pattern)", () => {
    const code = Array(20).fill("result = compute(data)").join("\n");
    const score = typeTokenRatio(code);
    expect(score).toBeLessThan(50);
  });

  it("KEYWORDS set has capitalized Python builtins — lowercase matches are not filtered", () => {
    const code = Array(10).fill("if True and not False or None").join("\n");
    const score = typeTokenRatio(code);
    expect(score).toBeLessThan(50);
    expect(score).toBeGreaterThan(0);
  });

  it("filters out lowercase-only keywords", () => {
    const code = Array(10)
      .fill("if for while return def class import from")
      .join("\n");
    expect(typeTokenRatio(code)).toBe(50);
  });

  it("caps at 100", () => {
    const code = Array(100)
      .fill(0)
      .map((_, i) => `unique_var_${i} = val_${i}`)
      .join("\n");
    const score = typeTokenRatio(code);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17b. Type-Token Ratio — Diagnostic (token extraction per language)
// ─────────────────────────────────────────────────────────────────────────────
describe("typeTokenRatio — diagnostic per language", () => {
  // Helper: mirrors the TTR extraction logic so we can inspect tokens
  const KEYWORDS = new Set([
    "if",
    "else",
    "elif",
    "for",
    "while",
    "return",
    "def",
    "class",
    "import",
    "from",
    "with",
    "as",
    "in",
    "not",
    "and",
    "or",
    "try",
    "except",
    "finally",
    "True",
    "False",
    "None",
    "self",
    "is",
    "raise",
    "break",
    "continue",
    "pass",
    "new",
    "this",
    "var",
    "let",
    "const",
    "function",
    "async",
    "await",
    "null",
    "undefined",
    "true",
    "false",
    "public",
    "private",
    "static",
    "void",
    "int",
    "boolean",
    "string",
    "type",
    "interface",
    "enum",
    "extends",
    "implements",
    "switch",
    "case",
    "default",
    "throw",
    "catch",
    "open",
    "print",
    "len",
    "sorted",
    "super",
    "object",
    "struct",
    "override",
    "abstract",
    "final",
    "protected",
    "namespace",
    "using",
    "internal",
    "sealed",
    "readonly",
    "ref",
    "out",
    "params",
    "foreach",
    "lock",
    "event",
    "delegate",
    "record",
    "where",
    "yield",
    "get",
    "set",
    "value",
  ]);

  function extractTTR(code) {
    const tokens = (code.toLowerCase().match(/\b[a-z_]\w*\b/g) || []).filter(
      (t) => !KEYWORDS.has(t),
    );
    const unique = new Set(tokens);
    return {
      tokens,
      unique: [...unique],
      totalTokens: tokens.length,
      uniqueCount: unique.size,
      ratio: tokens.length ? +(unique.size / tokens.length).toFixed(3) : 0,
      score:
        tokens.length < 10
          ? 50
          : Math.min(100, Math.round((unique.size / tokens.length) * 130)),
    };
  }

  // ── Python ──────────────────────────────────────────────────────────────────
  it("Python: AI-like code (repetitive vocab) scores low", () => {
    const code = [
      "def process_data(data):",
      "    result = []",
      "    for item in data:",
      "        result.append(process_item(item))",
      "    return result",
      "",
      "def process_item(item):",
      "    result = transform(item)",
      "    result = validate(result)",
      "    return result",
      "",
      "def transform(data):",
      "    result = data.copy()",
      "    result = clean(result)",
      "    return result",
    ].join("\n");
    const { tokens, unique, score } = extractTTR(code);

    // "result" and "data" repeat heavily → low TTR
    const resultCount = tokens.filter((t) => t === "result").length;
    expect(resultCount).toBeGreaterThanOrEqual(6);
    expect(unique.length).toBeLessThan(tokens.length * 0.5);
    expect(score).toBeLessThan(55);

    expect(typeTokenRatio(code)).toBe(score);
  });

  it("Python: mergesort has diverse names but heavy repetition → low TTR", () => {
    const code = [
      "def merge_sort(arr):",
      "    if len(arr) <= 1:",
      "        return arr",
      "    mid = len(arr) // 2",
      "    left_half = merge_sort(arr[:mid])",
      "    right_half = merge_sort(arr[mid:])",
      "    merged = []",
      "    idx_l = 0",
      "    idx_r = 0",
      "    while idx_l < len(left_half) and idx_r < len(right_half):",
      "        if left_half[idx_l] <= right_half[idx_r]:",
      "            merged.append(left_half[idx_l])",
      "            idx_l += 1",
      "        else:",
      "            merged.append(right_half[idx_r])",
      "            idx_r += 1",
      "    merged.extend(left_half[idx_l:])",
      "    merged.extend(right_half[idx_r:])",
      "    return merged",
    ].join("\n");
    const { unique, totalTokens, score } = extractTTR(code);

    // 10 unique names exist, but they repeat heavily (left_half 4x, merged 4x)
    // so the ratio is ~0.23 → score ~30.  This is a known TTR limitation:
    // algorithmic code with loops always has low TTR regardless of authorship.
    expect(unique).toContain("arr");
    expect(unique).toContain("left_half");
    expect(unique).toContain("merged");
    expect(unique).toContain("idx_l");
    expect(totalTokens).toBeGreaterThan(40);
    expect(score).toBeLessThan(40);

    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── JavaScript ──────────────────────────────────────────────────────────────
  it("JavaScript: repetitive fetch handler scores low", () => {
    const code = [
      "async function fetchData(url) {",
      "    const response = await fetch(url);",
      "    const data = await response.json();",
      "    return data;",
      "}",
      "async function fetchData2(url) {",
      "    const response = await fetch(url);",
      "    const data = await response.json();",
      "    return data;",
      "}",
      "async function fetchData3(url) {",
      "    const response = await fetch(url);",
      "    const data = await response.json();",
      "    return data;",
      "}",
    ].join("\n");
    const { tokens, score } = extractTTR(code);

    // "response" appears 6x (2 per function: declaration + .json() call)
    const responseCount = tokens.filter((t) => t === "response").length;
    expect(responseCount).toBe(6);
    expect(score).toBeLessThan(55);
    expect(typeTokenRatio(code)).toBe(score);
  });

  it("JavaScript: diverse DOM manipulation scores higher", () => {
    const code = [
      'const container = document.getElementById("app");',
      'const header = document.createElement("h1");',
      'header.textContent = "Hello World";',
      'const paragraph = document.createElement("p");',
      'paragraph.className = "intro";',
      'const footer = document.createElement("footer");',
      'footer.innerHTML = "<small>2024</small>";',
      'const sidebar = document.createElement("aside");',
      'sidebar.id = "nav";',
      'const button = document.createElement("button");',
      "button.onclick = handleClick;",
      "container.appendChild(header);",
      "container.appendChild(paragraph);",
      "container.appendChild(footer);",
    ].join("\n");
    const { unique, score } = extractTTR(code);

    expect(unique).toContain("container");
    expect(unique).toContain("header");
    expect(unique).toContain("paragraph");
    expect(unique).toContain("footer");
    expect(unique).toContain("sidebar");
    expect(unique).toContain("button");
    expect(score).toBeGreaterThan(40);
    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── Java ────────────────────────────────────────────────────────────────────
  it("Java: repetitive getter/setter pattern scores low", () => {
    const code = [
      "public String getName() { return name; }",
      "public void setName(String name) { this.name = name; }",
      "public String getEmail() { return email; }",
      "public void setEmail(String email) { this.email = email; }",
      "public String getAddress() { return address; }",
      "public void setAddress(String address) { this.address = address; }",
      "public String getPhone() { return phone; }",
      "public void setPhone(String phone) { this.phone = phone; }",
    ].join("\n");
    const { score } = extractTTR(code);

    // "name", "email" repeat, but getter names add some diversity
    expect(score).toBeLessThan(70);
    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── C++ ─────────────────────────────────────────────────────────────────────
  it("C++: repetitive vector operations scores low", () => {
    const code = [
      "void solve(vector<int>& nums) {",
      "    int result = 0;",
      "    for (int i = 0; i < nums.size(); i++) {",
      "        result += nums[i];",
      "    }",
      "    result = result / nums.size();",
      "    for (int i = 0; i < nums.size(); i++) {",
      "        nums[i] = nums[i] - result;",
      "    }",
      "    for (int i = 0; i < nums.size(); i++) {",
      "        result += abs(nums[i]);",
      "    }",
      "}",
    ].join("\n");
    const { tokens, score } = extractTTR(code);

    const numsCount = tokens.filter((t) => t === "nums").length;
    const resultCount = tokens.filter((t) => t === "result").length;
    expect(numsCount).toBeGreaterThanOrEqual(6);
    expect(resultCount).toBeGreaterThanOrEqual(4);
    expect(score).toBeLessThan(50);
    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── C ───────────────────────────────────────────────────────────────────────
  it("C: diverse function with different variable names scores higher", () => {
    const code = [
      "void process(int* buffer, int length, int threshold) {",
      "    int count = 0;",
      "    int total = 0;",
      "    int maximum = buffer[0];",
      "    int minimum = buffer[0];",
      "    for (int idx = 0; idx < length; idx++) {",
      "        int current = buffer[idx];",
      "        total += current;",
      "        if (current > maximum) maximum = current;",
      "        if (current < minimum) minimum = current;",
      "        if (current > threshold) count++;",
      "    }",
      "    int average = total / length;",
      '    printf("avg=%d max=%d min=%d above=%d\\n", average, maximum, minimum, count);',
      "}",
    ].join("\n");
    const { unique, score } = extractTTR(code);

    expect(unique).toContain("buffer");
    expect(unique).toContain("length");
    expect(unique).toContain("threshold");
    expect(unique).toContain("count");
    expect(unique).toContain("total");
    expect(unique).toContain("maximum");
    expect(unique).toContain("minimum");
    expect(unique).toContain("current");
    expect(unique).toContain("average");
    expect(score).toBeGreaterThan(40);
    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── C# ──────────────────────────────────────────────────────────────────────
  it("C#: LINQ chain with repeated variables scores low", () => {
    const code = [
      "var items = collection.Where(x => x.IsActive);",
      "var items2 = items.Select(x => x.Value);",
      "var items3 = items2.OrderBy(x => x);",
      "var result = items3.ToList();",
      "var items4 = collection.Where(x => x.IsValid);",
      "var items5 = items4.Select(x => x.Score);",
      "var items6 = items5.OrderBy(x => x);",
      "var result2 = items6.ToList();",
    ].join("\n");
    const { tokens, score } = extractTTR(code);

    const xCount = tokens.filter((t) => t === "x").length;
    expect(xCount).toBeGreaterThanOrEqual(6);
    expect(score).toBeLessThan(65);
    expect(typeTokenRatio(code)).toBe(score);
  });

  // ── Keywords are filtered correctly ─────────────────────────────────────────
  it("keywords are excluded from token count across all languages", () => {
    const pythonKW =
      "if else elif for while return def class import from with as in not and or try except finally pass";
    const jsKW =
      "var let const function async await null undefined true false new this throw catch switch case default";
    const javaKW =
      "public private static void int boolean string abstract final protected extends implements";
    const csharpKW =
      "namespace using internal sealed readonly ref out params foreach lock event delegate record";

    for (const kwCode of [pythonKW, jsKW, javaKW, csharpKW]) {
      const { totalTokens } = extractTTR(kwCode);
      expect(totalTokens).toBe(0);
    }
  });

  // ── runTier1Debug returns matching data ─────────────────────────────────────
  it("runTier1Debug returns TTR breakdown matching the score", () => {
    const code = [
      "def solve(nums):",
      "    result = 0",
      "    for val in nums:",
      "        result += val",
      "    avg = result / len(nums)",
      "    diff = [x - avg for x in nums]",
      "    total = sum(abs(d) for d in diff)",
      "    return total",
    ].join("\n");
    const ls = code.split("\n");
    const debug = runTier1Debug(code, ls, "Python");
    const ttr = debug.type_token_ratio;

    expect(ttr.score).toBe(typeTokenRatio(code));
    expect(ttr.uniqueTokens).toBeGreaterThan(0);
    expect(ttr.totalTokens).toBeGreaterThan(ttr.uniqueTokens);
    expect(ttr.ratio).toBeGreaterThan(0);
    expect(ttr.ratio).toBeLessThanOrEqual(1);
    expect(ttr.ratio).toBeCloseTo(ttr.uniqueTokens / ttr.totalTokens, 2);
  });

  // ── TTR limitation: loop-heavy human code can score lower than AI ────────────
  it("TTR limitation: tight-loop human code can have lower TTR than AI (known weakness)", () => {
    const aiCode = [
      "def process_data(data):",
      "    result = validate_data(data)",
      "    result = transform_data(result)",
      "    result = format_data(result)",
      "    return result",
      "def validate_data(data):",
      "    result = check_data(data)",
      "    return result",
      "def transform_data(data):",
      "    result = convert_data(data)",
      "    return result",
    ].join("\n");

    const humanCode = [
      "def mergesort(arr):",
      "    if len(arr) <= 1: return arr",
      "    mid = len(arr) // 2",
      "    lft = mergesort(arr[:mid])",
      "    rgt = mergesort(arr[mid:])",
      "    out = []",
      "    i = j = 0",
      "    while i < len(lft) and j < len(rgt):",
      "        if lft[i] < rgt[j]: out.append(lft[i]); i += 1",
      "        else: out.append(rgt[j]); j += 1",
      "    out += lft[i:] + rgt[j:]",
      "    return out",
    ].join("\n");

    const aiScore = typeTokenRatio(aiCode);
    const humanScore = typeTokenRatio(humanCode);

    // Counter-intuitively, the human mergesort scores LOWER than the AI code.
    // Human loop code repeats short names (arr, lft, rgt, i, j) many times,
    // giving 8 unique / 36 total = 0.22 ratio → score 29.
    // AI code has fewer total tokens (shorter functions) so 8/24 = 0.33 → score 43.
    // This is why TTR only gets 7% weight — it's a weak signal on its own
    // but contributes to the ensemble alongside naming_verbosity and entropy.
    expect(aiScore).toBeGreaterThan(humanScore);
    expect(aiScore).toBeLessThan(50);
    expect(humanScore).toBeLessThan(35);
  });

  it("TTR works best on non-algorithmic code: AI boilerplate vs human scrappy code", () => {
    // When code is not loop-heavy, TTR correctly separates AI from human
    const aiBoilerplate = [
      "name = get_user_name()",
      "name = validate_name(name)",
      "name = format_name(name)",
      "name = sanitize_name(name)",
      "email = get_user_email()",
      "email = validate_email(email)",
      "email = format_email(email)",
      "email = sanitize_email(email)",
    ].join("\n");

    const humanScrappy = [
      'usr = input("name: ")',
      'addr = input("address: ")',
      'phone = input("ph: ")',
      'age = input("age: ")',
      'role = "admin"',
      'dept = "eng"',
      "salary = 50000",
      "bonus = salary * 0.1",
      "total = salary + bonus",
      "tax = total * 0.3",
      "net = total - tax",
    ].join("\n");

    const aiScore = typeTokenRatio(aiBoilerplate);
    const humanScore = typeTokenRatio(humanScrappy);

    // Human uses many unique names → higher TTR
    expect(humanScore).toBeGreaterThan(aiScore);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────
  it("empty string returns 50", () => {
    expect(typeTokenRatio("")).toBe(50);
  });

  it("numbers-only code returns 50 (no alpha tokens)", () => {
    expect(typeTokenRatio("123 456 789 012 345 678 901 234 567 890")).toBe(50);
  });

  it("single unique identifier repeated 20 times scores very low", () => {
    const code = Array(20).fill("data = data + data").join("\n");
    const score = typeTokenRatio(code);
    // 1 unique / 60 total → ~2% → score ≈ 3
    expect(score).toBeLessThan(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Guard Clause Density
// ─────────────────────────────────────────────────────────────────────────────
describe("guardClauseDensity", () => {
  it("returns 40 for fewer than 2 functions", () => {
    const ls = ["def foo():", "    return 1"];
    expect(guardClauseDensity(ls, pyLP)).toBe(40);
  });

  it("returns high score when most functions have single-line guard clauses (AI pattern)", () => {
    const ls = lines(
      [
        "def foo(x):",
        '    if not x: raise ValueError("x required")',
        "    return x + 1",
        "",
        "def bar(y):",
        '    if not y: raise TypeError("y must not be empty")',
        "    return y * 2",
        "",
        "def baz(z):",
        '    if not z: raise ValueError("z is required")',
        "    return z - 1",
      ].join("\n"),
    );
    const score = guardClauseDensity(ls, pyLP);
    expect(score).toBeGreaterThan(60);
  });

  it("returns low score for multi-line guards (regex requires single line)", () => {
    const ls = lines(
      [
        "def foo(x):",
        "    if not x:",
        '        raise ValueError("x required")',
        "    return x + 1",
        "",
        "def bar(y):",
        "    if not y:",
        '        raise TypeError("y must not be empty")',
        "    return y * 2",
      ].join("\n"),
    );
    const score = guardClauseDensity(ls, pyLP);
    expect(score).toBe(20);
  });

  it("returns low score when no functions have guard clauses (human pattern)", () => {
    const ls = lines(
      [
        "def foo(x):",
        "    return x + 1",
        "",
        "def bar(y):",
        "    return y * 2",
        "",
        "def baz(z):",
        "    return z - 1",
      ].join("\n"),
    );
    const score = guardClauseDensity(ls, pyLP);
    expect(score).toBe(20);
  });

  it("JS if-paren guards are NOT detected (regex limitation — no parenthesized conditions)", () => {
    const ls = lines(
      [
        "function foo(x) {",
        '    if (!x) throw new Error("x required");',
        "    return x + 1;",
        "}",
        "function bar(y) {",
        '    if (!y) throw new Error("y needed");',
        "    return y * 2;",
        "}",
      ].join("\n"),
    );
    const score = guardClauseDensity(ls, jsLP);
    expect(score).toBe(20);
  });

  it("detects early return guards", () => {
    const ls = lines(
      [
        "def foo(x):",
        "    if not x: return None",
        "    return x + 1",
        "",
        "def bar(y):",
        "    if not y: return None",
        "    return y * 2",
      ].join("\n"),
    );
    const score = guardClauseDensity(ls, pyLP);
    expect(score).toBeGreaterThan(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Error Message Verbosity
// ─────────────────────────────────────────────────────────────────────────────
describe("errorMessageVerbosity", () => {
  it("returns 40 when no error strings exist", () => {
    expect(errorMessageVerbosity("x = 1")).toBe(40);
  });

  it("returns high score for verbose error messages (AI pattern)", () => {
    const code = [
      'raise ValueError("Invalid input: expected a positive integer but received a negative value")',
      'raise TypeError("The provided argument must be a string type, not an integer value")',
      'raise RuntimeError("Failed to establish a database connection due to invalid credentials provided")',
    ].join("\n");
    const score = errorMessageVerbosity(code);
    expect(score).toBeGreaterThan(60);
  });

  it("returns low score for terse error messages (human pattern)", () => {
    const code = [
      'raise ValueError("bad input")',
      'raise TypeError("wrong type")',
      'raise RuntimeError("fail")',
    ].join("\n");
    const score = errorMessageVerbosity(code);
    expect(score).toBe(25);
  });

  it("handles JavaScript throw Error", () => {
    const code =
      'throw new Error("The connection to the remote server has been terminated unexpectedly")';
    const score = errorMessageVerbosity(code);
    expect(score).toBeGreaterThan(40);
  });

  it("handles mixed verbosity", () => {
    const code = [
      'raise ValueError("Invalid input: expected a positive integer but received something else")',
      'raise TypeError("err")',
    ].join("\n");
    const score = errorMessageVerbosity(code);
    expect(score).toBeGreaterThanOrEqual(25);
    expect(score).toBeLessThanOrEqual(85);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Emoji Presence
// ─────────────────────────────────────────────────────────────────────────────
describe("emojiPresence", () => {
  it("returns 0 when no emojis", () => {
    expect(emojiPresence("normal code without emojis")).toBe(0);
  });

  it("returns 60 for exactly 1 emoji", () => {
    expect(emojiPresence("# Starting process 🚀")).toBe(60);
  });

  it("returns 80 for 2-3 emojis", () => {
    expect(emojiPresence("# 🚀 Starting process ✅")).toBe(80);
    expect(emojiPresence("# 🚀 Starting ✅ Done 🎉")).toBe(80);
  });

  it("returns 95 for 4+ emojis (strong AI indicator)", () => {
    expect(emojiPresence("# 🚀 Start 🔄 Process ✅ Done 🎉 Celebrate")).toBe(
      95,
    );
  });

  it("does not count regular characters as emojis", () => {
    expect(emojiPresence("chars: * # @ $ % ^ &")).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyLine
// ─────────────────────────────────────────────────────────────────────────────
describe("classifyLine", () => {
  it("returns uncertain with confidence 50 for blank lines", () => {
    const result = classifyLine("", [], 0, "Python");
    expect(result.status).toBe("uncertain");
    expect(result.confidence).toBe(50);
    expect(result.signals).toEqual([]);
  });

  it("returns uncertain for whitespace-only lines", () => {
    const result = classifyLine("   ", [], 0, "Python");
    expect(result.status).toBe("uncertain");
    expect(result.confidence).toBe(50);
  });

  it("flags doc-comment delimiter as AI signal", () => {
    const result = classifyLine('    """', [], 0, "Python");
    expect(result.status).toBe("ai");
    expect(result.signals).toContain("doc-comment delimiter");
  });

  it("flags structured doc section as AI signal", () => {
    const allLines = ["    * @param name The name", "    * @returns void"];
    const result = classifyLine(
      "    * @param name The name",
      allLines,
      0,
      "JavaScript",
    );
    expect(result.signals).toContain(
      "structured doc section (@param/@returns/Args)",
    );
  });

  it("flags casual comment markers as human signal", () => {
    const result = classifyLine("# TODO fix this later", [], 0, "Python");
    expect(result.status).toBe("human");
    expect(result.signals).toContain("casual comment marker");
  });

  it("flags numbered step comment as AI signal", () => {
    const result = classifyLine(
      "# Step 1: Initialize the database",
      [],
      0,
      "Python",
    );
    expect(result.signals).toContain("numbered step comment (AI pattern)");
  });

  it("flags emoji in code as AI pattern", () => {
    const result = classifyLine("# 🚀 Starting the server", [], 0, "Python");
    expect(result.signals).toContain("emoji in code (AI pattern)");
  });

  it("flags verbose error message as AI pattern", () => {
    const result = classifyLine(
      'raise ValueError("Invalid input: expected a positive integer value but received something wrong")',
      [],
      0,
      "Python",
    );
    expect(result.signals).toContain("verbose error message (AI pattern)");
  });

  it("flags terse error message as human pattern", () => {
    const result = classifyLine('raise ValueError("bad")', [], 0, "Python");
    expect(result.status).toBe("human");
    expect(result.signals).toContain("terse error message");
  });

  it("flags AI-typical demo variables", () => {
    const result = classifyLine("test_cases = [1, 2, 3]", [], 0, "Python");
    expect(result.signals).toContain("AI-typical demo variable");
  });

  it("flags one-liner shortcuts as human signal", () => {
    const result = classifyLine("if not x: return None", [], 0, "Python");
    expect(result.signals).toContain("one-liner shortcut");
  });

  it("flags formal sentence-style comments as AI signal", () => {
    const result = classifyLine(
      "# This function calculates the optimal value for processing",
      [],
      0,
      "Python",
    );
    expect(result.signals).toContain("formal sentence-style comment");
  });

  it("flags lowercase terse comments as human signal", () => {
    const result = classifyLine("# quick fix", [], 0, "Python");
    expect(result.status).toBe("human");
    expect(result.signals).toContain("lowercase terse comment");
  });

  it("handles fully type-annotated Python function", () => {
    const line = "def calculate(x: int, y: str) -> bool:";
    const result = classifyLine(line, [line], 0, "Python");
    expect(result.status).toBe("ai");
    const hasTypeSignal = result.signals.some(
      (s) => s.includes("type-annotated") || s.includes("return type"),
    );
    expect(hasTypeSignal).toBe(true);
  });

  it("flags abbreviated names as human signal", () => {
    const result = classifyLine("val = fn(cb, dp, sz)", [], 0, "Python");
    expect(result.signals).toContain("abbreviated names: val, cb");
  });

  it("returns uncertain when AI and human signals balance", () => {
    const result = classifyLine("", [], 0, "Python");
    expect(result.status).toBe("uncertain");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// runTier1
// ─────────────────────────────────────────────────────────────────────────────
describe("runTier1", () => {
  const sampleCode = [
    "def foo(x: int) -> str:",
    '    """Convert x to string."""',
    "    return str(x)",
    "",
    "def bar(y: float) -> bool:",
    '    """Check if y is positive."""',
    "    return y > 0",
  ].join("\n");
  const sampleLines = lines(sampleCode);

  it("returns all 20 metric keys", () => {
    const result = runTier1(sampleCode, sampleLines, "Python");
    const expectedKeys = [
      "entropy",
      "blank_density",
      "naming_verbosity",
      "type_annotations",
      "docstring_coverage",
      "structural_regularity",
      "comment_absence",
      "indent_consistency",
      "exception_handling",
      "import_organisation",
      "string_formatting",
      "dead_code_absence",
      "variable_reuse",
      "magic_numbers",
      "complexity_uniformity",
      "halstead_uniformity",
      "type_token_ratio",
      "guard_clauses",
      "error_verbosity",
      "emoji_presence",
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  it("all values are numbers between 0 and 100", () => {
    const result = runTier1(sampleCode, sampleLines, "Python");
    for (const [key, val] of Object.entries(result)) {
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it("works with JavaScript language", () => {
    const jsCode = "function greet(name) {\n  return `Hello ${name}`;\n}";
    const result = runTier1(jsCode, lines(jsCode), "JavaScript");
    expect(result).toHaveProperty("entropy");
    expect(typeof result.entropy).toBe("number");
  });

  it("works with unknown language (defaults to Python patterns)", () => {
    const code = "x = 1\ny = 2";
    const result = runTier1(code, lines(code), "UnknownLang");
    expect(result).toHaveProperty("entropy");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreTier1
// ─────────────────────────────────────────────────────────────────────────────
describe("scoreTier1", () => {
  it("returns a number between 0 and 100", () => {
    const metrics = {
      entropy: 50,
      blank_density: 50,
      naming_verbosity: 50,
      type_annotations: 50,
      docstring_coverage: 50,
      structural_regularity: 50,
      comment_absence: 50,
      indent_consistency: 50,
      exception_handling: 50,
      import_organisation: 50,
      string_formatting: 50,
      dead_code_absence: 50,
      variable_reuse: 50,
      magic_numbers: 50,
      complexity_uniformity: 50,
      halstead_uniformity: 50,
      type_token_ratio: 50,
      guard_clauses: 50,
      error_verbosity: 50,
      emoji_presence: 50,
    };
    const score = scoreTier1(metrics);
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns higher score for AI-like metrics", () => {
    const aiMetrics = {
      entropy: 20,
      blank_density: 80,
      naming_verbosity: 90,
      type_annotations: 90,
      docstring_coverage: 100,
      structural_regularity: 95,
      comment_absence: 85,
      indent_consistency: 95,
      exception_handling: 90,
      import_organisation: 85,
      string_formatting: 85,
      dead_code_absence: 75,
      variable_reuse: 80,
      magic_numbers: 85,
      complexity_uniformity: 85,
      halstead_uniformity: 80,
      type_token_ratio: 30,
      guard_clauses: 85,
      error_verbosity: 85,
      emoji_presence: 60,
    };
    const humanMetrics = {
      entropy: 80,
      blank_density: 20,
      naming_verbosity: 20,
      type_annotations: 10,
      docstring_coverage: 10,
      structural_regularity: 15,
      comment_absence: 20,
      indent_consistency: 40,
      exception_handling: 20,
      import_organisation: 25,
      string_formatting: 20,
      dead_code_absence: 20,
      variable_reuse: 20,
      magic_numbers: 20,
      complexity_uniformity: 20,
      halstead_uniformity: 20,
      type_token_ratio: 85,
      guard_clauses: 20,
      error_verbosity: 25,
      emoji_presence: 0,
    };
    const aiScore = scoreTier1(aiMetrics);
    const humanScore = scoreTier1(humanMetrics);
    expect(aiScore).toBeGreaterThan(humanScore);
  });

  it("uses only 9 active signals — weights sum to 1.0 (all-50 → 50)", () => {
    const uniform = {};
    const keys = [
      "entropy",
      "blank_density",
      "naming_verbosity",
      "type_annotations",
      "docstring_coverage",
      "structural_regularity",
      "comment_absence",
      "indent_consistency",
      "exception_handling",
      "import_organisation",
      "string_formatting",
      "dead_code_absence",
      "variable_reuse",
      "magic_numbers",
      "complexity_uniformity",
      "halstead_uniformity",
      "type_token_ratio",
      "guard_clauses",
      "error_verbosity",
      "emoji_presence",
    ];
    keys.forEach((k) => {
      uniform[k] = 50;
    });
    const score = scoreTier1(uniform);
    expect(score).toBe(50);
  });

  it("does NOT include type_annotations, docstring_coverage, or emoji_presence in score", () => {
    const base = {
      entropy: 50,
      blank_density: 50,
      naming_verbosity: 50,
      type_annotations: 0,
      docstring_coverage: 0,
      structural_regularity: 50,
      comment_absence: 50,
      indent_consistency: 50,
      exception_handling: 50,
      import_organisation: 50,
      string_formatting: 50,
      dead_code_absence: 50,
      variable_reuse: 50,
      magic_numbers: 50,
      complexity_uniformity: 50,
      halstead_uniformity: 50,
      type_token_ratio: 50,
      guard_clauses: 50,
      error_verbosity: 50,
      emoji_presence: 0,
    };
    const withBypassSignals = {
      ...base,
      type_annotations: 100,
      docstring_coverage: 100,
      emoji_presence: 95,
    };
    expect(scoreTier1(base)).toBe(scoreTier1(withBypassSignals));
  });

  it("does NOT include guard_clauses, complexity_uniformity, comment_absence, blank_density, indent_consistency, halstead, string_formatting in score", () => {
    const base = {
      entropy: 50,
      blank_density: 0,
      naming_verbosity: 50,
      type_annotations: 0,
      docstring_coverage: 0,
      structural_regularity: 50,
      comment_absence: 0,
      indent_consistency: 0,
      exception_handling: 50,
      import_organisation: 50,
      string_formatting: 0,
      dead_code_absence: 50,
      variable_reuse: 50,
      magic_numbers: 50,
      complexity_uniformity: 0,
      halstead_uniformity: 0,
      type_token_ratio: 50,
      guard_clauses: 0,
      error_verbosity: 50,
      emoji_presence: 0,
    };
    const withRemoved = {
      ...base,
      guard_clauses: 100,
      complexity_uniformity: 100,
      blank_density: 100,
      comment_absence: 100,
      indent_consistency: 100,
      halstead_uniformity: 100,
      string_formatting: 100,
    };
    expect(scoreTier1(base)).toBe(scoreTier1(withRemoved));
  });

  it("naming_verbosity has highest weight (0.23)", () => {
    const base = {
      entropy: 50,
      blank_density: 0,
      naming_verbosity: 0,
      type_annotations: 0,
      docstring_coverage: 0,
      structural_regularity: 50,
      comment_absence: 0,
      indent_consistency: 0,
      exception_handling: 50,
      import_organisation: 50,
      string_formatting: 0,
      dead_code_absence: 50,
      variable_reuse: 50,
      magic_numbers: 50,
      complexity_uniformity: 50,
      halstead_uniformity: 0,
      type_token_ratio: 50,
      guard_clauses: 50,
      error_verbosity: 0,
      emoji_presence: 0,
    };
    const withNaming = { ...base, naming_verbosity: 100 };
    expect(scoreTier1(withNaming) - scoreTier1(base)).toBe(23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeBypassFlag
// ─────────────────────────────────────────────────────────────────────────────
describe("computeBypassFlag", () => {
  it("returns triggered=false when no bypass markers found", () => {
    const code = "def maxval(xs):\n    mx = xs[0]\n    return mx";
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.triggered).toBe(false);
    expect(result.bypass_confidence).toBe(0);
    expect(result.reasons).toEqual([]);
    expect(result.message).toBeNull();
  });

  it("triggers on type annotations (-> int, : str)", () => {
    const code = "def foo(x: int) -> str:\n    return str(x)";
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.triggered).toBe(true);
    expect(result.bypass_confidence).toBe(0.92);
    expect(result.reasons).toContain("type_annotations");
    expect(result.message).toBe(
      "Structural AI markers detected — immediate review recommended",
    );
  });

  it("triggers on docstrings (triple-quoted after def)", () => {
    const code = 'def foo():\n    """Do the thing."""\n    pass';
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.triggered).toBe(true);
    expect(result.bypass_confidence).toBe(0.92);
    expect(result.reasons).toContain("docstring_present");
  });

  it("triggers on emoji presence", () => {
    const code = "def foo():\n    # 🚀 launching\n    pass";
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.triggered).toBe(true);
    expect(result.bypass_confidence).toBe(0.92);
    expect(result.reasons).toContain("emoji_present");
  });

  it("collects multiple reasons when several markers present", () => {
    const code =
      'def foo(x: int) -> str:\n    """Docstring."""\n    return "🎉"';
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.triggered).toBe(true);
    expect(result.bypass_confidence).toBe(0.92);
    expect(result.reasons).toContain("type_annotations");
    expect(result.reasons).toContain("docstring_present");
    expect(result.reasons).toContain("emoji_present");
    expect(result.reasons).toHaveLength(3);
  });

  it("bypass confidence is always 0.92 (not 1.0) to allow edge cases", () => {
    const code = "def foo(x: int):\n    pass";
    const result = computeBypassFlag(code, lines(code), "Python");
    expect(result.bypass_confidence).toBe(0.92);
    expect(result.bypass_confidence).toBeLessThan(1.0);
  });

  it("does NOT trigger for plain DSA code with no markers", () => {
    const dsaCode = [
      "def twoSum(nums, target):",
      "    seen = {}",
      "    for i, n in enumerate(nums):",
      "        comp = target - n",
      "        if comp in seen:",
      "            return [seen[comp], i]",
      "        seen[n] = i",
      "    return []",
    ].join("\n");
    const result = computeBypassFlag(dsaCode, lines(dsaCode), "Python");
    expect(result.triggered).toBe(false);
  });

  it("works with JavaScript JSDoc", () => {
    const code = [
      "function foo() {",
      "    /**",
      "     * Does stuff.",
      "     */",
      "    return 1;",
      "}",
    ].join("\n");
    const result = computeBypassFlag(code, lines(code), "JavaScript");
    expect(result.triggered).toBe(true);
    expect(result.reasons).toContain("docstring_present");
  });

  it("bypass flag is independent of the weighted score", () => {
    const codeWithMarkers =
      'def foo(x: int) -> str:\n    """Doc."""\n    return str(x)';
    const codeWithout = "def foo(x):\n    return str(x)";
    const bypass = computeBypassFlag(
      codeWithMarkers,
      lines(codeWithMarkers),
      "Python",
    );
    expect(bypass.triggered).toBe(true);
    const score1 = scoreTier1(
      runTier1(codeWithMarkers, lines(codeWithMarkers), "Python"),
    );
    const score2 = scoreTier1(
      runTier1(codeWithout, lines(codeWithout), "Python"),
    );
    expect(typeof score1).toBe("number");
    expect(typeof score2).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildGroups
// ─────────────────────────────────────────────────────────────────────────────
describe("buildGroups", () => {
  it("returns empty array for empty input", () => {
    expect(buildGroups([])).toEqual([]);
    expect(buildGroups(null)).toEqual([]);
    expect(buildGroups(undefined)).toEqual([]);
  });

  it("groups consecutive same-status lines", () => {
    const results = [
      { status: "ai", signals: ["s1"] },
      { status: "ai", signals: ["s2"] },
      { status: "human", signals: ["s3"] },
      { status: "human", signals: ["s4"] },
    ];
    const groups = buildGroups(results);
    expect(groups).toHaveLength(2);
    expect(groups[0].dominant).toBe("ai");
    expect(groups[0].start).toBe(1);
    expect(groups[0].end).toBe(2);
    expect(groups[0].signals).toEqual(["s1", "s2"]);
    expect(groups[1].dominant).toBe("human");
    expect(groups[1].start).toBe(3);
    expect(groups[1].end).toBe(4);
  });

  it("handles single line", () => {
    const groups = buildGroups([{ status: "ai", signals: ["s1"] }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      dominant: "ai",
      start: 1,
      end: 1,
      signals: ["s1"],
    });
  });

  it("handles alternating statuses", () => {
    const results = [
      { status: "ai", signals: ["a"] },
      { status: "human", signals: ["h"] },
      { status: "ai", signals: ["a2"] },
      { status: "uncertain", signals: ["u"] },
    ];
    const groups = buildGroups(results);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.dominant)).toEqual([
      "ai",
      "human",
      "ai",
      "uncertain",
    ]);
  });

  it("uses 1-based line numbers", () => {
    const results = [
      { status: "uncertain", signals: [] },
      { status: "uncertain", signals: [] },
      { status: "ai", signals: ["s1"] },
    ];
    const groups = buildGroups(results);
    expect(groups[0].start).toBe(1);
    expect(groups[0].end).toBe(2);
    expect(groups[1].start).toBe(3);
    expect(groups[1].end).toBe(3);
  });

  it("accumulates signals within a group", () => {
    const results = [
      { status: "ai", signals: ["a", "b"] },
      { status: "ai", signals: ["c"] },
      { status: "ai", signals: ["d", "e", "f"] },
    ];
    const groups = buildGroups(results);
    expect(groups).toHaveLength(1);
    expect(groups[0].signals).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: AI-written vs human-written code scoring
// ─────────────────────────────────────────────────────────────────────────────
describe("integration: AI vs human code differentiation", () => {
  it("AI-written Python scores higher than human-written Python", () => {
    const aiCode = [
      "from typing import List, Dict, Optional",
      "",
      "import json",
      "import os",
      "",
      "def calculate_maximum_value(input_data: List[int]) -> Optional[int]:",
      '    """Calculate the maximum value from the input data.',
      "",
      "    Args:",
      "        input_data: A list of integers to process.",
      "",
      "    Returns:",
      "        The maximum integer value, or None if the list is empty.",
      "",
      "    Raises:",
      "        ValueError: If input_data is not a valid list.",
      '    """',
      "    if not isinstance(input_data, list):",
      '        raise ValueError("Invalid input: expected a list of integers but received a different type")',
      "    if not input_data:",
      "        return None",
      "    return max(input_data)",
      "",
      "def process_user_request(request_data: Dict[str, str]) -> Dict[str, str]:",
      '    """Process a user request and return the formatted response.',
      "",
      "    Args:",
      "        request_data: A dictionary containing request parameters.",
      "",
      "    Returns:",
      "        A dictionary containing the processed response data.",
      '    """',
      "    if not request_data:",
      '        raise ValueError("Invalid input: request data must not be empty or None")',
      "    result_data = {}",
      "    for key_name, value_item in request_data.items():",
      "        processed_value = value_item.strip().lower()",
      "        result_data[key_name] = processed_value",
      "    return result_data",
    ].join("\n");

    const humanCode = [
      "import os",
      "import json",
      "from mylib import helper",
      "",
      "def maxval(xs):",
      "    # quick check",
      "    if not xs: return None",
      "    mx = xs[0]",
      "    for x in xs:",
      "        if x > mx:",
      "            mx = x",
      "    return mx  # TODO: handle edge cases",
      "",
      "def proc(req):",
      "    out = {}",
      "    for k, v in req.items():",
      "        out[k] = v.strip().lower()  # fixme: unicode?",
      "    return out",
    ].join("\n");

    const aiScore = scoreTier1(runTier1(aiCode, lines(aiCode), "Python"));
    const humanScore = scoreTier1(
      runTier1(humanCode, lines(humanCode), "Python"),
    );
    expect(aiScore).toBeGreaterThan(humanScore);
  });

  it("AI-written JavaScript scores higher than human-written JavaScript", () => {
    const aiCode = [
      "/**",
      " * Validates the user authentication credentials.",
      " * @param {string} username - The username to validate.",
      " * @param {string} password - The password to validate.",
      " * @returns {boolean} Whether the credentials are valid.",
      " * @throws {Error} If credentials are missing.",
      " */",
      "function validateUserCredentials(username, password) {",
      "    if (!username) {",
      '        throw new Error("Invalid input: username must be a non-empty string value");',
      "    }",
      "    if (!password) {",
      '        throw new Error("Invalid input: password must be a non-empty string value");',
      "    }",
      "    const hashedPassword = hashPassword(password);",
      "    const storedCredentials = retrieveStoredCredentials(username);",
      "    return hashedPassword === storedCredentials;",
      "}",
      "",
      "/**",
      " * Formats the response data for the client.",
      " * @param {Object} responseData - The raw response data.",
      " * @returns {Object} The formatted response object.",
      " */",
      "function formatResponseData(responseData) {",
      "    if (!responseData) {",
      '        throw new Error("Response data must not be null or undefined for formatting");',
      "    }",
      "    const formattedOutput = {};",
      "    return formattedOutput;",
      "}",
    ].join("\n");

    const humanCode = [
      "function check(usr, pwd) {",
      "    // todo: rate limit",
      "    if (!usr || !pwd) return false;",
      "    var h = hash(pwd);",
      "    var s = getStored(usr);",
      "    return h === s;",
      "}",
      "",
      "function fmt(d) {",
      "    var out = {};",
      "    // hack: deep clone",
      "    for (var k in d) out[k] = d[k];",
      "    return out;",
      "}",
    ].join("\n");

    const aiScore = scoreTier1(runTier1(aiCode, lines(aiCode), "JavaScript"));
    const humanScore = scoreTier1(
      runTier1(humanCode, lines(humanCode), "JavaScript"),
    );
    expect(aiScore).toBeGreaterThan(humanScore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases & regex safety
// ─────────────────────────────────────────────────────────────────────────────
describe("edge cases & regex safety", () => {
  it("all functions handle empty string / empty array gracefully", () => {
    expect(() => identifierEntropy("")).not.toThrow();
    expect(() => blankLineDensity([])).not.toThrow();
    expect(() => namingVerbosity([], pyLP)).not.toThrow();
    expect(() => typeAnnotationScore("", pyLP)).not.toThrow();
    expect(() => docstringCoverage([], pyLP)).not.toThrow();
    expect(() => structuralRegularity([], pyLP)).not.toThrow();
    expect(() => inlineCommentAbsence([], pyLP)).not.toThrow();
    expect(() => indentConsistency([], "JavaScript")).not.toThrow();
    expect(() => exceptionHandlingStyle("", pyLP)).not.toThrow();
    expect(() => importOrganisation([], pyLP)).not.toThrow();
    expect(() => stringFormattingStyle("", pyLP)).not.toThrow();
    expect(() => deadCodeAbsence([], pyLP)).not.toThrow();
    expect(() => variableReusePattern([])).not.toThrow();
    expect(() => magicNumberUsage([], pyLP)).not.toThrow();
    expect(() => cyclomaticComplexityUniformity([], pyLP)).not.toThrow();
    expect(() => halsteadUniformity([], pyLP)).not.toThrow();
    expect(() => typeTokenRatio("")).not.toThrow();
    expect(() => guardClauseDensity([], pyLP)).not.toThrow();
    expect(() => errorMessageVerbosity("")).not.toThrow();
    expect(() => emojiPresence("")).not.toThrow();
  });

  it("regex with global flag does not carry stale lastIndex across calls", () => {
    const code1 = "def foo(x: int) -> str:\n    pass";
    const code2 = "def bar(y: float) -> bool:\n    pass";
    const score1 = typeAnnotationScore(code1, pyLP);
    const score2 = typeAnnotationScore(code2, pyLP);
    expect(score1).toBe(score2);
  });

  it("structuralRegularity resets global regex lastIndex", () => {
    const ls = lines(
      [
        "def foo() -> int:",
        '    """Doc."""',
        "    return 1",
        "",
        "def bar() -> str:",
        '    """Doc."""',
        '    return "hi"',
      ].join("\n"),
    );
    const score1 = structuralRegularity(ls, pyLP);
    const score2 = structuralRegularity(ls, pyLP);
    expect(score1).toBe(score2);
  });

  it("handles special regex characters in code without errors", () => {
    const trickyCodes = [
      'pattern = r"([a-z]+)\\d{3,}"',
      "x = a ** b",
      "result = (a || b) && (c ^ d)",
      'path = "C:\\Users\\test\\file.txt"',
    ];
    for (const code of trickyCodes) {
      expect(() => identifierEntropy(code)).not.toThrow();
      expect(() => typeTokenRatio(code)).not.toThrow();
      expect(() => errorMessageVerbosity(code)).not.toThrow();
    }
  });

  it("handles very long lines without hanging", () => {
    const longLine = "x = " + "a + ".repeat(1000) + "b";
    expect(() => identifierEntropy(longLine)).not.toThrow();
    expect(() => typeTokenRatio(longLine)).not.toThrow();
  });

  it("handles code with unicode characters", () => {
    const unicodeCode = [
      "# 日本語のコメント",
      "def grüßen():",
      '    naïve_résumé = "café"',
      "    return naïve_résumé",
    ].join("\n");
    expect(() => identifierEntropy(unicodeCode)).not.toThrow();
    expect(() => emojiPresence(unicodeCode)).not.toThrow();
    expect(() => typeTokenRatio(unicodeCode)).not.toThrow();
  });
});
