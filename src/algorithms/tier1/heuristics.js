/**
 * algorithms/tier1/heuristics.js
 *
 * TIER 1 — Heuristic / Static Analysis
 * Pure JavaScript, no model, no network. Runs instantly.
 *
 * 19 signals (17 original + 2 new), now language-aware.
 */

const KEYWORDS = new Set([
  'if','else','elif','for','while','return','def','class','import','from',
  'with','as','in','not','and','or','try','except','finally','True','False',
  'None','self','is','raise','break','continue','pass','new','this','var',
  'let','const','function','async','await','null','undefined','true','false',
  'public','private','static','void','int','boolean','string','type','interface',
  'enum','extends','implements','switch','case','default','throw','catch',
  'open','print','len','sorted','super','object','fn','mut','pub','impl',
  'trait','struct','use','mod','match','package','func','defer','go','chan',
  'val','fun','companion','override','abstract','final','protected',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Language-specific pattern configuration
// ─────────────────────────────────────────────────────────────────────────────

const LANG = {
  Python: {
    fnDef:        /^\s*def \w+\(/,
    classDef:     /^\s*class \w+/,
    docOpen:      /^\s*("""|''')/,
    docSections:  /^(Args|Returns|Raises|Parameters|Notes|Yields|Attributes|Examples)\s*:/i,
    typeAnnot:    /:\s*(str|int|float|bool|List|Dict|Optional|Union|Any|tuple|set|None)\b/g,
    returnType:   /->\s*(str|int|float|bool|List|Dict|Optional|Union|Any|None|tuple|set)/g,
    exceptBroad:  /except\s+Exception\s+as\s+\w+/,
    exceptBare:   /^\s*except\s*:/,
    typingImport: /from typing import/,
    commentLine:  /^\s*#/,
    commentInline:/\s#\s/,
    fmtModern:    /f["'][^"']*\{/g,
    fmtOld:       /\.format\s*\(|["'][^"']*%[sd]/g,
  },
  JavaScript: {
    fnDef:        /^\s*(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|const\s+\w+\s*=\s*(async\s+)?function)/,
    classDef:     /^\s*class \w+/,
    docOpen:      /^\s*\/\*\*/,
    docSections:  /^\s*\*\s*@(param|returns|throws|example|description|type|typedef)\b/i,
    typeAnnot:    null,
    returnType:   null,
    exceptBroad:  /catch\s*\(\s*\w+\s*\)/,
    exceptBare:   /catch\s*\(\s*\)/,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    /`[^`]*\$\{/g,
    fmtOld:       /["']\s*\+\s*\w/g,
  },
  TypeScript: {
    fnDef:        /^\s*(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|const\s+\w+\s*=\s*(async\s+)?function)/,
    classDef:     /^\s*class \w+/,
    docOpen:      /^\s*\/\*\*/,
    docSections:  /^\s*\*\s*@(param|returns|throws|example|description|type|typedef)\b/i,
    typeAnnot:    /:\s*(string|number|boolean|void|any|unknown|never|object|Record|Partial|Omit|Pick|Array)\b/g,
    returnType:   /\)\s*:\s*(string|number|boolean|void|Promise|any|unknown|never|object|Record)\b/g,
    exceptBroad:  /catch\s*\(\s*\w+\s*\)/,
    exceptBare:   /catch\s*\(\s*\)/,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    /`[^`]*\$\{/g,
    fmtOld:       /["']\s*\+\s*\w/g,
  },
  Java: {
    fnDef:        /^\s*(public|private|protected|static)?\s*(void|int|String|boolean|double|float|long|char|List|Map|Optional|CompletableFuture)\s+\w+\s*\(/,
    classDef:     /^\s*(public\s+)?(abstract\s+)?(class|interface|enum)\s+\w+/,
    docOpen:      /^\s*\/\*\*/,
    docSections:  /^\s*\*\s*@(param|return|throws|exception|see|since|author|deprecated)\b/i,
    typeAnnot:    /\b(int|String|boolean|double|float|long|char|void|List|Map|Set|Optional)\s+\w+/g,
    returnType:   null,
    exceptBroad:  /catch\s*\(\s*Exception\s+\w+\s*\)/,
    exceptBare:   /catch\s*\(\s*Exception\s+\w+\s*\)/,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    null,
    fmtOld:       /["']\s*\+\s*\w/g,
  },
  Go: {
    fnDef:        /^\s*func\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/,
    classDef:     /^\s*type\s+\w+\s+struct\b/,
    docOpen:      null,
    docSections:  null,
    typeAnnot:    /\b(string|int|int64|float64|bool|error|byte|rune|interface\{\}|any)\b/g,
    returnType:   /\)\s*(\(?\s*(string|int|int64|float64|bool|error|byte|\*\w+))/g,
    exceptBroad:  /if\s+err\s*!=\s*nil/,
    exceptBare:   null,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    /fmt\.(Sprintf|Fprintf|Errorf)\s*\(/g,
    fmtOld:       /\+\s*strconv\./g,
  },
  Rust: {
    fnDef:        /^\s*(pub\s+)?(async\s+)?fn\s+\w+/,
    classDef:     /^\s*(pub\s+)?(struct|enum|trait|impl)\s+\w+/,
    docOpen:      /^\s*\/\/\//,
    docSections:  /^\s*\/\/\/\s*#\s*(Arguments|Returns|Errors|Panics|Examples|Safety)\b/i,
    typeAnnot:    /:\s*(&?\s*(mut\s+)?(String|i32|i64|u32|u64|f64|f32|bool|Vec|Option|Result|Box|Arc|Rc|usize|isize))\b/g,
    returnType:   /->\s*(String|i32|i64|u32|u64|f64|f32|bool|Vec|Option|Result|Box|Arc|Rc|usize|isize|Self|&)/g,
    exceptBroad:  /\.unwrap\(\)/,
    exceptBare:   null,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    /format!\s*\(/g,
    fmtOld:       null,
  },
  'C++': {
    fnDef:        /^\s*(virtual\s+)?(static\s+)?(void|int|bool|string|auto|double|float|char|std::\w+)\s+\w+\s*\(/,
    classDef:     /^\s*(class|struct)\s+\w+/,
    docOpen:      /^\s*\/\*\*/,
    docSections:  /^\s*\*\s*@(param|return|brief|note|warning|throws)\b/i,
    typeAnnot:    /\b(int|bool|string|double|float|char|void|auto|size_t|std::\w+)\s+\w+/g,
    returnType:   null,
    exceptBroad:  /catch\s*\(\s*(std::exception|\.\.\.)\s*/,
    exceptBare:   /catch\s*\(\s*\.\.\.\s*\)/,
    typingImport: null,
    commentLine:  /^\s*\/\//,
    commentInline:/\s\/\/\s/,
    fmtModern:    /std::format\s*\(/g,
    fmtOld:       /printf\s*\(/g,
  },
};

function getLangPatterns(language) {
  return LANG[language] || LANG.Python;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Identifier Entropy — low = AI (repetitive vocabulary)
export function identifierEntropy(text) {
  const tokens = (text.match(/\b[a-zA-Z_]\w*\b/g) || []).filter(t => !KEYWORDS.has(t));
  if (tokens.length < 5) return 50;
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const total = tokens.length;
  let H = 0;
  Object.values(freq).forEach(c => { const p = c / total; H -= p * Math.log2(p); });
  const maxH = Math.log2(total);
  return maxH > 0 ? Math.min(100, Math.round((H / maxH) * 100)) : 50;
}

// 2. Blank Line Density — high = AI
export function blankLineDensity(lines) {
  if (lines.length < 3) return 20;
  const blanks = lines.filter(l => !l.trim()).length;
  return Math.min(100, Math.round((blanks / lines.length) * 250));
}

// 3. Naming Verbosity — high = AI
export function namingVerbosity(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !commentRe.test(t) && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith('*');
  });
  const allIds = (codeLines.join('\n').match(/\b[a-z][a-zA-Z0-9_]{3,}\b/g) || [])
    .filter(t => !KEYWORDS.has(t.toLowerCase()));
  if (!allIds.length) return 20;
  const verbose = allIds.filter(id => id.length > 9 || (id.includes('_') && id.length > 6));
  return Math.min(100, Math.round((verbose.length / allIds.length) * 160));
}

// 4. Type Annotation Score — high = AI (language-aware)
export function typeAnnotationScore(text, lp) {
  let count = 0;
  if (lp.typeAnnot) { count += (text.match(lp.typeAnnot) || []).length; }
  if (lp.returnType) { count += (text.match(lp.returnType) || []).length * 2; }
  return Math.min(100, Math.round(count * 4));
}

// 5. Docstring / doc-comment Coverage — high = AI (language-aware)
export function docstringCoverage(lines, lp) {
  if (!lp.fnDef) return 0;
  let entities = 0, documented = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lp.fnDef.test(lines[i]) && !(lp.classDef && lp.classDef.test(lines[i]))) continue;
    entities++;
    if (!lp.docOpen) continue;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j].trim();
      if (next) { if (lp.docOpen.test(next)) documented++; break; }
    }
  }
  return entities > 0 ? Math.round((documented / entities) * 100) : 0;
}

// 6. Structural Regularity — high = AI (language-aware)
export function structuralRegularity(lines, lp) {
  if (!lp.fnDef) return 0;
  const methods = lines.map((l, i) => ({ l, i })).filter(({ l }) => lp.fnDef.test(l));
  if (!methods.length) return 0;
  let canonical = 0;
  for (const { l, i } of methods) {
    const hasReturn = lp.returnType ? lp.returnType.test(l) : false;
    // Reset lastIndex for global regexes
    if (lp.returnType) lp.returnType.lastIndex = 0;
    let hasDoc = false;
    if (lp.docOpen) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = lines[j].trim();
        if (next) { hasDoc = lp.docOpen.test(next); break; }
      }
    }
    if (hasReturn && hasDoc) canonical++;
  }
  return Math.round((canonical / methods.length) * 100);
}

// 7. Inline Comment Absence — high = AI
export function inlineCommentAbsence(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith('/*');
  });
  if (codeLines.length < 5) return 50;
  const casual = codeLines.filter(l => /TODO|FIXME|HACK|wtf|idk|lol|quick|temp|xxx|wip/i.test(l)).length;
  const inline = codeLines.filter(l => commentRe.test(l.trim()) && !/TODO|FIXME/i.test(l)).length;
  const ratio  = inline / codeLines.length;
  const base   = ratio < 0.02 ? 85 : ratio < 0.05 ? 60 : 30;
  return Math.max(0, base - casual * 20);
}

// 8. Indent Consistency — high = AI
export function indentConsistency(lines) {
  const indented = lines.filter(l => l.trim().length > 0);
  if (indented.length < 3) return 50;
  const indents = indented.map(l => l.match(/^(\s*)/)[1].length);
  const nonZero = indents.filter(i => i > 0);
  if (!nonZero.length) return 50;
  const base = Math.min(...nonZero);
  const consistent = indents.filter(i => i === 0 || (base > 0 && i % base === 0)).length;
  return Math.round((consistent / indents.length) * 100);
}

// 9. Exception Handling Style — high = AI (language-aware)
export function exceptionHandlingStyle(text, lp) {
  const broadMatches = lp.exceptBroad ? (text.match(new RegExp(lp.exceptBroad.source, 'g')) || []).length : 0;
  const bareMatches  = lp.exceptBare  ? (text.match(new RegExp(lp.exceptBare.source, 'g'))  || []).length : 0;
  const total = broadMatches + bareMatches;
  if (total === 0) return 30;
  return Math.min(100, Math.round((broadMatches / total) * 100));
}

// 10. Import Organisation — high = AI (language-aware)
export function importOrganisation(lines, lp) {
  const importRe = /^(import |from \w|require\(|use |#include|using )/;
  const importLines = lines.filter(l => importRe.test(l.trim()));
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
    ? importLines.some(l => lp.typingImport.test(l))
    : false;
  const firstGroup = groups[0] || [];
  const isSorted = firstGroup.length > 1 &&
    firstGroup.every((l, i) => i === 0 || l >= firstGroup[i - 1]);

  let score = 20;
  if (isOrganised) score += 35;
  if (hasTyping)   score += 30;
  if (isSorted)    score += 15;
  return Math.min(100, score);
}

// 11. String Formatting Style — high = AI (language-aware)
export function stringFormattingStyle(text, lp) {
  const modernCount = lp.fmtModern ? (text.match(lp.fmtModern) || []).length : 0;
  const oldCount    = lp.fmtOld    ? (text.match(lp.fmtOld)    || []).length : 0;
  const total = modernCount + oldCount;
  if (total === 0) return 30;
  const purity = modernCount / total;
  if (purity === 1 && modernCount >= 2) return 85;
  if (purity >= 0.8) return 65;
  if (purity >= 0.5) return 45;
  return 20;
}

// 12. Dead Code Absence — high = AI
export function deadCodeAbsence(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const commentedCode = lines.filter(l => {
    const t = l.trim();
    return commentRe.test(t) &&
      /\b(def |class |return |import |for |if |while |print\(|console\.|func |fn |pub )\b/.test(t);
  }).length;
  const debugPrints = lines.filter(l =>
    /\bprint\s*\(\s*["']debug|console\.log\s*\(\s*["']debug/i.test(l) ||
    /\bprint\s*\(\s*\w+\s*\)\s*$/.test(l.trim()) ||
    /\bfmt\.Println\s*\(\s*\w+\s*\)\s*$/.test(l.trim()) ||
    /\bSystem\.out\.println\s*\(\s*\w+\s*\)\s*$/i.test(l.trim())
  ).length;
  const deadIndicators = commentedCode + debugPrints;
  if (deadIndicators === 0) return 75;
  if (deadIndicators === 1) return 50;
  return Math.max(10, 75 - deadIndicators * 20);
}

// 13. Variable Reuse Pattern — low reuse = AI
export function variableReusePattern(lines) {
  const assignments = {};
  const assignRe = /^(?:(?:let|const|var|val)\s+)?([a-z_][a-z0-9_]*)\s*(?::.*)?=/;
  for (const line of lines) {
    const t = line.trim();
    if (/^(def |class |#|\/\/|import |from |use |func |fn )/.test(t)) continue;
    const match = t.match(assignRe);
    if (match) {
      const varName = match[1];
      if (!['self','true','false','none','null','undefined','this'].includes(varName)) {
        assignments[varName] = (assignments[varName] || 0) + 1;
      }
    }
  }
  const vars = Object.values(assignments);
  if (vars.length < 3) return 40;
  const reusedCount = vars.filter(c => c > 1).length;
  const reuseRatio  = reusedCount / vars.length;
  if (reuseRatio < 0.1) return 80;
  if (reuseRatio < 0.2) return 60;
  if (reuseRatio < 0.35) return 40;
  return 20;
}

// 14. Magic Number Usage — high = AI
export function magicNumberUsage(lines, lp) {
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !commentRe.test(t) && !t.startsWith('"""') && !t.startsWith("'''") && !t.startsWith('/*');
  });
  let magicCount = 0, namedConst = 0;
  for (const line of codeLines) {
    if (/^[A-Z_]{2,}\s*=/.test(line.trim())) namedConst++;
    if (/^\s*const\s+[A-Z_]{2,}\s*=/.test(line)) namedConst++;
    const nums = line.match(/[^[\]"']\b([2-9]\d+|\d{3,})\b[^"'\]]/g) || [];
    magicCount += nums.length;
  }
  const hasNamedConsts = namedConst >= 2;
  if (magicCount === 0 && hasNamedConsts) return 85;
  if (magicCount === 0) return 60;
  if (magicCount <= 2)  return 40;
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
      if (/\b(if|elif|else if|for|while|and|or|&&|\|\||except|catch|case|match)\b/.test(t))
        currentFnComplexity++;
    }
  }
  if (inFunction) functions.push(currentFnComplexity);
  if (functions.length < 2) return 40;

  const mean = functions.reduce((a, b) => a + b, 0) / functions.length;
  const variance = functions.reduce((a, b) => a + (b - mean) ** 2, 0) / functions.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (cv < 0.25) return 85;
  if (cv < 0.40) return 65;
  if (cv < 0.60) return 45;
  return 20;
}

// 16. Halstead Uniformity — high = AI
export function halsteadUniformity(lines, lp) {
  const OPERATORS = /[+\-*/%=<>!&|^~]+|and\b|or\b|not\b|in\b|is\b/g;
  const OPERANDS  = /\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g;
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

  const volumes = fnBlocks.map(b => {
    const text = b.join('\n');
    const ops  = new Set((text.match(OPERATORS) || [])).size;
    const ands = new Set((text.match(OPERANDS)  || [])).size;
    return (ops + ands) * Math.log2(ops + ands + 1);
  });

  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((a, b) => a + (b - mean) ** 2, 0) / volumes.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  if (cv < 0.25) return 80;
  if (cv < 0.45) return 60;
  if (cv < 0.65) return 40;
  return 20;
}

// 17. Type-Token Ratio — low = AI
export function typeTokenRatio(text) {
  const tokens = (text.toLowerCase().match(/\b[a-z_]\w*\b/g) || [])
    .filter(t => !KEYWORDS.has(t));
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
  let fnCount = 0, guardedFns = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!fnRe.test(lines[i])) continue;
    fnCount++;
    let guardCount = 0;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (/\bif\s+(not\s+|!\s*)?(\w+|len\(|typeof |instanceof )/.test(t) &&
          /\b(raise|throw|return|ValueError|TypeError|Error|panic|IllegalArgument)\b/.test(t)) {
        guardCount++;
      }
      if (fnRe.test(lines[j])) break;
    }
    if (guardCount >= 2) guardedFns++;
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
  const errorStrings = text.match(/(raise|throw|Error|Exception|panic|Err)\s*\(\s*["'`]([^"'`]+)["'`]/g) || [];
  if (errorStrings.length === 0) return 40;

  let verboseCount = 0;
  for (const s of errorStrings) {
    const msg = s.match(/["'`]([^"'`]+)["'`]/);
    if (msg && msg[1].length > 30 && msg[1].split(' ').length >= 4) {
      verboseCount++;
    }
  }
  const ratio = verboseCount / errorStrings.length;
  if (ratio >= 0.7) return 85;
  if (ratio >= 0.4) return 60;
  return 25;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-line classifier (language-aware)
// ─────────────────────────────────────────────────────────────────────────────

export function classifyLine(line, allLines, idx, language) {
  const t = line.trim();
  if (!t) return { status: 'uncertain', confidence: 50, signals: [] };

  const lp = getLangPatterns(language);
  const aiSignals    = [];
  const humanSignals = [];

  // Doc patterns
  if (lp.docOpen && lp.docOpen.test(t))
    aiSignals.push('doc-comment delimiter');
  if (lp.docSections && lp.docSections.test(t))
    aiSignals.push('structured doc section (@param/@returns/Args)');

  // Type annotations on function definitions
  if (lp.fnDef && lp.fnDef.test(t)) {
    if (lp.typeAnnot && lp.typeAnnot.test(t)) {
      aiSignals.push('fully type-annotated function signature');
      lp.typeAnnot.lastIndex = 0;
    }
    if (lp.returnType && lp.returnType.test(t)) {
      aiSignals.push('return type annotation');
      lp.returnType.lastIndex = 0;
    }
  }

  // Exception patterns
  if (lp.exceptBroad && lp.exceptBroad.test(t))
    aiSignals.push('broad exception catch (AI pattern)');
  if (lp.exceptBare && lp.exceptBare.test(t))
    humanSignals.push('bare/empty catch (human shortcut)');

  // Typing / type-only imports
  if (lp.typingImport && lp.typingImport.test(t))
    aiSignals.push('type-system import');

  // Comments
  const commentRe = lp.commentLine || /^\s*(#|\/\/)/;
  if (commentRe.test(t)) {
    const body = t.replace(/^\s*(#|\/\/|\/\*\*|\*)+\s*/, '');
    if (/^[A-Z]/.test(body) && body.split(' ').length >= 5 && !/TODO|FIXME|hack|temp|wip/i.test(body))
      aiSignals.push('formal sentence-style comment');
    if (/TODO|FIXME|hack|temp|wtf|idk|lol|!!|\?|wip|xxx/i.test(body))
      humanSignals.push('casual comment marker');
    if (/^[a-z]/.test(body) && body.length < 35)
      humanSignals.push('lowercase terse comment');
    if (/^(Step|Phase)\s+\d+\s*:/i.test(body))
      aiSignals.push('numbered step comment (AI pattern)');
  }

  // Naming analysis
  const ids = t.match(/\b[a-z][a-zA-Z0-9_]{4,}\b/g) || [];
  const verboseIds = ids.filter(i => !KEYWORDS.has(i) && (i.length > 12 || (i.includes('_') && i.length > 8)));
  if (ids.length > 0 && verboseIds.length / ids.length > 0.4)
    aiSignals.push(`verbose naming: ${verboseIds.slice(0, 2).join(', ')}`);

  const kw2 = new Set(['if','in','or','and','not','for','def','try','as','is','do','of','fn','go']);
  const shorts = (t.match(/\b[a-z]{1,3}\b/g) || []).filter(i => !kw2.has(i));
  if (shorts.length >= 2)
    humanSignals.push(`abbreviated names: ${shorts.slice(0, 2).join(', ')}`);

  // Code style markers
  if (/:\s+(return|pass|break|continue)\b/.test(t))
    humanSignals.push('one-liner shortcut');
  if (/\btest_cases\s*=|\bexpected_output\s*=|\bsample_input\s*=/.test(t))
    aiSignals.push('AI-typical demo variable');
  if (/#.*\b(TODO|FIXME|hack|temp|wip)\b/i.test(t) || /\/\/.*\b(TODO|FIXME|hack|temp|wip)\b/i.test(t))
    humanSignals.push('TODO/FIXME comment');

  // Verbose error messages on this line
  const errMsg = t.match(/(raise|throw|Error|Exception|panic)\s*\(\s*["'`]([^"'`]{30,})["'`]/);
  if (errMsg) aiSignals.push('verbose error message (AI pattern)');

  // Short error messages
  const shortErr = t.match(/(raise|throw|Error|panic)\s*\(\s*["'`]([^"'`]{1,15})["'`]/);
  if (shortErr && !errMsg) humanSignals.push('terse error message');

  const total = aiSignals.length + humanSignals.length;
  if (total === 0) return { status: 'uncertain', confidence: 50, signals: [] };
  const aiRatio   = aiSignals.length / total;
  const confidence = Math.min(92, Math.round(50 + Math.abs(aiRatio - 0.5) * 80));
  if (aiRatio > 0.58) return { status: 'ai',        confidence, signals: aiSignals };
  if (aiRatio < 0.42) return { status: 'human',      confidence, signals: humanSignals };
  return                     { status: 'uncertain',   confidence, signals: [...aiSignals, ...humanSignals] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all Tier 1 signals — now accepts language
// ─────────────────────────────────────────────────────────────────────────────

export function runTier1(code, lines, language) {
  const lp = getLangPatterns(language);
  return {
    entropy:               identifierEntropy(code),
    blank_density:         blankLineDensity(lines),
    naming_verbosity:      namingVerbosity(lines, lp),
    type_annotations:      typeAnnotationScore(code, lp),
    docstring_coverage:    docstringCoverage(lines, lp),
    structural_regularity: structuralRegularity(lines, lp),
    comment_absence:       inlineCommentAbsence(lines, lp),
    indent_consistency:    indentConsistency(lines),
    exception_handling:    exceptionHandlingStyle(code, lp),
    import_organisation:   importOrganisation(lines, lp),
    string_formatting:     stringFormattingStyle(code, lp),
    dead_code_absence:     deadCodeAbsence(lines, lp),
    variable_reuse:        variableReusePattern(lines),
    magic_numbers:         magicNumberUsage(lines, lp),
    complexity_uniformity: cyclomaticComplexityUniformity(lines, lp),
    halstead_uniformity:   halsteadUniformity(lines, lp),
    type_token_ratio:      typeTokenRatio(code),
    guard_clauses:         guardClauseDensity(lines, lp),
    error_verbosity:       errorMessageVerbosity(code),
  };
}

// Weighted score from Tier 1 metrics (0-100, high = AI)
export function scoreTier1(m) {
  return Math.round(
    (100 - m.entropy)          * 0.04 +
    m.blank_density            * 0.04 +
    m.naming_verbosity         * 0.05 +
    m.type_annotations         * 0.08 +
    m.docstring_coverage       * 0.07 +
    m.structural_regularity    * 0.09 +
    m.comment_absence          * 0.05 +
    m.indent_consistency       * 0.03 +
    m.exception_handling       * 0.05 +
    m.import_organisation      * 0.04 +
    m.string_formatting        * 0.05 +
    m.dead_code_absence        * 0.04 +
    m.variable_reuse           * 0.06 +
    m.magic_numbers            * 0.04 +
    m.complexity_uniformity    * 0.07 +
    m.halstead_uniformity      * 0.06 +
    (100 - m.type_token_ratio) * 0.06 +
    m.guard_clauses            * 0.05 +
    m.error_verbosity          * 0.03
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
