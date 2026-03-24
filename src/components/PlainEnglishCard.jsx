/**
 * components/PlainEnglishCard.jsx
 * Shows a plain-English explanation of the verdict.
 */
import { buildOverallExplanation } from "../algorithms/reasonGenerator.js";

export function PlainEnglishCard({ result }) {
  const { headline, body, suggestions, emoji, scoreColor } = buildOverallExplanation(result);

  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "1px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40,
          background: "var(--color-background-tertiary)",
          borderRadius: "var(--border-radius-md)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          {emoji}
        </div>
        <div>
          <p style={{
            color: "var(--color-text-primary)",
            fontSize: 14, fontWeight: 600,
            lineHeight: 1.4, margin: "0 0 4px",
          }}>
            {headline}
          </p>
          <p style={{
            color: "var(--color-text-tertiary)",
            fontSize: 11, fontFamily: "var(--font-mono)",
            margin: 0,
          }}>
            {result.confidence}% confidence · {result.overall_score}% AI score
          </p>
        </div>
      </div>

      <p style={{
        color: "var(--color-text-secondary)",
        fontSize: 13, lineHeight: 1.75,
        margin: "0 0 14px",
      }}>
        {body}
      </p>

      {suggestions.length > 0 && (
        <div style={{ borderTop: "1px solid var(--color-border-tertiary)", paddingTop: 12 }}>
          <p className="card-label" style={{ margin: "0 0 8px" }}>
            {result.overall_score < 40 ? "What we noticed" : "Suggestions"}
          </p>
          {suggestions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: scoreColor, fontSize: 12, marginTop: 1 }}>›</span>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 12, lineHeight: 1.55 }}>
                {s}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
