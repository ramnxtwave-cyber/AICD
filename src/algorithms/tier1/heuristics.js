/**
 * algorithms/tier1/heuristics.js
 *
 * TIER 1 — Heuristic / Static Analysis
 * Pure JavaScript, no model, no network. Runs instantly.
 *
 * Signals:
 *   Existing (8):  identifierEntropy, blankLineDensity, namingVerbosity,
 *                  typeAnnotationScore, docstringCoverage, structuralRegularity,
 *                  inlineCommentAbsence, indentConsistency
 *
 *   New (9):       exceptionHandlingStyle, importOrganisation, stringFormattingStyle,
 *                  deadCodeAbsence, variableReusePattern, magicNumberUsage,
 *                  cyclomaticComplexityUniformity, halsteadUniformity, typeTokenRatio
 */

const KEYWORDS = new Set([
  'if','else','elif','for','while','return','def','class','import','from',
  'with','as','in','not','and','or','try','except','finally','True','False',
  'None','self','is','raise','break','continue','pass','new','this','var',
  'let','const','function','async','await','null','undefined','true','false',
  'public','private','static','void','int','boolean','string','type','interface',
  'enum','extends','implements','switch','case','default','throw','catch',
  'open','print','len','sorted','super','object',
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING SIGNALS (refined)
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

// 2. Blank Line Density — high = AI (pads every statement)
export function blankLineDensity(lines) {
  if (lines.length < 3) return 20;
  const blanks = lines.filter(l => !l.trim()).length;
  return Math.min(100, Math.round((blanks / lines.length) * 250));
}

// 3. Naming Verbosity — high = AI (long descriptive identifiers)
export function namingVerbosity(lines) {
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !t.startsWith('"""') && !t.startsWith("'''") &&
           !t.startsWith('#') && !t.startsWith('//') && !t.startsWith('*');
  });
  const allIds = (codeLines.join('\n').match(/\b[a-z][a-zA-Z0-9_]{3,}\b/g) || [])
    .filter(t => !KEYWORDS.has(t.toLowerCase()));
  if (!allIds.length) return 20;
  const verbose = allIds.filter(id => id.length > 9 || (id.includes('_') && id.length > 6));
  return Math.min(100, Math.round((verbose.length / allIds.length) * 160));
}

// 4. Type Annotation Score — high = AI (annotates every param/return)
export function typeAnnotationScore(text) {
  const paramTypes  = (text.match(/:\s*(str|int|float|bool|List|Dict|Optional|Union|Any|tuple|set|None)\b/g) || []).length;
  const returnTypes = (text.match(/->\s*(str|int|float|bool|List|Dict|Optional|Union|Any|None|tuple|set)/g) || []).length;
  return Math.min(100, Math.round((paramTypes + returnTypes * 2) * 4));
}

// 5. Docstring Coverage — high = AI (every method documented)
export function docstringCoverage(lines) {
  let entities = 0, documented = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!/^(def |class )/.test(t) && !/^\s*(def |class )/.test(lines[i])) continue;
    entities++;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j].trim();
      if (next) { if (next.startsWith('"""') || next.startsWith("'''")) documented++; break; }
    }
  }
  return entities > 0 ? Math.round((documented / entities) * 100) : 0;
}

// 6. Structural Regularity — high = AI (def+types+docstring on every method)
export function structuralRegularity(lines) {
  const methods = lines.map((l, i) => ({ l, i }))
    .filter(({ l }) => /^\s*def \w+\(|^def \w+\(/.test(l));
  if (!methods.length) return 0;
  let canonical = 0;
  for (const { l, i } of methods) {
    const hasReturn = /->/.test(l);
    let hasDoc = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j].trim();
      if (next) { hasDoc = next.startsWith('"""') || next.startsWith("'''"); break; }
    }
    if (hasReturn && hasDoc) canonical++;
  }
  return Math.round((canonical / methods.length) * 100);
}

// 7. Inline Comment Absence — high = AI (no casual # notes)
export function inlineCommentAbsence(lines) {
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !t.startsWith('"""') && !t.startsWith("'''");
  });
  if (codeLines.length < 5) return 50;
  const casual = codeLines.filter(l => /TODO|FIXME|HACK|wtf|idk|lol|quick|temp/i.test(l)).length;
  const inline = codeLines.filter(l => /^\s*(#|\/\/)/.test(l.trim()) && !/TODO|FIXME/i.test(l)).length;
  const ratio  = inline / codeLines.length;
  const base   = ratio < 0.02 ? 85 : ratio < 0.05 ? 60 : 30;
  return Math.max(0, base - casual * 20);
}

// 8. Indent Consistency — high = AI (perfect indentation)
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

// ─────────────────────────────────────────────────────────────────────────────
// NEW SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

// 9. Exception Handling Style — high = AI
// AI always writes: except Exception as e: / except (TypeError, ValueError) as e:
// Humans write: bare except: / except ValueError: (no alias)
export function exceptionHandlingStyle(text) {
  const broadCatch    = (text.match(/except\s+Exception\s+as\s+\w+/g) || []).length;  // AI
  const typedAlias    = (text.match(/except\s+\w+Error\s+as\s+\w+/g) || []).length;   // AI
  const bareCatch     = (text.match(/except\s*:/g) || []).length;                      // human
  const specificNaked = (text.match(/except\s+\w+Error\s*:/g) || []).length;           // human
  const total = broadCatch + typedAlias + bareCatch + specificNaked;
  if (total === 0) return 30; // no exception handling — neutral
  const aiStyle = broadCatch + typedAlias;
  return Math.min(100, Math.round((aiStyle / total) * 100));
}

// 10. Import Organisation — high = AI
// AI groups: stdlib → third-party → local with blank lines between groups.
// Humans pile all imports together or mix them.
export function importOrganisation(lines) {
  const importLines = lines.filter(l => /^(import |from \w)/.test(l.trim()));
  if (importLines.length < 3) return 30;

  // Check for PEP8 grouping: stdlib imports first, then third-party, then local
  const stdlibMods = new Set(['os','sys','re','json','time','math','io','abc','ast',
    'copy','csv','datetime','hashlib','itertools','logging','pathlib','random',
    'shutil','string','subprocess','threading','typing','collections','functools',
    'contextlib','dataclasses','enum','struct','unittest','urllib','uuid']);

  const groups = [];
  let currentGroup = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^(import |from \w)/.test(t)) {
      currentGroup.push(t);
    } else if (!t && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // AI score: multiple groups separated by blank lines = organised
  const isOrganised = groups.length >= 2;
  // Check for typing import — AI always imports from typing
  const hasTyping = importLines.some(l => /from typing import|import typing/.test(l));
  // Check for sorted imports within group
  const firstGroup = groups[0] || [];
  const isSorted = firstGroup.length > 1 &&
    firstGroup.every((l, i) => i === 0 || l >= firstGroup[i - 1]);

  let score = 20;
  if (isOrganised) score += 35;
  if (hasTyping)   score += 30;
  if (isSorted)    score += 15;
  return Math.min(100, score);
}

// 11. String Formatting Style — high = AI
// AI exclusively uses f-strings. Humans mix %, .format(), and f-strings.
export function stringFormattingStyle(text) {
  const fStrings  = (text.match(/f["'][^"']*\{/g) || []).length;
  const dotFormat = (text.match(/\.format\s*\(/g) || []).length;
  const pctFormat = (text.match(/["'][^"']*%[sd]/g) || []).length;
  const total = fStrings + dotFormat + pctFormat;
  if (total === 0) return 30;
  // Pure f-string usage = AI. Mixed = human.
  const purity = fStrings / total;
  if (purity === 1 && fStrings >= 2) return 85;
  if (purity >= 0.8) return 65;
  if (purity >= 0.5) return 45;
  return 20; // mixing styles = human
}

// 12. Dead Code Absence — high = AI
// Humans leave commented-out code blocks, old debug prints, unused variables.
// AI never produces dead code.
export function deadCodeAbsence(lines) {
  const commentedCode = lines.filter(l => {
    const t = l.trim();
    // Commented-out code: starts with # and looks like actual code
    return (t.startsWith('#') || t.startsWith('//')) &&
      /\b(def |class |return |import |for |if |while |print\(|console\.)\b/.test(t.slice(1));
  }).length;
  const debugPrints = lines.filter(l =>
    /\bprint\s*\(\s*["']debug|console\.log\s*\(\s*["']debug/i.test(l) ||
    /\bprint\s*\(\s*\w+\s*\)\s*$/.test(l.trim()) // bare print(var) = debug leftover
  ).length;
  // No dead code at all = AI signal
  const deadIndicators = commentedCode + debugPrints;
  if (deadIndicators === 0) return 75;
  if (deadIndicators === 1) return 50;
  return Math.max(10, 75 - deadIndicators * 20);
}

// 13. Variable Reuse Pattern — high = AI
// AI creates a fresh named variable for every intermediate value.
// Humans reuse and reassign the same variables.
export function variableReusePattern(lines) {
  const assignments = {};
  for (const line of lines) {
    const t = line.trim();
    if (/^(def |class |#|import |from )/.test(t)) continue;
    const match = t.match(/^([a-z_][a-z0-9_]*)\s*=/);
    if (match) {
      const varName = match[1];
      if (!['self','true','false','none','null'].includes(varName)) {
        assignments[varName] = (assignments[varName] || 0) + 1;
      }
    }
  }
  const vars = Object.values(assignments);
  if (vars.length < 3) return 40;
  const reusedCount = vars.filter(c => c > 1).length;
  const reuseRatio  = reusedCount / vars.length;
  // Low reuse (every var unique) = AI. High reuse = human.
  if (reuseRatio < 0.1) return 80;
  if (reuseRatio < 0.2) return 60;
  if (reuseRatio < 0.35) return 40;
  return 20;
}

// 14. Magic Number Usage — high = AI
// AI names every constant (MAX_RETRIES = 3). Humans inline magic numbers.
export function magicNumberUsage(lines) {
  const codeLines = lines.filter(l => {
    const t = l.trim();
    return t && !t.startsWith('#') && !t.startsWith('//') &&
           !t.startsWith('"""') && !t.startsWith("'''");
  });
  let magicCount   = 0;
  let namedConst   = 0;
  for (const line of codeLines) {
    // Named constants: ALL_CAPS = value
    if (/^[A-Z_]{2,}\s*=/.test(line.trim())) namedConst++;
    // Magic numbers: bare integers > 1 in expressions (not in list indexes [0], [1])
    const nums = line.match(/[^[\]"']\b([2-9]\d+|\d{3,})\b[^"'\]]/g) || [];
    magicCount += nums.length;
  }
  // Lots of named constants + no magic numbers = AI
  const hasNamedConsts = namedConst >= 2;
  if (magicCount === 0 && hasNamedConsts) return 85;
  if (magicCount === 0) return 60;
  if (magicCount <= 2)  return 40;
  return Math.max(10, 40 - magicCount * 5); // many magic numbers = human
}

// 15. Cyclomatic Complexity Uniformity — high = AI
// AI writes functions with eerily similar, low complexity.
// Humans have a wide spread: some trivial functions, some complex ones.
export function cyclomaticComplexityUniformity(lines) {
  const functions = [];
  let currentFnComplexity = 0;
  let inFunction = false;
  let fnIndent   = 0;

  for (const line of lines) {
    const t = line.trim();
    const indent = line.match(/^(\s*)/)[1].length;

    if (/^def \w+/.test(t) || /^\s+def \w+/.test(line)) {
      if (inFunction) functions.push(currentFnComplexity);
      currentFnComplexity = 1;
      inFunction = true;
      fnIndent   = indent;
      continue;
    }
    if (inFunction) {
      if (t && indent <= fnIndent && !/^(def |class )/.test(t) === false) {
        functions.push(currentFnComplexity);
        inFunction = false;
      }
      // Count decision points
      if (/\b(if|elif|for|while|and|or|except)\b/.test(t)) currentFnComplexity++;
    }
  }
  if (inFunction) functions.push(currentFnComplexity);
  if (functions.length < 2) return 40;

  const mean = functions.reduce((a, b) => a + b, 0) / functions.length;
  const variance = functions.reduce((a, b) => a + (b - mean) ** 2, 0) / functions.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Low CV (all functions same complexity) = AI. High CV = human.
  if (cv < 0.25) return 85;
  if (cv < 0.40) return 65;
  if (cv < 0.60) return 45;
  return 20;
}

// 16. Halstead Uniformity — high = AI
// Halstead metrics (operators/operands) are suspiciously uniform across AI functions.
// We approximate: count distinct operators and operands per function.
export function halsteadUniformity(lines) {
  const OPERATORS = /[+\-*/%=<>!&|^~]+|and\b|or\b|not\b|in\b|is\b/g;
  const OPERANDS  = /\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g;

  const fnBlocks = [];
  let block = [];
  let inFn = false;

  for (const line of lines) {
    const t = line.trim();
    if (/^def \w+|^\s+def \w+/.test(line)) {
      if (block.length > 2) fnBlocks.push(block);
      block  = [];
      inFn   = true;
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

  // Low variance in Halstead volume = AI
  if (cv < 0.25) return 80;
  if (cv < 0.45) return 60;
  if (cv < 0.65) return 40;
  return 20;
}

// 17. Type-Token Ratio (TTR) — low = AI
// TTR = unique_words / total_words.
// AI reuses a narrow formal vocabulary → lower TTR.
export function typeTokenRatio(text) {
  const tokens = (text.toLowerCase().match(/\b[a-z_]\w*\b/g) || [])
    .filter(t => !KEYWORDS.has(t));
  if (tokens.length < 10) return 50;
  const uniqueCount = new Set(tokens).size;
  const ttr = uniqueCount / tokens.length;
  // Normalise: typical human TTR ~0.55-0.75, AI ~0.35-0.50
  // Return 0-100 where LOW = AI-like
  return Math.min(100, Math.round(ttr * 130));
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-line classifier (used by orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export function classifyLine(line, allLines, idx) {
  const t = line.trim();
  if (!t) return { status: 'uncertain', confidence: 50, signals: [] };

  const aiSignals    = [];
  const humanSignals = [];

  if (t.startsWith('"""') || t.startsWith("'''"))
    aiSignals.push('docstring delimiter');
  if (/^(Args|Returns|Raises|Parameters|Notes|Yields)\s*:/i.test(t))
    aiSignals.push('structured docstring section (Args/Returns)');
  if (/:\s*(str|int|float|bool|List|Dict|Optional|Union)\b/.test(t) && /def /.test(t))
    aiSignals.push('fully type-annotated function signature');
  if (/def \w+.*->/.test(t))
    aiSignals.push('return type annotation');
  if (/except\s+Exception\s+as\s+\w+/.test(t))
    aiSignals.push('broad exception catch with alias (AI pattern)');
  if (/from typing import/.test(t))
    aiSignals.push('typing module import');

  if (/^\s*(#|\/\/)/.test(t)) {
    const body = t.replace(/^\s*(#|\/\/)+\s*/, '');
    if (/^[A-Z]/.test(body) && body.split(' ').length >= 5 && !/TODO|FIXME|hack|temp/i.test(body))
      aiSignals.push('formal sentence-style comment');
    if (/TODO|FIXME|hack|temp|wtf|idk|lol|!!|\?/i.test(body))
      humanSignals.push('casual comment marker');
    if (/^[a-z]/.test(body) && body.length < 35)
      humanSignals.push('lowercase terse comment');
  }

  const ids = t.match(/\b[a-z][a-zA-Z0-9_]{4,}\b/g) || [];
  const verboseIds = ids.filter(i => !KEYWORDS.has(i) && (i.length > 12 || (i.includes('_') && i.length > 8)));
  if (ids.length > 0 && verboseIds.length / ids.length > 0.4)
    aiSignals.push(`verbose naming: ${verboseIds.slice(0, 2).join(', ')}`);

  const kw2 = new Set(['if','in','or','and','not','for','def','try','as','is','do','of']);
  const shorts = (t.match(/\b[a-z]{1,3}\b/g) || []).filter(i => !kw2.has(i));
  if (shorts.length >= 2)
    humanSignals.push(`abbreviated names: ${shorts.slice(0, 2).join(', ')}`);

  if (/:\s+(return|pass|break|continue)\b/.test(t))
    humanSignals.push('one-liner shortcut');
  if (/\btest_cases\s*=|\bexpected_output\s*=/.test(t))
    aiSignals.push('AI-typical demo variable');
  if (/^\s*except\s*:/.test(t))
    humanSignals.push('bare except (human shortcut)');
  if (/#.*\b(TODO|FIXME|hack|temp)\b/i.test(t))
    humanSignals.push('TODO/FIXME comment');

  const total = aiSignals.length + humanSignals.length;
  if (total === 0) return { status: 'uncertain', confidence: 50, signals: [] };
  const aiRatio   = aiSignals.length / total;
  const confidence = Math.min(92, Math.round(50 + Math.abs(aiRatio - 0.5) * 80));
  if (aiRatio > 0.58) return { status: 'ai',        confidence, signals: aiSignals };
  if (aiRatio < 0.42) return { status: 'human',      confidence, signals: humanSignals };
  return                     { status: 'uncertain',   confidence, signals: [...aiSignals, ...humanSignals] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all Tier 1 signals and return a named result object
// ─────────────────────────────────────────────────────────────────────────────

export function runTier1(code, lines) {
  return {
    // original 8
    entropy:               identifierEntropy(code),
    blank_density:         blankLineDensity(lines),
    naming_verbosity:      namingVerbosity(lines),
    type_annotations:      typeAnnotationScore(code),
    docstring_coverage:    docstringCoverage(lines),
    structural_regularity: structuralRegularity(lines),
    comment_absence:       inlineCommentAbsence(lines),
    indent_consistency:    indentConsistency(lines),
    // new 9
    exception_handling:    exceptionHandlingStyle(code),
    import_organisation:   importOrganisation(lines),
    string_formatting:     stringFormattingStyle(code),
    dead_code_absence:     deadCodeAbsence(lines),
    variable_reuse:        variableReusePattern(lines),
    magic_numbers:         magicNumberUsage(lines),
    complexity_uniformity: cyclomaticComplexityUniformity(lines),
    halstead_uniformity:   halsteadUniformity(lines),
    type_token_ratio:      typeTokenRatio(code),
  };
}

// Weighted score from Tier 1 metrics only (0-100, high = AI)
export function scoreTier1(m) {
  return Math.round(
    (100 - m.entropy)          * 0.04 +
    m.blank_density            * 0.05 +
    m.naming_verbosity         * 0.06 +
    m.type_annotations         * 0.09 +  // strong
    m.docstring_coverage       * 0.08 +  // strong
    m.structural_regularity    * 0.10 +  // strongest
    m.comment_absence          * 0.05 +
    m.indent_consistency       * 0.03 +
    m.exception_handling       * 0.06 +
    m.import_organisation      * 0.05 +
    m.string_formatting        * 0.06 +
    m.dead_code_absence        * 0.05 +
    m.variable_reuse           * 0.07 +  // strong
    m.magic_numbers            * 0.04 +
    m.complexity_uniformity    * 0.08 +  // strong
    m.halstead_uniformity      * 0.07 +  // strong
    (100 - m.type_token_ratio) * 0.07    // low TTR = AI
  );
}

// Group consecutive lines with the same dominant classification
export function buildGroups(lineResults, lines) {
  if (!lineResults || lineResults.length === 0) return [];

  const groups = [];
  let currentGroup = {
    dominant: lineResults[0].status,
    start: 1, // 1-based line numbers
    end: 1,
    signals: [...lineResults[0].signals]
  };

  for (let i = 1; i < lineResults.length; i++) {
    const result = lineResults[i];
    if (result.status === currentGroup.dominant) {
      // Extend current group
      currentGroup.end = i + 1;
      currentGroup.signals.push(...result.signals);
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = {
        dominant: result.status,
        start: i + 1,
        end: i + 1,
        signals: [...result.signals]
      };
    }
  }

  // Add the last group
  groups.push(currentGroup);

  return groups;
}
