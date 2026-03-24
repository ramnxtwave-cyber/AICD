/**
 * components/ScanProgress.jsx
 * Shows a circular progress ring + stage checklist during analysis.
 */
import { SCAN_STAGES } from "../data/constants.js";

export function ScanProgress({ stageIdx }) {
  const pct = Math.round(((stageIdx + 1) / SCAN_STAGES.length) * 100);
  const circumference = 2 * Math.PI * 22;

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Ring */}
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg viewBox="0 0 56 56" style={{ width: 64, height: 64 }}>
          <circle cx="28" cy="28" r="22" fill="none"
            stroke="var(--color-background-tertiary)" strokeWidth="4" />
          <circle cx="28" cy="28" r="22" fill="none"
            stroke="var(--color-text-info)" strokeWidth="4"
            strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            strokeDashoffset={circumference * 0.25}
            style={{ transition: "stroke-dasharray 0.4s ease", filter: "drop-shadow(0 0 4px rgba(88,166,255,0.4))" }}
          />
        </svg>
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-info)",
          fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)",
        }}>
          {pct}%
        </span>
      </div>

      <p style={{
        color: "var(--color-text-info)",
        fontSize: 12, fontWeight: 500,
        fontFamily: "var(--font-mono)",
        textAlign: "center", margin: 0,
      }}>
        {SCAN_STAGES[stageIdx] || "Done"}
      </p>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
        {SCAN_STAGES.map((stage, i) => {
          const done    = i < stageIdx;
          const current = i === stageIdx;
          return (
            <div key={stage} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "3px 8px",
              borderRadius: "var(--border-radius-sm)",
              background: current ? "var(--color-background-info)" : "transparent",
              transition: "background 0.2s",
            }}>
              <span style={{
                fontSize: 11, width: 14, flexShrink: 0, textAlign: "center",
                color: done    ? "var(--color-text-success)"
                     : current ? "var(--color-text-info)"
                     : "var(--color-text-tertiary)",
              }}>
                {done ? "✓" : current ? "▸" : "○"}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: done    ? "var(--color-text-secondary)"
                     : current ? "var(--color-text-info)"
                     : "var(--color-text-tertiary)",
                fontWeight: current ? 500 : 400,
              }}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
