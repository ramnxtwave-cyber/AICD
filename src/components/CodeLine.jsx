/**
 * components/CodeLine.jsx
 * Renders a single annotated line: line-number | syntax-highlighted code | badge + confidence
 */
import { tokeniseLine } from "../algorithms/syntaxHighlight.js";

const STATUS_STYLE = {
  ai:        { bg: "rgba(248,81,73,0.07)",  border: "#f85149" },
  human:     { bg: "rgba(63,185,80,0.06)",  border: "#3fb950" },
  uncertain: { bg: "rgba(210,153,34,0.06)", border: "#d29922" },
};

const BADGE_STYLE = {
  ai:        { label: "AI", color: "#f85149", bg: "rgba(248,81,73,0.14)" },
  human:     { label: "HU", color: "#3fb950", bg: "rgba(63,185,80,0.13)" },
  uncertain: { label: "??", color: "#d29922", bg: "rgba(210,153,34,0.12)" },
};

const TOKEN_COLORS = {
  keyword : "#d2a8ff",
  string  : "#a5d6ff",
  number  : "#f9826c",
  comment : "#545d68",
  plain   : "#c9d1d9",
};

export function CodeLine({ lineNum, text, status, confidence }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.uncertain;
  const b = BADGE_STYLE[status]  || BADGE_STYLE.uncertain;
  const tokens = tokeniseLine(text);

  return (
    <div
      className="code-line"
      style={{
        display: "flex",
        alignItems: "flex-start",
        background: s.bg,
        borderLeft: `3px solid ${s.border}`,
      }}
    >
      <span style={{
        color: "var(--color-text-tertiary)",
        fontSize: 11,
        minWidth: 46,
        textAlign: "right",
        padding: "4px 12px 4px 0",
        userSelect: "none",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
        lineHeight: 1.75,
        opacity: 0.7,
      }}>
        {lineNum}
      </span>

      <span style={{
        flex: 1,
        fontSize: 12.5,
        padding: "4px 6px 4px 0",
        whiteSpace: "pre",
        lineHeight: 1.75,
        fontFamily: "var(--font-mono)",
        overflow: "hidden",
      }}>
        {tokens.map((tok, i) => (
          <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
        ))}
      </span>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        flexShrink: 0,
      }}>
        <span style={{
          background: b.bg,
          color: b.color,
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 5,
          letterSpacing: "0.07em",
          fontFamily: "var(--font-mono)",
        }}>
          {b.label}
        </span>
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 10, fontFamily: "var(--font-mono)" }}>
          {confidence}%
        </span>
      </div>
    </div>
  );
}
