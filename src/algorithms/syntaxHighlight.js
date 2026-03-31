/**
 * algorithms/syntaxHighlight.js
 *
 * Tokenises a single line of code into coloured segments.
 * Supports Python, JavaScript, Java, C++, C, and C#.
 * Returns an array of { text, type } objects — no JSX, no DOM.
 */

const KEYWORDS = new Set([
  // Python
  "def","return","if","elif","else","for","while","in","import","from",
  "class","try","except","finally","with","as","pass","break","continue",
  "and","or","not","None","True","False","lambda","yield","global",
  "nonlocal","raise","del","assert","is","async","await",
  // JS / TS
  "const","let","var","function","new","this","typeof","instanceof",
  "null","undefined","true","false","export","default","of","switch","case",
  "throw","catch","interface","type","enum","extends","implements",
  // Java / C# / C / C++
  "public","private","protected","static","void","int","boolean","string",
  "String","bool","float","double","long","char","struct","do",
  "namespace","using","internal","sealed","readonly","foreach","import",
]);

const KW_RE   = /\b[A-Za-z_]\w*\b/g;
const STR_RE  = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
const NUM_RE  = /\b\d+\.?\d*\b/g;
const CMT_PY  = /#[^\n]*/;
const CMT_C   = /\/\/[^\n]*/;

export const TOKEN_COLORS = {
  keyword : "var(--syn-keyword)",
  string  : "var(--syn-string)",
  number  : "var(--syn-number)",
  comment : "var(--syn-comment)",
  plain   : "var(--syn-plain)",
};

/**
 * @param {string} text  - a single line of source code
 * @returns {{ text: string, type: keyof TOKEN_COLORS }[]}
 */
export function tokeniseLine(text) {
  if (!text) return [{ text: "\u00A0", type: "plain" }];

  // Pull out trailing comment first
  const cmtMatch = text.match(CMT_PY) || text.match(CMT_C);
  let base = text;
  let commentSuffix = null;
  if (cmtMatch) {
    const ci = text.lastIndexOf(cmtMatch[0]);
    // Make sure it's not inside a string
    const beforeComment = text.slice(0, ci);
    const quoteCount = (beforeComment.match(/"/g) || []).length + (beforeComment.match(/'/g) || []).length;
    if (quoteCount % 2 === 0) {
      base = text.slice(0, ci);
      commentSuffix = cmtMatch[0];
    }
  }

  const matches = [];
  let m;

  // Strings
  STR_RE.lastIndex = 0;
  while ((m = STR_RE.exec(base)) !== null) {
    matches.push({ s: m.index, e: m.index + m[0].length, text: m[0], type: "string" });
  }

  // Numbers
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(base)) !== null) {
    matches.push({ s: m.index, e: m.index + m[0].length, text: m[0], type: "number" });
  }

  // Keywords (only outside already-matched regions)
  KW_RE.lastIndex = 0;
  while ((m = KW_RE.exec(base)) !== null) {
    if (KEYWORDS.has(m[0])) {
      matches.push({ s: m.index, e: m.index + m[0].length, text: m[0], type: "keyword" });
    }
  }

  // Deduplicate: remove overlapping matches (strings win)
  matches.sort((a, b) => a.s - b.s);
  const used = [];
  for (const match of matches) {
    if (!used.some(u => match.s < u.e && match.e > u.s)) {
      used.push(match);
    }
  }
  used.sort((a, b) => a.s - b.s);

  const parts = [];
  let cursor = 0;
  for (const u of used) {
    if (u.s > cursor) parts.push({ text: base.slice(cursor, u.s), type: "plain" });
    parts.push({ text: u.text, type: u.type });
    cursor = u.e;
  }
  if (cursor < base.length) parts.push({ text: base.slice(cursor), type: "plain" });

  if (commentSuffix) parts.push({ text: commentSuffix, type: "comment" });
  return parts.length ? parts : [{ text: text, type: "plain" }];
}
