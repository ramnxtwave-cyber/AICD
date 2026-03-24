/**
 * components/DetectionSummary.jsx
 * Expandable group cards showing per-section detection with specific reasons.
 */
import { useState } from "react";
import { buildGroupReason } from "../algorithms/reasonGenerator.js";

const DOMINANT_STYLE = {
  ai:        { dot: "#f85149", badgeBg: "rgba(248,81,73,0.10)",  badgeColor: "#f85149", label: "AI Generated"  },
  human:     { dot: "#3fb950", badgeBg: "rgba(63,185,80,0.10)",  badgeColor: "#3fb950", label: "Human Written" },
  uncertain: { dot: "#d29922", badgeBg: "rgba(210,153,34,0.10)", badgeColor: "#d29922", label: "Mixed"         },
};

function GroupCard({ group, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const style = DOMINANT_STYLE[group.dominant] || DOMINANT_STYLE.uncertain;
  const reason = buildGroupReason(group);

  return (
    <div style={{
      border: "1px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      background: "var(--color-background-secondary)",
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          cursor: "pointer",
          background: open ? "var(--color-background-tertiary)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        <div style={{
          width: 9, height: 9,
          borderRadius: "50%",
          background: style.dot,
          flexShrink: 0,
          boxShadow: `0 0 6px ${style.dot}44`,
        }} />

        <span style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Lines {group.start}–{group.end}
        </span>

        <span style={{ color: style.dot, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {group.ai_pct}% {style.label}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: style.badgeBg,
            color: style.badgeColor,
            fontSize: 9, fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 20,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
          }}>
            {style.label.toUpperCase()}
          </span>
          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
            ▼
          </span>
        </div>
      </div>

      {open && (
        <div style={{
          padding: "0 16px 16px",
          borderTop: "1px solid var(--color-border-tertiary)",
        }}>
          <div style={{
            color: "var(--color-text-tertiary)",
            fontSize: 10, fontFamily: "var(--font-mono)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            fontWeight: 600,
            marginTop: 14, marginBottom: 8,
          }}>
            Detection Reason
          </div>
          <p style={{
            color: "var(--color-text-secondary)",
            fontSize: 13, lineHeight: 1.7,
            margin: 0,
          }}>
            {reason}
          </p>
        </div>
      )}
    </div>
  );
}

export function DetectionSummary({ groups }) {
  if (!groups || groups.length === 0) return null;
  return (
    <div>
      <h2 className="results-heading">Detection Summary</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map((g, i) => (
          <GroupCard key={`${g.start}-${g.end}`} group={g} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
