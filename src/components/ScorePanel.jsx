/**
 * components/ScorePanel.jsx
 * Displays the overall AI probability gauge, verdict, confidence,
 * and a per-line breakdown bar.
 */

function GaugeArc({ score }) {
  const r = 66, cx = 84, cy = 84;
  const startAngle = 200, totalArc = 140;
  const toRad = d => (d * Math.PI) / 180;
  const arcPath = (s, e) => {
    const sv = { x: cx + r * Math.cos(toRad(s)), y: cy + r * Math.sin(toRad(s)) };
    const ev = { x: cx + r * Math.cos(toRad(e)), y: cy + r * Math.sin(toRad(e)) };
    return `M ${sv.x} ${sv.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ev.x} ${ev.y}`;
  };
  const fillArc = (score / 100) * totalArc;
  const color = score >= 70 ? "#f85149" : score >= 40 ? "#d29922" : "#3fb950";

  return (
    <svg viewBox="0 0 168 126" style={{ width: "100%", maxWidth: 180 }}>
      <path
        d={arcPath(startAngle, startAngle + totalArc)}
        fill="none" stroke="var(--color-background-tertiary)"
        strokeWidth="10" strokeLinecap="round"
      />
      <path
        d={arcPath(startAngle, startAngle + fillArc)}
        fill="none" stroke={color}
        strokeWidth="10" strokeLinecap="round"
        style={{ transition: "all 1.1s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}44)` }}
      />
      <text x="84" y="82" textAnchor="middle" fill={color}
        fontSize="26" fontWeight="700" fontFamily="var(--font-mono)">
        {score}%
      </text>
      <text x="84" y="98" textAnchor="middle"
        fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">
        AI Probability
      </text>
    </svg>
  );
}

export function ScorePanel({ result }) {
  const { overall_score, ai_lines_pct, human_lines_pct, confidence, verdict } = result;
  const uncertainPct = Math.max(0, 100 - ai_lines_pct - human_lines_pct);

  const verdictColor = overall_score >= 70 ? "var(--color-text-danger)"
    : overall_score >= 40 ? "var(--color-text-warning)"
    : "var(--color-text-success)";
  const verdictBg = overall_score >= 70 ? "var(--color-background-danger)"
    : overall_score >= 40 ? "var(--color-background-warning)"
    : "var(--color-background-success)";
  const glowShadow = overall_score >= 70 ? "var(--shadow-glow-red)"
    : overall_score >= 40 ? "none"
    : "var(--shadow-glow-green)";

  return (
    <div style={{
      border: "1px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: 20,
      background: "var(--color-background-secondary)",
      boxShadow: glowShadow,
    }}>
      {/* Verdict + Confidence header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
          padding: "4px 12px", borderRadius: 20,
          background: verdictBg, color: verdictColor,
        }}>
          {verdict}
        </span>
        <span style={{
          color: "var(--color-text-tertiary)",
          fontFamily: "var(--font-mono)", fontSize: 11,
        }}>
          {confidence}% confident
        </span>
      </div>

      {/* Gauge */}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 4px" }}>
        <GaugeArc score={overall_score} />
      </div>

      {/* Explainer */}
      <p style={{
        textAlign: "center",
        color: "var(--color-text-tertiary)",
        fontSize: 11, lineHeight: 1.5,
        margin: "0 0 14px",
      }}>
        {overall_score >= 70
          ? "High probability this code was AI-generated."
          : overall_score >= 40
          ? "This code has a mix of AI and human characteristics."
          : "Low AI probability — this code looks human-written."
        }
      </p>

      {/* Line-by-line breakdown */}
      <div style={{
        borderTop: "1px solid var(--color-border-tertiary)",
        paddingTop: 14,
      }}>
        <p style={{
          color: "var(--color-text-tertiary)",
          fontFamily: "var(--font-mono)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.08em",
          fontWeight: 600, margin: "0 0 10px",
        }}>
          Line-by-line breakdown
        </p>

        {/* Stacked bar */}
        <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ flex: ai_lines_pct || 0.01,    background: "#f85149", borderRadius: "4px 0 0 4px" }} />
          <div style={{ flex: uncertainPct || 0.01,     background: "#d29922", opacity: 0.5 }} />
          <div style={{ flex: human_lines_pct || 0.01,  background: "#3fb950", borderRadius: "0 4px 4px 0" }} />
        </div>

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[
            ["AI",        ai_lines_pct,  "#f85149"],
            ["Uncertain", uncertainPct,   "#d29922"],
            ["Human",     human_lines_pct, "#3fb950"],
          ].map(([label, pct, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: label === "Uncertain" ? 0.5 : 1, flexShrink: 0 }} />
              <div>
                <span style={{ color, fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600 }}>{pct}%</span>
                <span style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10, marginLeft: 4 }}>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
