/**
 * components/CodeViewer.jsx
 * Renders the full annotated code block with filter buttons.
 */
import { useState } from "react";
import { CodeLine } from "./CodeLine.jsx";

const FILTERS = [
  { value: "all",       label: "All",           color: "var(--color-text-secondary)" },
  { value: "ai",        label: "AI Generated",  color: "#f85149" },
  { value: "human",     label: "Human Written", color: "#3fb950" },
  { value: "uncertain", label: "Mixed",         color: "#d29922" },
];

export function CodeViewer({ result }) {
  const [filter, setFilter] = useState("all");
  const { codeLines, lines: lineResults, ai_lines_pct, human_lines_pct, verdict } = result;

  const withMeta = codeLines.map((text, idx) => {
    const meta = lineResults.find(l => l.n === idx + 1) || { status: "uncertain", confidence: 50 };
    return { n: idx + 1, text, ...meta };
  });

  const counts = {
    all:       codeLines.length,
    ai:        withMeta.filter(l => l.status === "ai").length,
    human:     withMeta.filter(l => l.status === "human").length,
    uncertain: withMeta.filter(l => l.status === "uncertain").length,
  };

  const filtered = filter === "all" ? withMeta : withMeta.filter(l => l.status === filter);

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12,
        flexWrap: "wrap", gap: 8,
      }}>
        <h2 className="results-heading" style={{ margin: 0 }}>Analyzed Code</h2>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="filter-btn"
              style={{
                background:   filter === f.value ? "var(--color-background-tertiary)" : "transparent",
                color:        filter === f.value ? f.color : "var(--color-text-tertiary)",
                borderColor:  filter === f.value ? "var(--color-border-secondary)" : "var(--color-border-tertiary)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.color, display: "inline-block" }} />
              {f.label} ({counts[f.value]})
            </button>
          ))}
        </div>
      </div>

      <div style={{
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
        background: "var(--color-background-secondary)",
      }}>
        {/* Titlebar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--color-border-tertiary)",
          background: "var(--color-background-tertiary)",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ef4444", "#f59e0b", "#22c55e"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
            ))}
          </div>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            {codeLines.length} lines analyzed
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            {[["AI", "#f85149"], ["Mixed", "#d29922"], ["Human", "#3fb950"]].map(([l, c]) => (
              <span key={l} style={{ fontSize: 10, fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
                <span style={{ color: "var(--color-text-tertiary)" }}>{l}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {filtered.map(l => (
            <CodeLine
              key={l.n}
              lineNum={l.n}
              text={l.text}
              status={l.status}
              confidence={l.confidence}
            />
          ))}
        </div>

        {/* Summary bar */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--color-border-tertiary)",
          background: "var(--color-background-tertiary)",
        }}>
          <div style={{ display: "flex", gap: 2, height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ flex: ai_lines_pct,    background: "#f85149", opacity: 0.7, borderRadius: "3px 0 0 3px" }} />
            <div style={{ flex: Math.max(0, 100 - ai_lines_pct - human_lines_pct), background: "#d29922", opacity: 0.5 }} />
            <div style={{ flex: human_lines_pct, background: "#3fb950", opacity: 0.7, borderRadius: "0 3px 3px 0" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "#f85149" }}>AI: {ai_lines_pct}%</span>
            <span style={{ color: "var(--color-text-info)", fontWeight: 500 }}>Verdict: {verdict}</span>
            <span style={{ color: "#3fb950" }}>Human: {human_lines_pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
