/**
 * components/ScorePanel.jsx
 * Displays the overall AI score as a gauge arc + three stat pills.
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
  const label = score >= 70 ? "AI Generated" : score >= 40 ? "Mixed" : "Human Written";

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
      <text x="84" y="86" textAnchor="middle" fill={color}
        fontSize="24" fontWeight="600" fontFamily="var(--font-mono)">
        {score}%
      </text>
      <text x="84" y="104" textAnchor="middle"
        fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">
        {label}
      </text>
    </svg>
  );
}

export function ScorePanel({ result }) {
  const { overall_score, ai_lines_pct, human_lines_pct, confidence, verdict } = result;
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{
          color: "var(--color-text-tertiary)",
          fontFamily: "var(--font-mono)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600,
        }}>
          Overall Score
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
          padding: "3px 10px", borderRadius: 20,
          background: verdictBg, color: verdictColor,
        }}>
          {verdict}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 8px" }}>
        <GaugeArc score={overall_score} />
      </div>

      <div style={{
        display: "flex", justifyContent: "space-around",
        padding: "12px 0 4px",
        borderTop: "1px solid var(--color-border-tertiary)",
      }}>
        {[
          ["AI Lines",   ai_lines_pct + "%",   "#f85149"],
          ["Human",      human_lines_pct + "%", "#3fb950"],
          ["Confidence", confidence + "%",      "var(--color-text-info)"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ color, fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 600 }}>{value}</div>
            <div style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
