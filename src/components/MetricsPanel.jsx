/**
 * components/MetricsPanel.jsx
 * Shows Tier 1 (11 active + bypass flag + 9 diagnostic) and Tier 2 (5 signals) metrics.
 */
import { useState } from "react";

function Bar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--color-background-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: (pct || 0) + '%', height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
    </div>
  );
}

function MetricRow({ label, value, hint, isAILike, dimmed }) {
  const color = isAILike ? '#f85149' : '#3fb950';
  return (
    <div style={{ marginBottom: 10, opacity: dimmed ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{label}</span>
        <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{value ?? '—'}</span>
      </div>
      <Bar pct={value} color={color} />
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)', margin: '3px 0 0' }}>{hint}</p>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
        marginBottom: open ? 8 : 0,
      }}>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{title}</span>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
      </button>
      {open && children}
    </div>
  );
}

function BypassBanner({ bypass }) {
  if (!bypass?.triggered) return null;
  return (
    <div style={{
      background: '#f8514915',
      border: '1px solid #f8514940',
      borderRadius: 'var(--border-radius-md)',
      padding: '10px 14px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          background: '#f85149',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          padding: '2px 6px',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>Bypass Flag</span>
        <span style={{ color: '#f85149', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {Math.round(bypass.bypass_confidence * 100)}% confidence
        </span>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: '0 0 6px' }}>
        {bypass.message}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {bypass.reasons.map(r => (
          <span key={r} style={{
            background: '#f8514920',
            color: '#f85149',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 10,
            border: '1px solid #f8514930',
          }}>{r.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  );
}

export function MetricsPanel({ tiers }) {
  const m1 = tiers?.tier1?.metrics || {};
  const m2 = tiers?.tier2?.metrics || {};
  const bypass = tiers?.tier1?.bypass;
  const divider = <div style={{ height: 1, background: 'var(--color-border-tertiary)', margin: '6px 0 10px' }} />;

  return (
    <div style={{
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 16,
      background: 'var(--color-background-secondary)',
    }}>
      <p className="card-label" style={{ margin: '0 0 14px' }}>Signal Metrics</p>

      <BypassBanner bypass={bypass} />

      <Section title="Active Scoring Signals (9)">
        <MetricRow label="Naming verbosity"          value={m1.naming_verbosity}      hint="High = long descriptive names (23%)"     isAILike={m1.naming_verbosity > 55}       />
        <MetricRow label="Dead code absence"         value={m1.dead_code_absence}     hint="High = no commented-out code (18%)"      isAILike={m1.dead_code_absence > 65}      />
        <MetricRow label="Variable reuse"            value={m1.variable_reuse}        hint="High = every var unique = AI (16%)"      isAILike={m1.variable_reuse > 55}         />
        <MetricRow label="Structural regularity"     value={m1.structural_regularity} hint="High = identical method pattern (12%)"   isAILike={m1.structural_regularity > 55}  />
        <MetricRow label="Magic number usage"        value={m1.magic_numbers}         hint="High = named constants = AI (10%)"       isAILike={m1.magic_numbers > 55}          />
        <MetricRow label="Type-token ratio"          value={m1.type_token_ratio}      hint="Low = narrow vocabulary = AI (8%)"       isAILike={m1.type_token_ratio < 55}       />
        <MetricRow label="Exception handling"        value={m1.exception_handling}    hint="High = broad except Exception (6%)"      isAILike={m1.exception_handling > 55}     />
        <MetricRow label="Identifier entropy"        value={m1.entropy}               hint="Low = repetitive vocabulary (5%)"        isAILike={m1.entropy < 50}                />
        <MetricRow label="Import organisation"       value={m1.import_organisation}   hint="High = perfectly grouped imports (2%)"   isAILike={m1.import_organisation > 55}    />
      </Section>
      {divider}

      <Section title="Diagnostic Only (not in score)" defaultOpen={false}>
        <MetricRow label="Guard clause density"      value={m1.guard_clauses}         hint="Removed — humans also write guard clauses" isAILike={m1.guard_clauses > 55}    dimmed />
        <MetricRow label="Cyclomatic uniformity"     value={m1.complexity_uniformity} hint="Removed — not stable across code sizes" isAILike={m1.complexity_uniformity > 55} dimmed />
        <MetricRow label="Type annotation coverage"  value={m1.type_annotations}      hint="→ bypass flag (not scored)"              isAILike={m1.type_annotations > 55}  dimmed />
        <MetricRow label="Docstring coverage"        value={m1.docstring_coverage}    hint="→ bypass flag (not scored)"              isAILike={m1.docstring_coverage > 60} dimmed />
        <MetricRow label="Emoji presence"            value={m1.emoji_presence}        hint="→ bypass flag (not scored)"              isAILike={m1.emoji_presence > 30}     dimmed />
        <MetricRow label="Comment absence"           value={m1.comment_absence}       hint="Removed — humans skip comments in exams" isAILike={m1.comment_absence > 60}    dimmed />
        <MetricRow label="Blank line padding"        value={m1.blank_density}         hint="Removed — meaningless at DSA scale"      isAILike={m1.blank_density > 50}      dimmed />
        <MetricRow label="Indent consistency"        value={m1.indent_consistency}    hint="Removed — editor auto-formats"           isAILike={m1.indent_consistency > 85} dimmed />
        <MetricRow label="Halstead uniformity"       value={m1.halstead_uniformity}   hint="Removed — too noisy on short functions"  isAILike={m1.halstead_uniformity > 55} dimmed />
        <MetricRow label="String formatting"         value={m1.string_formatting}     hint="Removed — DSA rarely uses strings"       isAILike={m1.string_formatting > 55}  dimmed />
        <MetricRow label="Error msg verbosity"       value={m1.error_verbosity}       hint="Diagnostic only"                        isAILike={m1.error_verbosity > 55}    dimmed />
      </Section>
      {divider}

      <Section title="Statistical — Tier 2" defaultOpen={false}>
        <MetricRow label="Bayesian features"         value={m2.bayesian_features}     hint="High = matched AI feature set (40%)"     isAILike={m2.bayesian_features > 55}      />
        <MetricRow label="Log-rank score"            value={m2.log_rank}              hint="High = AI-favoured vocabulary (35%)"     isAILike={m2.log_rank > 55}               />
        <MetricRow label="Token histogram"           value={m2.token_histogram}       hint="High = concentrated token use (20%)"     isAILike={m2.token_histogram > 55}        />
        <MetricRow label="N-gram entropy"            value={m2.ngram_entropy}         hint="Low = predictable sequences (3%)"        isAILike={m2.ngram_entropy < 55}          />
        <MetricRow label="MATTR (vocab richness)"    value={m2.mattr}                 hint="Low = narrow per-window vocab (2%)"      isAILike={m2.mattr < 55}                  />
      </Section>
    </div>
  );
}
