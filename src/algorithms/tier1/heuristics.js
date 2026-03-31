/**
 * algorithms/tier1/heuristics.js
 *
 * TIER 1 — Heuristic / Static Analysis
 * Pure JavaScript, no model, no network. Runs instantly.
 *
 * 20 signals (17 original + 3 new), now language-aware.
 */

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
  // C#
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

// Standard library / builtin identifiers that should NOT count as verbose naming.
// These are API names the developer has no control over.
const STDLIB_NAMES = new Set([
  // C++ STL
  "push_back",
  "pop_back",
  "emplace_back",
  "push_front",
  "pop_front",
  "emplace_front",
  "find_first_of",
  "find_last_of",
  "find_first_not_of",
  "find_last_not_of",
  "upper_bound",
  "lower_bound",
  "equal_range",
  "binary_search",
  "make_pair",
  "make_tuple",
  "make_shared",
  "make_unique",
  "make_optional",
  "to_string",
  "to_wstring",
  "stoi",
  "stol",
  "stod",
  "stof",
  "begin",
  "end",
  "rbegin",
  "rend",
  "cbegin",
  "cend",
  "front",
  "back",
  "size",
  "empty",
  "clear",
  "erase",
  "insert",
  "resize",
  "reserve",
  "substr",
  "getline",
  "endl",
  "cout",
  "cerr",
  "cin",
  "printf",
  "fprintf",
  "sprintf",
  "sort",
  "swap",
  "reverse",
  "accumulate",
  "transform",
  "for_each",
  "count_if",
  "find_if",
  "remove_if",
  "copy_if",
  "all_of",
  "any_of",
  "none_of",
  "unique_ptr",
  "shared_ptr",
  "weak_ptr",
  "dynamic_cast",
  "static_cast",
  "const_cast",
  "string_view",
  "initializer_list",
  "numeric_limits",
  "runtime_error",
  "logic_error",
  "invalid_argument",
  "out_of_range",
  "overflow_error",
  "underflow_error",
  "unordered_map",
  "unordered_set",
  "multimap",
  "multiset",
  "priority_queue",
  "forward_list",
  "bitset",
  // Python builtins / stdlib
  "isinstance",
  "issubclass",
  "enumerate",
  "collections",
  "functools",
  "itertools",
  "defaultdict",
  "namedtuple",
  "OrderedDict",
  "dataclass",
  "dataclasses",
  "staticmethod",
  "classmethod",
  "abstractmethod",
  "property",
  "setattr",
  "getattr",
  "hasattr",
  "delattr",
  "startswith",
  "endswith",
  "splitlines",
  "expandtabs",
  "capitalize",
  "casefold",
  "maketrans",
  "translate",
  "isnumeric",
  "isalpha",
  "isdigit",
  "isalnum",
  "isspace",
  "islower",
  "isupper",
  "istitle",
  "isdecimal",
  "isidentifier",
  "isprintable",
  "lstrip",
  "rstrip",
  "strip",
  "ljust",
  "rjust",
  "zfill",
  "removeprefix",
  "removesuffix",
  "format_map",
  "__init__",
  "__str__",
  "__repr__",
  "__len__",
  "__eq__",
  "__hash__",
  "__enter__",
  "__exit__",
  "__iter__",
  "__next__",
  "__call__",
  "__getitem__",
  "__setitem__",
  "__contains__",
  "__add__",
  "__sub__",
  "__mul__",
  "__truediv__",
  "__floordiv__",
  "__name__",
  "__main__",
  "__file__",
  "__doc__",
  "__dict__",
  "__class__",
  "traceback",
  "format_exc",
  "print_exc",
  // JavaScript / DOM / Node
  "addEventListener",
  "removeEventListener",
  "getElementById",
  "getElementsByClassName",
  "getElementsByTagName",
  "querySelector",
  "querySelectorAll",
  "createElement",
  "createTextNode",
  "appendChild",
  "removeChild",
  "replaceChild",
  "insertBefore",
  "setAttribute",
  "getAttribute",
  "removeAttribute",
  "hasAttribute",
  "classList",
  "className",
  "innerHTML",
  "innerText",
  "textContent",
  "outerHTML",
  "parentNode",
  "parentElement",
  "childNodes",
  "firstChild",
  "lastChild",
  "nextSibling",
  "previousSibling",
  "firstElementChild",
  "lastElementChild",
  "nextElementSibling",
  "previousElementSibling",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "preventDefault",
  "stopPropagation",
  "stopImmediatePropagation",
  "addEventListener",
  "dispatchEvent",
  "hasOwnProperty",
  "propertyIsEnumerable",
  "isPrototypeOf",
  "toString",
  "valueOf",
  "toFixed",
  "toPrecision",
  "toExponential",
  "toUpperCase",
  "toLowerCase",
  "toLocaleLowerCase",
  "toLocaleUpperCase",
  "charCodeAt",
  "codePointAt",
  "fromCharCode",
  "fromCodePoint",
  "startsWith",
  "endsWith",
  "padStart",
  "padEnd",
  "trimStart",
  "trimEnd",
  "replaceAll",
  "matchAll",
  "lastIndexOf",
  "indexOf",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "reduceRight",
  "copyWithin",
  "toSorted",
  "toReversed",
  "toSpliced",
  "localStorage",
  "sessionStorage",
  "getComputedStyle",
  "readFileSync",
  "writeFileSync",
  "readFile",
  "writeFile",
  "existsSync",
  "mkdirSync",
  "createReadStream",
  "createWriteStream",
  "nextTick",
  "prototype",
  "constructor",
  "defineProperty",
  "defineProperties",
  "getOwnPropertyDescriptor",
  "getOwnPropertyNames",
  "getOwnPropertySymbols",
  "getPrototypeOf",
  "setPrototypeOf",
  "isExtensible",
  "preventExtensions",
  "freeze",
  "isFrozen",
  "seal",
  "isSealed",
  // Java
  "toString",
  "hashCode",
  "equals",
  "compareTo",
  "indexOf",
  "lastIndexOf",
  "substring",
  "charAt",
  "toCharArray",
  "getBytes",
  "isEmpty",
  "contains",
  "containsKey",
  "containsValue",
  "keySet",
  "entrySet",
  "values",
  "putIfAbsent",
  "getOrDefault",
  "computeIfAbsent",
  "computeIfPresent",
  "Collections",
  "ArrayList",
  "LinkedList",
  "HashMap",
  "TreeMap",
  "LinkedHashMap",
  "HashSet",
  "TreeSet",
  "LinkedHashSet",
  "ArrayDeque",
  "PriorityQueue",
  "StringBuilder",
  "StringBuffer",
  "BigInteger",
  "BigDecimal",
  "parseInt",
  "parseFloat",
  "parseLong",
  "parseDouble",
  "getMessage",
  "getStackTrace",
  "printStackTrace",
  "getCause",
  "getClass",
  "getName",
  "getSimpleName",
  "getCanonicalName",
  "isInstance",
  "isAssignableFrom",
  "newInstance",
  "Thread",
  "Runnable",
  "Callable",
  "Future",
  "CompletableFuture",
  "ExecutorService",
  "Executors",
  "ThreadPoolExecutor",
  "InputStream",
  "OutputStream",
  "BufferedReader",
  "BufferedWriter",
  "FileReader",
  "FileWriter",
  "InputStreamReader",
  "OutputStreamWriter",
  // C / C# — includes common header/module names
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

// ─────────────────────────────────────────────────────────────────────────────
// Language-specific pattern configuration
// ─────────────────────────────────────────────────────────────────────────────

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

export function getLangPatterns(language) {
  return LANG[language] || LANG.Python;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Identifier Entropy — low = AI (repetitive vocabulary)
export function identifierEntropy(text) {
  const tokens = (text.match(/\b[a-zA-Z_]\w*\b/g) || []).filter(
    (t) => !KEYWORDS.has(t),
  );
  if (tokens.length < 5) return 50;
  const freq = {};
  tokens.forEach((t) => {
    freq[t] = (freq[t] || 0) + 1;
  });
  const total = tokens.length;
  let H = 0;
  Object.values(freq).forEach((c) => {
    const p = c / total;
    H -= p * Math.log2(p);
  });
  const maxH = Math.log2(total);
  return maxH > 0 ? Math.min(100, Math.round((H / maxH) * 100)) : 50;
}

// 2. Blank Line Density — high = AI
export function blankLineDensity(lines) {
  if (lines.length < 3) return 20;
  const blanks = lines.filter((l) => !l.trim()).length;
  return Math.min(100, Math.round((blanks / lines.length) * 250));
}

// 3. Naming Verbosity — high = AI
export function namingVerbosity(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter((l) => {
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
    codeLines.join("\n").match(/\b[a-z][a-zA-Z0-9_]{3,}\b/g) || []
  ).filter((t) => !KEYWORDS.has(t.toLowerCase()) && !STDLIB_NAMES.has(t));
  if (!allIds.length) return 20;
  const verbose = allIds.filter(
    (id) => id.length > 9 || (id.includes("_") && id.length > 6),
  );
  return Math.min(100, Math.round((verbose.length / allIds.length) * 160));
}

// 4. Type Annotation Score — high = AI (language-aware)
export function typeAnnotationScore(text, lp) {
  let count = 0;
  if (lp.typeAnnot) {
    count += (text.match(lp.typeAnnot) || []).length;
  }
  if (lp.returnType) {
    count += (text.match(lp.returnType) || []).length * 2;
  }
  return Math.min(100, Math.round(count * 4));
}

// 5. Docstring / doc-comment Coverage — high = AI (language-aware)
const CONSTRUCTOR_RE = /\b(__init__|constructor|new)\s*\(/;

export function docstringCoverage(lines, lp) {
  if (!lp.fnDef) return 0;
  let entities = 0,
    documented = 0;
  for (let i = 0; i < lines.length; i++) {
    const isFn = lp.fnDef.test(lines[i]);
    const isClass = lp.classDef && lp.classDef.test(lines[i]);
    if (!isFn && !isClass) continue;
    if (isFn && CONSTRUCTOR_RE.test(lines[i])) continue;
    entities++;
    if (!lp.docOpen) continue;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j].trim();
      if (next) {
        if (lp.docOpen.test(next)) documented++;
        break;
      }
    }
  }
  return entities > 0 ? Math.round((documented / entities) * 100) : 0;
}

// 6. Structural Regularity — high = AI (language-aware)
// A function is "canonical" (AI-like) if it meets 2+ of:
//   (a) All parameter names are full English words (length >= 4, no lo/hi/ptr/idx)
//   (b) Single return statement, no intermediate variable reassignment
//   (c) Function name length > 12 characters
//   (d) Every parameter has a corresponding variable used exactly once before return
const SHORT_PARAM_NAMES = new Set([
  "lo", "hi", "ptr", "idx", "cnt", "val", "ret", "buf", "tmp",
  "ctx", "cb", "fn", "str", "len", "pos", "cur", "prev", "fmt",
  "src", "dst", "req", "res", "err", "ok", "num", "acc", "sum",
  "i", "j", "k", "n", "m", "x", "y", "z", "s", "t", "p", "q",
]);

function extractFnName(line) {
  const m = line.match(/(?:def|function)\s+(\w+)/) ||
            line.match(/(?:const|let|var)\s+(\w+)\s*=/) ||
            line.match(/(?:void|int|bool|string|auto|double|float|char|long|short|unsigned|size_t|Task|List|Dictionary|IEnumerable|CompletableFuture|Optional|Map|String|boolean)\s+(\w+)\s*\(/) ||
            line.match(/(?:public|private|protected|internal|static)\s+(?:async\s+)?(?:void|int|string|bool|double|float|long|char|var|Task|List|Dictionary|IEnumerable|CompletableFuture|Optional|Map|String|boolean)\s+(\w+)\s*\(/);
  if (m) return m[m.length - 1];
  return null;
}

function extractParams(line) {
  const paren = line.match(/\(([^)]*)\)/);
  if (!paren) return [];
  const inner = paren[1].trim();
  if (!inner) return [];
  return inner.split(",").map(p => {
    const parts = p.trim().replace(/\s*=\s*[^,]*$/, "").split(/[\s:]+/);
    const name = parts.filter(t => !KEYWORDS.has(t) && !/^[A-Z]/.test(t) && t !== "self" && t !== "this")[0];
    return name || null;
  }).filter(Boolean);
}

function getFnBody(lines, startIdx) {
  const body = [];
  const startIndent = lines[startIdx].match(/^(\s*)/)[1].length;
  for (let j = startIdx + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t) { body.push(lines[j]); continue; }
    const indent = lines[j].match(/^(\s*)/)[1].length;
    if (indent <= startIndent && t && !t.startsWith("}") === false) {
      if (/^[}\)]/.test(t) && indent === startIndent) { body.push(lines[j]); }
      break;
    }
    if (/^\}/.test(t) && indent === startIndent) { body.push(lines[j]); break; }
    body.push(lines[j]);
  }
  return body;
}

export function structuralRegularity(lines, lp) {
  if (!lp.fnDef) return 0;
  const methods = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => lp.fnDef.test(l));
  if (!methods.length) return 0;
  let canonical = 0;
  for (const { l, i } of methods) {
    let criteriaHit = 0;

    const fnName = extractFnName(l);
    const params = extractParams(l);
    const body = getFnBody(lines, i);
    const bodyText = body.join("\n");

    // (a) All parameter names are full English words (length >= 4, no short aliases)
    if (params.length > 0 && params.every(p => p.length >= 4 && !SHORT_PARAM_NAMES.has(p))) {
      criteriaHit++;
    }

    // (b) Single return statement, no intermediate variable reassignment
    const returnCount = body.filter(bl => /\b(return)\b/.test(bl.trim())).length;
    const mutatedVars = {};
    for (const bl of body) {
      const t = bl.trim();
      // plain assignment: `x = ...` or `let x = ...`
      const plain = t.match(/^(?:let|var|const|int|double|float|string|bool|auto)?\s*([a-z_]\w*)\s*=[^=]/);
      if (plain) mutatedVars[plain[1]] = (mutatedVars[plain[1]] || 0) + 1;
      // compound assignment anywhere in line: `x += ...`, `x -= ...`, etc.
      const compoundAll = t.matchAll(/\b([a-z_]\w*)\s*(?:\+|-|\*|\/|%|\||\&|\^|<<|>>)=/g);
      for (const cm of compoundAll) mutatedVars[cm[1]] = (mutatedVars[cm[1]] || 0) + 1;
      // increment/decrement anywhere: `x++`, `x--`, `++x`, `--x`
      const incAll = t.matchAll(/\b([a-z_]\w*)\s*(\+\+|--)/g);
      for (const im of incAll) mutatedVars[im[1]] = (mutatedVars[im[1]] || 0) + 1;
      const preIncAll = t.matchAll(/(\+\+|--)([a-z_]\w*)\b/g);
      for (const pm of preIncAll) mutatedVars[pm[2]] = (mutatedVars[pm[2]] || 0) + 1;
    }
    const hasReassignment = Object.values(mutatedVars).some(c => c > 1);
    if (returnCount <= 1 && !hasReassignment) {
      criteriaHit++;
    }

    // (c) Function name length > 12 characters
    if (fnName && fnName.length > 12) {
      criteriaHit++;
    }

    // (d) Every parameter has a corresponding variable used exactly once before return
    if (params.length > 0) {
      const allUsedOnce = params.every(p => {
        const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "g");
        const uses = (bodyText.match(re) || []).length;
        return uses === 1;
      });
      if (allUsedOnce) criteriaHit++;
    }

    if (criteriaHit >= 2) canonical++;
  }
  return Math.round((canonical / methods.length) * 100);
}

// 7. Inline Comment Absence — high = AI
export function inlineCommentAbsence(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter((l) => {
    const t = l.trim();
    return (
      t && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith("/*")
    );
  });
  if (codeLines.length < 5) return 50;
  const casual = codeLines.filter((l) =>
    /TODO|FIXME|HACK|wtf|idk|lol|quick|temp|xxx|wip/i.test(l),
  ).length;
  const inline = codeLines.filter(
    (l) => commentRe.test(l.trim()) && !/TODO|FIXME/i.test(l),
  ).length;
  const ratio = inline / codeLines.length;
  const base = ratio < 0.02 ? 85 : ratio < 0.05 ? 60 : 30;
  return Math.max(0, base - casual * 20);
}

// 8. Indent Consistency — high = AI
// Python requires syntactically significant indentation — perfect
// indentation there tells us nothing about human vs AI authorship.
const INDENT_NEUTRAL_LANGS = new Set(["Python"]);

export function indentConsistency(lines, language) {
  if (INDENT_NEUTRAL_LANGS.has(language)) return 50;
  const indented = lines.filter((l) => l.trim().length > 0);
  if (indented.length < 3) return 50;
  const indents = indented.map((l) => l.match(/^(\s*)/)[1].length);
  const nonZero = indents.filter((i) => i > 0);
  if (!nonZero.length) return 50;
  const base = Math.min(...nonZero);
  const consistent = indents.filter(
    (i) => i === 0 || (base > 0 && i % base === 0),
  ).length;
  return Math.round((consistent / indents.length) * 100);
}

// 9. Exception Handling Style — high = AI (language-aware)
export function exceptionHandlingStyle(text, lp) {
  const broadMatches = lp.exceptBroad
    ? (text.match(new RegExp(lp.exceptBroad.source, "gm")) || []).length
    : 0;
  const bareMatches = lp.exceptBare
    ? (text.match(new RegExp(lp.exceptBare.source, "gm")) || []).length
    : 0;
  const raiseMatches = (text.match(/\b(raise|throw|panic)\b/g) || []).length;
  const structured = broadMatches + raiseMatches;
  const total = structured + bareMatches;
  if (total === 0) return 30;
  return Math.min(100, Math.round((structured / total) * 100));
}

// 10. Import Organisation — high = AI (language-aware)
export function importOrganisation(lines, lp) {
  const importRe = /^(import |from \w|require\(|use |#include|using )/;
  const importLines = lines.filter((l) => importRe.test(l.trim()));
  if (importLines.length < 3) return 30;

  const groups = [];
  let currentGroup = [];
  for (const line of lines) {
    const t = line.trim();
    if (importRe.test(t)) {
      currentGroup.push(t);
    } else if (!t && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  const isOrganised = groups.length >= 2;
  const hasTyping = lp.typingImport
    ? importLines.some((l) => lp.typingImport.test(l))
    : false;
  const firstGroup = groups[0] || [];
  const isSorted =
    firstGroup.length > 1 &&
    firstGroup.every((l, i) => i === 0 || l >= firstGroup[i - 1]);

  let score = 20;
  if (isOrganised) score += 35;
  if (hasTyping) score += 30;
  if (isSorted) score += 15;
  return Math.min(100, score);
}

// 11. String Formatting Style — high = AI (language-aware)
export function stringFormattingStyle(text, lp) {
  const modernCount = lp.fmtModern
    ? (text.match(lp.fmtModern) || []).length
    : 0;
  const oldCount = lp.fmtOld ? (text.match(lp.fmtOld) || []).length : 0;
  const total = modernCount + oldCount;
  if (total === 0) return 30;
  const purity = modernCount / total;
  if (purity === 1 && modernCount >= 2) return 85;
  if (purity >= 0.8) return 65;
  if (purity >= 0.5) return 45;
  return 20;
}

// 12. Dead Code Absence — high = AI
// Checks commented-out code blocks ONLY.  A student who tries brute force,
// comments it out, then writes the optimised solution is a human fingerprint.
// AI never leaves commented-out attempts.
// No debug-print detection — on this platform print()/console.log()/
// System.out.println() are the answer output mechanism, not debug leftovers.
const COMMENTED_CODE_RE = /\b(def |class |return |import |from |for |if |while |func |fn |pub |void |int |char |double |float |bool |const |var |struct |enum |throw |raise |switch )|\bfunction\s+\w+\s*\(/;

export function deadCodeAbsence(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const commentedCode = lines.filter((l) => {
    const t = l.trim();
    return commentRe.test(t) && COMMENTED_CODE_RE.test(t);
  }).length;
  if (commentedCode === 0) return 75;
  if (commentedCode === 1) return 50;
  return Math.max(10, 75 - commentedCode * 20);
}

// 13. Variable Reuse Pattern — low reuse = AI
const VR_SKIP_RE = /^(def |class |#|\/\/|import |from |use |func |fn |return |if |else|for |foreach |while |switch |case |break|continue|package |namespace |using |struct |enum |interface |throw |raise |try|catch|except|finally|do |goto |yield |async |await )/;
const VR_EXCLUDED = new Set([
  "self", "true", "false", "none", "null", "undefined", "this",
  "new", "typeof", "instanceof", "sizeof", "delete", "void",
]);
const VR_ASSIGN_RE1 =
  /^(?:(?:let|const|var|val)\s+)?([a-z_]\w*)\s*(?::.*)?=(?!=)/;
const VR_ASSIGN_RE2 =
  /^(?:(?:static|final|readonly|unsigned|signed|volatile|public|private|protected|internal|auto|extern|register|mutable)\s+)*(?:[A-Za-z_]\w*(?:::\w+)*(?:<[^>]*>)?[*&]*(?:\[\])*)\s+([a-z_]\w*)\s*=(?!=)/;

export function variableReusePattern(lines) {
  const assignments = {};
  for (const line of lines) {
    const t = line.trim();
    if (VR_SKIP_RE.test(t)) continue;
    let varName = null;
    const m1 = t.match(VR_ASSIGN_RE1);
    if (m1 && !t.startsWith(m1[1] + "::")) {
      varName = m1[1];
    } else {
      const m2 = t.match(VR_ASSIGN_RE2);
      if (m2) varName = m2[1];
    }
    if (varName && !VR_EXCLUDED.has(varName)) {
      assignments[varName] = (assignments[varName] || 0) + 1;
    }
  }
  const vars = Object.values(assignments);
  if (vars.length < 3) return 40;
  const reusedCount = vars.filter((c) => c > 1).length;
  const reuseRatio = reusedCount / vars.length;
  if (reuseRatio < 0.1) return 80;
  if (reuseRatio < 0.2) return 60;
  if (reuseRatio < 0.35) return 40;
  return 20;
}

// 14. Magic Number Usage — high = AI
const NAMED_CONST_RE =
  /(?:^|(?:const|final|static|readonly|constexpr|#define)\s+(?:\w+\s+)*)([A-Z_]{2,})\s*[=\s]/;

export function magicNumberUsage(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter((l) => {
    const t = l.trim();
    return (
      t &&
      !commentRe.test(t) &&
      !t.startsWith('"""') &&
      !t.startsWith("'''") &&
      !t.startsWith("/*")
    );
  });
  let magicCount = 0,
    namedConst = 0;
  for (const line of codeLines) {
    const t = line.trim();
    if (NAMED_CONST_RE.test(t)) {
      namedConst++;
      continue;
    }
    const nums =
      t.match(/(?:^|[^[\]"'])\b([2-9]\d+|\d{3,})\b(?:[^"'\]]|$)/g) || [];
    magicCount += nums.length;
  }
  const hasNamedConsts = namedConst >= 2;
  if (magicCount === 0 && hasNamedConsts) return 85;
  if (magicCount === 0) return 60;
  if (magicCount <= 2) return 40;
  return Math.max(10, 40 - magicCount * 5);
}

// 15. Cyclomatic Complexity Uniformity — high = AI
export function cyclomaticComplexityUniformity(lines, lp) {
  const fnRe = lp.fnDef || /^\s*def \w+\(/;
  const functions = [];
  let currentFnComplexity = 0;
  let inFunction = false;
  let fnIndent = 0;

  for (const line of lines) {
    const t = line.trim();
    const indent = line.match(/^(\s*)/)[1].length;
    if (fnRe.test(line)) {
      if (inFunction) functions.push(currentFnComplexity);
      currentFnComplexity = 1;
      inFunction = true;
      fnIndent = indent;
      continue;
    }
    if (inFunction) {
      if (
        /\b(if|elif|else if|for|while|and|or|&&|\|\||except|catch|case|match)\b/.test(
          t,
        )
      )
        currentFnComplexity++;
    }
  }
  if (inFunction) functions.push(currentFnComplexity);
  if (functions.length < 2) return 40;

  const mean = functions.reduce((a, b) => a + b, 0) / functions.length;
  const variance =
    functions.reduce((a, b) => a + (b - mean) ** 2, 0) / functions.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (cv < 0.25) return 85;
  if (cv < 0.4) return 65;
  if (cv < 0.6) return 45;
  return 20;
}

// 16. Halstead Uniformity — high = AI
export function halsteadUniformity(lines, lp) {
  const OPERATORS = /[+\-*/%=<>!&|^~]+|and\b|or\b|not\b|in\b|is\b/g;
  const OPERANDS = /\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g;
  const fnRe = lp.fnDef || /^\s*def \w+\(/;
  const fnBlocks = [];
  let block = [];
  let inFn = false;

  for (const line of lines) {
    if (fnRe.test(line)) {
      if (block.length > 2) fnBlocks.push(block);
      block = [];
      inFn = true;
    }
    if (inFn) block.push(line);
  }
  if (block.length > 2) fnBlocks.push(block);
  if (fnBlocks.length < 2) return 40;

  const volumes = fnBlocks.map((b) => {
    const text = b.join("\n");
    const ops = new Set(text.match(OPERATORS) || []).size;
    const ands = new Set(text.match(OPERANDS) || []).size;
    return (ops + ands) * Math.log2(ops + ands + 1);
  });

  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance =
    volumes.reduce((a, b) => a + (b - mean) ** 2, 0) / volumes.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (cv < 0.25) return 80;
  if (cv < 0.45) return 60;
  if (cv < 0.65) return 40;
  return 20;
}

// 17. Type-Token Ratio — low = AI
export function typeTokenRatio(text) {
  const tokens = (text.toLowerCase().match(/\b[a-z_]\w*\b/g) || []).filter(
    (t) => !KEYWORDS.has(t),
  );
  if (tokens.length < 10) return 50;
  const uniqueCount = new Set(tokens).size;
  const ttr = uniqueCount / tokens.length;
  return Math.min(100, Math.round(ttr * 130));
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

// 18. Guard Clause Density — high = AI
// AI validates every input at the top of every function.
// Humans validate inline or not at all.
export function guardClauseDensity(lines, lp) {
  const fnRe = lp.fnDef || /^\s*def \w+\(/;
  let fnCount = 0,
    guardedFns = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!fnRe.test(lines[i])) continue;
    fnCount++;
    let guardCount = 0;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (
        /\bif\s+(not\s+|!\s*)?(\w+|len\(|typeof |instanceof )/.test(t) &&
        /\b(raise|throw|return|ValueError|TypeError|Error|panic|IllegalArgument)\b/.test(
          t,
        )
      ) {
        guardCount++;
      }
      if (fnRe.test(lines[j])) break;
    }
    if (guardCount >= 1) guardedFns++;
  }
  if (fnCount < 2) return 40;
  const ratio = guardedFns / fnCount;
  if (ratio >= 0.7) return 85;
  if (ratio >= 0.4) return 60;
  if (ratio >= 0.2) return 40;
  return 20;
}

// 19. Error Message Verbosity — high = AI
// AI: "Invalid input: expected a positive integer, got {x}"
// Human: "bad input", "err", or no message at all
export function errorMessageVerbosity(text) {
  const errorStrings =
    text.match(
      /(raise|throw|Error|Exception|panic|Err)\s*\(\s*[fbr]?["'`]([^"'`]+)["'`]/g,
    ) || [];
  if (errorStrings.length === 0) return 40;

  let verboseCount = 0;
  for (const s of errorStrings) {
    const msg = s.match(/[fbr]?["'`]([^"'`]+)["'`]/);
    if (msg && msg[1].length > 30 && msg[1].split(" ").length >= 4) {
      verboseCount++;
    }
  }
  const ratio = verboseCount / errorStrings.length;
  if (ratio >= 0.7) return 85;
  if (ratio >= 0.4) return 60;
  return 25;
}

// 20. Emoji Presence — high = AI
// AI-generated code frequently sprinkles emojis in comments, log messages,
// and string literals. Human-written production code almost never does.
export function emojiPresence(text) {
  const emojiRe = /\p{Extended_Pictographic}/gu;
  const matches = text.match(emojiRe) || [];
  if (matches.length === 0) return 0;
  if (matches.length === 1) return 60;
  if (matches.length <= 3) return 80;
  return 95;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-line classifier (language-aware)
// ─────────────────────────────────────────────────────────────────────────────

export function classifyLine(line, allLines, idx, language) {
  const t = line.trim();
  if (!t) return { status: "uncertain", confidence: 50, signals: [] };

  const lp = getLangPatterns(language);
  const aiSignals = [];
  const humanSignals = [];

  // Doc patterns
  if (lp.docOpen && lp.docOpen.test(t)) aiSignals.push("doc-comment delimiter");
  if (lp.docSections && lp.docSections.test(t))
    aiSignals.push("structured doc section (@param/@returns/Args)");

  // Type annotations on function definitions + structural regularity signals
  if (lp.fnDef && lp.fnDef.test(t)) {
    if (lp.typeAnnot && lp.typeAnnot.test(t)) {
      aiSignals.push("fully type-annotated function signature");
      lp.typeAnnot.lastIndex = 0;
    }
    if (lp.returnType && lp.returnType.test(t)) {
      aiSignals.push("return type annotation");
      lp.returnType.lastIndex = 0;
    }
    // Structural regularity criterion (c): long function name > 12 chars
    const fnN = extractFnName(t);
    if (fnN && fnN.length > 12)
      aiSignals.push(`AI-verbose function name (${fnN})`);
    // Structural regularity criterion (a): param name analysis
    // Only flag short params as human when no type annotations present —
    // short params WITH annotations (x: int) is still an AI pattern.
    const params = extractParams(t);
    if (params.length > 0) {
      const shortParams = params.filter(p => p.length < 4 || SHORT_PARAM_NAMES.has(p));
      const hasAnnotations = lp.typeAnnot && lp.typeAnnot.test(t);
      if (lp.typeAnnot) lp.typeAnnot.lastIndex = 0;
      if (shortParams.length === 0)
        aiSignals.push("full-word parameter names");
      else if (shortParams.length === params.length && !hasAnnotations)
        humanSignals.push(`competitive-style short params (${shortParams.slice(0, 3).join(", ")})`);
    }
  }

  // Exception patterns
  if (lp.exceptBroad && lp.exceptBroad.test(t))
    aiSignals.push("broad exception catch (AI pattern)");
  if (lp.exceptBare && lp.exceptBare.test(t))
    humanSignals.push("bare/empty catch (human shortcut)");

  // Typing / type-only imports
  if (lp.typingImport && lp.typingImport.test(t))
    aiSignals.push("type-system import");

  // Comments
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  if (commentRe.test(t)) {
    const body = t.replace(/^\s*(#|\/\/|\/\*\*|\*)+\s*/, "");
    if (
      /^[A-Z]/.test(body) &&
      body.split(" ").length >= 5 &&
      !/TODO|FIXME|hack|temp|wip/i.test(body)
    )
      aiSignals.push("formal sentence-style comment");
    if (/TODO|FIXME|hack|temp|wtf|idk|lol|!!|\?|wip|xxx/i.test(body))
      humanSignals.push("casual comment marker");
    if (/^[a-z]/.test(body) && body.length < 35)
      humanSignals.push("lowercase terse comment");
    if (/^(Step|Phase)\s+\d+\s*:/i.test(body))
      aiSignals.push("numbered step comment (AI pattern)");
  }

  // Strip string literal contents so naming analysis only sees actual code identifiers
  const codeOnly = t.replace(/(["'`])(?:(?!\1).)*\1/g, "$1$1");

  // Naming analysis
  const ids = codeOnly.match(/\b[a-z][a-zA-Z0-9_]{4,}\b/g) || [];
  const verboseIds = ids.filter(
    (i) =>
      !KEYWORDS.has(i) &&
      !STDLIB_NAMES.has(i) &&
      (i.length > 12 || (i.includes("_") && i.length > 8)),
  );
  if (ids.length > 0 && verboseIds.length / ids.length > 0.4)
    aiSignals.push(`verbose naming: ${verboseIds.slice(0, 2).join(", ")}`);

  const kw2 = new Set([
    "if", "in", "or", "and", "not", "for", "def", "try", "as", "is", "do", "of", "fn", "go",
    // C-family type keywords / language constructs (not variable names)
    "int", "new", "var", "let", "std", "end", "nil", "out", "pub", "use",
    "map", "set", "get", "put", "add", "pop", "has", "run", "log",
    "max", "min", "abs", "len", "key", "str", "num", "the", "any", "all",
    "top", "err", "ret", "arr", "vec", "val", "ref", "ptr", "mut", "raw",
  ]);
  const shorts = (codeOnly.match(/\b[a-z]{1,3}\b/g) || []).filter(
    (i) => !kw2.has(i),
  );
  if (shorts.length >= 2)
    humanSignals.push(`abbreviated names: ${shorts.slice(0, 2).join(", ")}`);

  // Variable mutation — competitive coding pattern (human signal)
  if (/\b[a-z_]\w*\s*(\+=|-=|\*=|\/=|%=|\|=|&=|\^=|<<=|>>=)/.test(codeOnly))
    humanSignals.push("compound assignment (competitive pattern)");
  if (/\b[a-z_]\w*\s*(\+\+|--)/.test(codeOnly) || /(\+\+|--)\s*[a-z_]\w*\b/.test(codeOnly))
    humanSignals.push("increment/decrement operator");

  // Code style markers
  if (/:\s+(return|pass|break|continue)\b/.test(t))
    humanSignals.push("one-liner shortcut");
  if (/\btest_cases\s*=|\bexpected_output\s*=|\bsample_input\s*=/.test(t))
    aiSignals.push("AI-typical demo variable");
  if (
    /#.*\b(TODO|FIXME|hack|temp|wip)\b/i.test(t) ||
    /\/\/.*\b(TODO|FIXME|hack|temp|wip)\b/i.test(t)
  )
    humanSignals.push("TODO/FIXME comment");

  // Verbose error messages on this line
  const errMsg = t.match(
    /(raise|throw|Error|Exception|panic)\s*\(\s*[fbr]?["'`]([^"'`]{30,})["'`]/,
  );
  if (errMsg) aiSignals.push("verbose error message (AI pattern)");

  // Short error messages
  const shortErr = t.match(
    /(raise|throw|Error|panic)\s*\(\s*[fbr]?["'`]([^"'`]{1,15})["'`]/,
  );
  if (shortErr && !errMsg) humanSignals.push("terse error message");

  // Emoji presence — strong AI indicator
  if (/\p{Extended_Pictographic}/u.test(t))
    aiSignals.push("emoji in code (AI pattern)");

  const total = aiSignals.length + humanSignals.length;
  if (total === 0) return { status: "uncertain", confidence: 50, signals: [] };
  const aiRatio = aiSignals.length / total;
  const confidence = Math.min(
    92,
    Math.round(50 + Math.abs(aiRatio - 0.5) * 80),
  );
  if (aiRatio > 0.58) return { status: "ai", confidence, signals: aiSignals };
  if (aiRatio < 0.42)
    return { status: "human", confidence, signals: humanSignals };
  return {
    status: "uncertain",
    confidence,
    signals: [...aiSignals, ...humanSignals],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all Tier 1 signals — now accepts language
// ─────────────────────────────────────────────────────────────────────────────

export function runTier1(code, lines, language) {
  const lp = getLangPatterns(language);
  return {
    entropy: identifierEntropy(code),
    blank_density: blankLineDensity(lines),
    naming_verbosity: namingVerbosity(lines, lp),
    type_annotations: typeAnnotationScore(code, lp),
    docstring_coverage: docstringCoverage(lines, lp),
    structural_regularity: structuralRegularity(lines, lp),
    comment_absence: inlineCommentAbsence(lines, lp),
    indent_consistency: indentConsistency(lines, language),
    exception_handling: exceptionHandlingStyle(code, lp),
    import_organisation: importOrganisation(lines, lp),
    string_formatting: stringFormattingStyle(code, lp),
    dead_code_absence: deadCodeAbsence(lines, lp),
    variable_reuse: variableReusePattern(lines),
    magic_numbers: magicNumberUsage(lines, lp),
    complexity_uniformity: cyclomaticComplexityUniformity(lines, lp),
    halstead_uniformity: halsteadUniformity(lines, lp),
    type_token_ratio: typeTokenRatio(code),
    guard_clauses: guardClauseDensity(lines, lp),
    error_verbosity: errorMessageVerbosity(code),
    emoji_presence: emojiPresence(code),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug version — returns raw regex extractions alongside scores
// ─────────────────────────────────────────────────────────────────────────────

export function runTier1Debug(code, lines, language) {
  const lp = getLangPatterns(language);
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;

  // ── 1. Identifier Entropy ──────────────────────────────────────────────
  const entropyTokens = (code.match(/\b[a-zA-Z_]\w*\b/g) || []).filter(
    (t) => !KEYWORDS.has(t),
  );
  const entropyFreq = {};
  entropyTokens.forEach((t) => { entropyFreq[t] = (entropyFreq[t] || 0) + 1; });

  // ── 2. Blank Line Density ──────────────────────────────────────────────
  const blankLines = lines.filter((l) => !l.trim());

  // ── 3. Naming Verbosity ────────────────────────────────────────────────
  const nvCodeLines = lines.filter((l) => {
    const t = l.trim();
    return t && !commentRe.test(t) && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith("*");
  });
  const nvRawMatches = nvCodeLines.join("\n").match(/\b[a-z][a-zA-Z0-9_]{3,}\b/g) || [];
  const nvFilteredKeywords = nvRawMatches.filter((t) => KEYWORDS.has(t.toLowerCase()));
  const nvFilteredStdlib = nvRawMatches.filter((t) => STDLIB_NAMES.has(t));
  const nvAllIds = nvRawMatches.filter((t) => !KEYWORDS.has(t.toLowerCase()) && !STDLIB_NAMES.has(t));
  const nvVerbose = nvAllIds.filter((id) => id.length > 9 || (id.includes("_") && id.length > 6));
  const nvShort = nvAllIds.filter((id) => !nvVerbose.includes(id));

  // ── 4. Type Annotations ────────────────────────────────────────────────
  const typeAnnotMatches = lp.typeAnnot ? (code.match(lp.typeAnnot) || []) : [];
  if (lp.typeAnnot) lp.typeAnnot.lastIndex = 0;
  const returnTypeMatches = lp.returnType ? (code.match(lp.returnType) || []) : [];
  if (lp.returnType) lp.returnType.lastIndex = 0;

  // ── 5. Docstring Coverage ──────────────────────────────────────────────
  const docEntities = [];
  const docDocumented = [];
  if (lp.fnDef) {
    const CTOR = /\b(__init__|constructor|new)\s*\(/;
    for (let i = 0; i < lines.length; i++) {
      const isFn = lp.fnDef.test(lines[i]);
      const isClass = lp.classDef && lp.classDef.test(lines[i]);
      if (!isFn && !isClass) continue;
      if (isFn && CTOR.test(lines[i])) continue;
      docEntities.push(lines[i].trim());
      if (!lp.docOpen) continue;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = lines[j].trim();
        if (next) {
          if (lp.docOpen.test(next)) docDocumented.push(lines[i].trim());
          break;
        }
      }
    }
  }

  // ── 6. Structural Regularity ───────────────────────────────────────────
  const srMethods = lines.map((l, i) => ({ l, i })).filter(({ l }) => lp.fnDef && lp.fnDef.test(l));
  const srCanonical = [];
  for (const { l, i } of srMethods) {
    let criteriaHit = 0;
    const fnName = extractFnName(l);
    const params = extractParams(l);
    const body = getFnBody(lines, i);
    const bodyText = body.join("\n");
    if (params.length > 0 && params.every(p => p.length >= 4 && !SHORT_PARAM_NAMES.has(p))) criteriaHit++;
    const returnCount = body.filter(bl => /\b(return)\b/.test(bl.trim())).length;
    const mutVars = {};
    for (const bl of body) {
      const t = bl.trim();
      const plain = t.match(/^(?:let|var|const|int|double|float|string|bool|auto)?\s*([a-z_]\w*)\s*=[^=]/);
      if (plain) mutVars[plain[1]] = (mutVars[plain[1]] || 0) + 1;
      for (const cm of t.matchAll(/\b([a-z_]\w*)\s*(?:\+|-|\*|\/|%|\||\&|\^|<<|>>)=/g)) mutVars[cm[1]] = (mutVars[cm[1]] || 0) + 1;
      for (const im of t.matchAll(/\b([a-z_]\w*)\s*(\+\+|--)/g)) mutVars[im[1]] = (mutVars[im[1]] || 0) + 1;
      for (const pm of t.matchAll(/(\+\+|--)([a-z_]\w*)\b/g)) mutVars[pm[2]] = (mutVars[pm[2]] || 0) + 1;
    }
    if (returnCount <= 1 && !Object.values(mutVars).some(c => c > 1)) criteriaHit++;
    if (fnName && fnName.length > 12) criteriaHit++;
    if (params.length > 0) {
      const allUsedOnce = params.every(p => {
        const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "g");
        return (bodyText.match(re) || []).length === 1;
      });
      if (allUsedOnce) criteriaHit++;
    }
    if (criteriaHit >= 2) srCanonical.push(l.trim());
  }

  // ── 7. Comment Absence ─────────────────────────────────────────────────
  const caCodeLines = lines.filter((l) => {
    const t = l.trim();
    return t && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith("/*");
  });
  const casualComments = caCodeLines.filter((l) => /TODO|FIXME|HACK|wtf|idk|lol|quick|temp|xxx|wip/i.test(l));
  const inlineComments = caCodeLines.filter((l) => commentRe.test(l.trim()) && !/TODO|FIXME/i.test(l));

  // ── 8. Indent Consistency ──────────────────────────────────────────────
  const indented = lines.filter((l) => l.trim().length > 0);
  const indents = indented.map((l) => l.match(/^(\s*)/)[1].length);
  const nonZero = indents.filter((i) => i > 0);
  const indentBase = nonZero.length ? Math.min(...nonZero) : 0;

  // ── 9. Exception Handling ──────────────────────────────────────────────
  const broadMatches = lp.exceptBroad ? (code.match(new RegExp(lp.exceptBroad.source, "gm")) || []) : [];
  const bareMatches = lp.exceptBare ? (code.match(new RegExp(lp.exceptBare.source, "gm")) || []) : [];
  const raiseMatches = code.match(/\b(raise|throw|panic)\b/g) || [];

  // ── 10. Import Organisation ────────────────────────────────────────────
  const importRe = /^(import |from \w|require\(|use |#include|using )/;
  const importLines = lines.filter((l) => importRe.test(l.trim()));
  const importGroups = [];
  let curGroup = [];
  for (const line of lines) {
    const t = line.trim();
    if (importRe.test(t)) { curGroup.push(t); }
    else if (!t && curGroup.length > 0) { importGroups.push(curGroup); curGroup = []; }
  }
  if (curGroup.length > 0) importGroups.push(curGroup);
  const hasTypingImport = lp.typingImport ? importLines.some((l) => lp.typingImport.test(l)) : false;

  // ── 11. String Formatting ──────────────────────────────────────────────
  const fmtModernMatches = lp.fmtModern ? (code.match(lp.fmtModern) || []) : [];
  if (lp.fmtModern) lp.fmtModern.lastIndex = 0;
  const fmtOldMatches = lp.fmtOld ? (code.match(lp.fmtOld) || []) : [];
  if (lp.fmtOld) lp.fmtOld.lastIndex = 0;

  // ── 12. Dead Code Absence (commented-out code only) ────────────────────
  const commentedCode = lines.filter((l) => {
    const t = l.trim();
    return commentRe.test(t) && COMMENTED_CODE_RE.test(t);
  });

  // ── 13. Variable Reuse ─────────────────────────────────────────────────
  const vrAssignments = {};
  for (const line of lines) {
    const t = line.trim();
    if (VR_SKIP_RE.test(t)) continue;
    let vrVarName = null;
    const vrM1 = t.match(VR_ASSIGN_RE1);
    if (vrM1 && !t.startsWith(vrM1[1] + "::")) {
      vrVarName = vrM1[1];
    } else {
      const vrM2 = t.match(VR_ASSIGN_RE2);
      if (vrM2) vrVarName = vrM2[1];
    }
    if (vrVarName && !VR_EXCLUDED.has(vrVarName)) {
      vrAssignments[vrVarName] = (vrAssignments[vrVarName] || 0) + 1;
    }
  }
  const vrReused = Object.entries(vrAssignments).filter(([, c]) => c > 1);

  // ── 14. Magic Numbers ──────────────────────────────────────────────────
  const mnCodeLines = lines.filter((l) => {
    const t = l.trim();
    return t && !commentRe.test(t) && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith("/*");
  });
  const mnConstants = [];
  const mnMagicNums = [];
  for (const line of mnCodeLines) {
    const mnT = line.trim();
    const constMatch = mnT.match(NAMED_CONST_RE);
    if (constMatch) {
      mnConstants.push(constMatch[1]);
      continue;
    }
    const nums = mnT.match(/(?:^|[^[\]"'])\b([2-9]\d+|\d{3,})\b(?:[^"'\]]|$)/g) || [];
    mnMagicNums.push(...nums.map(s => s.trim()));
  }

  // ── 15. Complexity Uniformity ──────────────────────────────────────────
  const fnRe = lp.fnDef || /^\s*def \w+\(/;
  const ccFunctions = [];
  let ccCurrent = 0, ccInFn = false;
  for (const line of lines) {
    const t = line.trim();
    if (fnRe.test(line)) {
      if (ccInFn) ccFunctions.push(ccCurrent);
      ccCurrent = 1; ccInFn = true; continue;
    }
    if (ccInFn && /\b(if|elif|else if|for|while|and|or|&&|\|\||except|catch|case|match)\b/.test(t)) ccCurrent++;
  }
  if (ccInFn) ccFunctions.push(ccCurrent);

  // ── 16. Halstead Uniformity ────────────────────────────────────────────
  const OPERATORS = /[+\-*/%=<>!&|^~]+|and\b|or\b|not\b|in\b|is\b/g;
  const OPERANDS = /\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g;
  const hBlocks = [];
  let hBlock = [], hInFn = false;
  for (const line of lines) {
    if (fnRe.test(line)) {
      if (hBlock.length > 2) hBlocks.push(hBlock);
      hBlock = []; hInFn = true;
    }
    if (hInFn) hBlock.push(line);
  }
  if (hBlock.length > 2) hBlocks.push(hBlock);
  const hVolumes = hBlocks.map((b) => {
    const text = b.join("\n");
    const ops = new Set(text.match(OPERATORS) || []).size;
    const ands = new Set(text.match(OPERANDS) || []).size;
    return Math.round((ops + ands) * Math.log2(ops + ands + 1));
  });

  // ── 17. Type-Token Ratio ───────────────────────────────────────────────
  const ttrTokens = (code.toLowerCase().match(/\b[a-z_]\w*\b/g) || []).filter(
    (t) => !KEYWORDS.has(t),
  );
  const ttrUnique = new Set(ttrTokens);

  // ── 18. Guard Clause Density ───────────────────────────────────────────
  const gcFunctions = [];
  for (let i = 0; i < lines.length; i++) {
    if (!fnRe.test(lines[i])) continue;
    const fnName = lines[i].trim();
    const guards = [];
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (/\bif\s+(not\s+|!\s*)?(\w+|len\(|typeof |instanceof )/.test(t) &&
          /\b(raise|throw|return|ValueError|TypeError|Error|panic|IllegalArgument)\b/.test(t)) {
        guards.push(t);
      }
      if (fnRe.test(lines[j])) break;
    }
    gcFunctions.push({ name: fnName, guards });
  }

  // ── 19. Error Message Verbosity ────────────────────────────────────────
  const errorStrings = code.match(/(raise|throw|Error|Exception|panic|Err)\s*\(\s*[fbr]?["'`]([^"'`]+)["'`]/g) || [];
  const emVerbose = [];
  const emTerse = [];
  for (const s of errorStrings) {
    const msg = s.match(/[fbr]?["'`]([^"'`]+)["'`]/);
    if (msg) {
      if (msg[1].length > 30 && msg[1].split(" ").length >= 4) emVerbose.push(msg[1]);
      else emTerse.push(msg[1]);
    }
  }

  // ── 20. Emoji Presence ─────────────────────────────────────────────────
  const emojiMatches = code.match(/\p{Extended_Pictographic}/gu) || [];

  // ── Run the actual score functions for accurate scores ─────────────────
  const scores = runTier1(code, lines, language);

  return {
    entropy: {
      score: scores.entropy,
      uniqueTokens: Object.keys(entropyFreq).length,
      totalTokens: entropyTokens.length,
      topTokens: Object.entries(entropyFreq).sort((a, b) => b[1] - a[1]).slice(0, 15),
    },
    blank_density: {
      score: scores.blank_density,
      blankCount: blankLines.length,
      totalLines: lines.length,
      ratio: lines.length ? +(blankLines.length / lines.length).toFixed(3) : 0,
    },
    naming_verbosity: {
      score: scores.naming_verbosity,
      allIdentifiers: [...new Set(nvAllIds)],
      verboseIdentifiers: [...new Set(nvVerbose)],
      shortIdentifiers: [...new Set(nvShort)],
      filteredKeywords: [...new Set(nvFilteredKeywords)],
      filteredStdlib: [...new Set(nvFilteredStdlib)],
    },
    type_annotations: {
      score: scores.type_annotations,
      typeAnnotations: typeAnnotMatches,
      returnTypes: returnTypeMatches,
    },
    docstring_coverage: {
      score: scores.docstring_coverage,
      entities: docEntities,
      documented: docDocumented,
      undocumented: docEntities.filter((e) => !docDocumented.includes(e)),
    },
    structural_regularity: {
      score: scores.structural_regularity,
      totalMethods: srMethods.length,
      canonicalMethods: srCanonical,
    },
    comment_absence: {
      score: scores.comment_absence,
      totalCodeLines: caCodeLines.length,
      casualComments: casualComments.map((l) => l.trim()),
      formalComments: inlineComments.map((l) => l.trim()),
    },
    indent_consistency: {
      score: scores.indent_consistency,
      baseIndent: indentBase,
      indentValues: [...new Set(nonZero)].sort((a, b) => a - b),
      language,
    },
    exception_handling: {
      score: scores.exception_handling,
      broadCatches: broadMatches,
      bareCatches: bareMatches,
      raiseThrow: raiseMatches,
    },
    import_organisation: {
      score: scores.import_organisation,
      importLines: importLines.map((l) => l.trim()),
      groupCount: importGroups.length,
      hasTypingImport,
    },
    string_formatting: {
      score: scores.string_formatting,
      modernMatches: fmtModernMatches,
      oldMatches: fmtOldMatches,
    },
    dead_code_absence: {
      score: scores.dead_code_absence,
      commentedCode: commentedCode.map((l) => l.trim()),
    },
    variable_reuse: {
      score: scores.variable_reuse,
      assignments: vrAssignments,
      reusedVars: vrReused.map(([name, count]) => `${name} (${count}x)`),
      totalVars: Object.keys(vrAssignments).length,
    },
    magic_numbers: {
      score: scores.magic_numbers,
      namedConstants: mnConstants,
      magicNumbers: mnMagicNums,
    },
    complexity_uniformity: {
      score: scores.complexity_uniformity,
      perFunction: ccFunctions,
    },
    halstead_uniformity: {
      score: scores.halstead_uniformity,
      perFunction: hVolumes,
    },
    type_token_ratio: {
      score: scores.type_token_ratio,
      uniqueTokens: ttrUnique.size,
      totalTokens: ttrTokens.length,
      ratio: ttrTokens.length ? +(ttrUnique.size / ttrTokens.length).toFixed(3) : 0,
    },
    guard_clauses: {
      score: scores.guard_clauses,
      functions: gcFunctions,
    },
    error_verbosity: {
      score: scores.error_verbosity,
      verboseMessages: emVerbose,
      terseMessages: emTerse,
    },
    emoji_presence: {
      score: scores.emoji_presence,
      emojis: emojiMatches,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bypass flag — runs BEFORE scoring, outside the weighted pipeline.
//
// In a proctored DSA exam where external paste is blocked, type annotations,
// docstrings, and emojis are near-impossible to type naturally under time
// pressure. Including them in the weighted score would overfit to the <2%
// of submissions that contain them, diluting accuracy for the other 98%.
// Instead they trigger a high-confidence flag for immediate reviewer attention.
// ─────────────────────────────────────────────────────────────────────────────

// Languages where type annotations are optional — their presence in a timed
// DSA exam is a strong AI signal.  Statically-typed languages (Java, C++,
// C, C#) require type declarations by syntax, so annotations there are
// normal and must NOT trigger the bypass.
const TYPE_ANNOT_BYPASS_LANGS = new Set(["Python"]);

export function computeBypassFlag(code, lines, language) {
  const lp = getLangPatterns(language);
  const reasons = [];

  if (
    TYPE_ANNOT_BYPASS_LANGS.has(language) &&
    typeAnnotationScore(code, lp) > 0
  ) {
    reasons.push("type_annotations");
  }
  if (docstringCoverage(lines, lp) > 0) {
    reasons.push("docstring_present");
  }
  if (emojiPresence(code) > 0) {
    reasons.push("emoji_present");
  }

  const triggered = reasons.length > 0;
  return {
    triggered,
    bypass_confidence: triggered ? 0.92 : 0,
    reasons,
    message: triggered
      ? "Structural AI markers detected — immediate review recommended"
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weighted score from Tier 1 metrics (0-100, high = AI)
//
// 9 active signals tuned for proctored DSA/coding assessments.
// Removed from weights (still computed for diagnostics):
//   guard_clauses      → humans also write guard clauses in DSA
//   complexity_uniformity → not stable across languages/code sizes
//   type_annotations, docstring_coverage, emoji_presence → bypass flag
//   comment_absence    → removed: commenting style is personal preference
//   blank_density      → meaningless at DSA scale
//   indent_consistency → editor auto-formats
//   halstead_uniformity → too noisy on short DSA functions
//   string_formatting  → DSA solutions rarely use complex strings
//   guard_clauses      → too language-dependent
//   error_verbosity    → sparse in DSA code
// ─────────────────────────────────────────────────────────────────────────────

export function scoreTier1(m) {
  return Math.round(
    m.naming_verbosity * 0.28 +
      m.variable_reuse * 0.19 +
      m.structural_regularity * 0.12 +
      m.dead_code_absence * 0.10 +
      m.magic_numbers * 0.10 +
      (100 - m.type_token_ratio) * 0.08 +
      m.exception_handling * 0.06 +
      (100 - m.entropy) * 0.05 +
      m.import_organisation * 0.02,
  );
}

// Group consecutive lines with the same dominant classification
export function buildGroups(lineResults) {
  if (!lineResults || lineResults.length === 0) return [];
  const groups = [];
  let currentGroup = {
    dominant: lineResults[0].status,
    start: 1,
    end: 1,
    signals: [...lineResults[0].signals],
  };
  for (let i = 1; i < lineResults.length; i++) {
    const result = lineResults[i];
    if (result.status === currentGroup.dominant) {
      currentGroup.end = i + 1;
      currentGroup.signals.push(...result.signals);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        dominant: result.status,
        start: i + 1,
        end: i + 1,
        signals: [...result.signals],
      };
    }
  }
  groups.push(currentGroup);
  return groups;
}
