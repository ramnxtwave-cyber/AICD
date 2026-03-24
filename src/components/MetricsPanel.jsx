/**
 * components/MetricsPanel.jsx
 * Shows all Tier 1 (17 signals) and Tier 2 (5 signals) metrics grouped by category.
 */
import { useState } from "react";

function Bar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--color-background-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: (pct || 0) + '%', height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
    </div>
  );
}

function MetricRow({ label, value, hint, isAILike }) {
  const color = isAILike ? '#f85149' : '#3fb950';
  return (
    <div style={{ marginBottom: 10 }}>
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

export function MetricsPanel({ tiers }) {
  const m1 = tiers?.tier1?.metrics || {};
  const m2 = tiers?.tier2?.metrics || {};
  const divider = <div style={{ height: 1, background: 'var(--color-border-tertiary)', margin: '6px 0 10px' }} />;

  return (
    <div style={{
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 16,
      background: 'var(--color-background-secondary)',
    }}>
      <p className="card-label" style={{ margin: '0 0 14px' }}>Signal Metrics</p>

      <Section title="Documentation & Structure">
        <MetricRow label="Type annotation coverage" value={m1.type_annotations}      hint="High = AI-like"                    isAILike={m1.type_annotations > 55}       />
        <MetricRow label="Docstring coverage"        value={m1.docstring_coverage}    hint="High = AI-like"                    isAILike={m1.docstring_coverage > 60}     />
        <MetricRow label="Structural regularity"     value={m1.structural_regularity} hint="High = identical method pattern"   isAILike={m1.structural_regularity > 55}  />
        <MetricRow label="Import organisation"       value={m1.import_organisation}   hint="High = perfectly grouped imports"  isAILike={m1.import_organisation > 55}    />
      </Section>
      {divider}

      <Section title="Style & Naming">
        <MetricRow label="Naming verbosity"          value={m1.naming_verbosity}      hint="High = long descriptive names"     isAILike={m1.naming_verbosity > 55}       />
        <MetricRow label="Blank line padding"        value={m1.blank_density}         hint="High = over-padded code"           isAILike={m1.blank_density > 50}          />
        <MetricRow label="Comment absence"           value={m1.comment_absence}       hint="High = no casual inline notes"     isAILike={m1.comment_absence > 60}        />
        <MetricRow label="String formatting"         value={m1.string_formatting}     hint="High = pure f-string usage"        isAILike={m1.string_formatting > 55}      />
        <MetricRow label="Indent consistency"        value={m1.indent_consistency}    hint="High = perfectly consistent"       isAILike={m1.indent_consistency > 85}     />
        <MetricRow label="Exception handling"        value={m1.exception_handling}    hint="High = broad except Exception"     isAILike={m1.exception_handling > 55}     />
      </Section>
      {divider}

      <Section title="Complexity & Patterns" defaultOpen={false}>
        <MetricRow label="Cyclomatic uniformity"     value={m1.complexity_uniformity} hint="High = all fns same complexity"    isAILike={m1.complexity_uniformity > 55}  />
        <MetricRow label="Halstead uniformity"       value={m1.halstead_uniformity}   hint="High = uniform Halstead volume"    isAILike={m1.halstead_uniformity > 55}    />
        <MetricRow label="Variable reuse"            value={m1.variable_reuse}        hint="Low = every var unique = AI"       isAILike={m1.variable_reuse < 30}         />
        <MetricRow label="Dead code absence"         value={m1.dead_code_absence}     hint="High = no debug leftovers"         isAILike={m1.dead_code_absence > 65}      />
        <MetricRow label="Magic number usage"        value={m1.magic_numbers}         hint="High = named constants = AI"       isAILike={m1.magic_numbers > 55}          />
        <MetricRow label="Identifier entropy"        value={m1.entropy}               hint="Low = repetitive vocabulary"       isAILike={m1.entropy < 50}                />
        <MetricRow label="Type-token ratio"          value={m1.type_token_ratio}      hint="Low = narrow vocabulary = AI"      isAILike={m1.type_token_ratio < 55}       />
      </Section>
      {divider}

      <Section title="Statistical — Tier 2" defaultOpen={false}>
        <MetricRow label="N-gram entropy"            value={m2.ngram_entropy}         hint="Low = predictable sequences"       isAILike={m2.ngram_entropy < 55}          />
        <MetricRow label="Log-rank score"            value={m2.log_rank}              hint="High = AI-favoured vocabulary"     isAILike={m2.log_rank > 55}               />
        <MetricRow label="Token histogram"           value={m2.token_histogram}       hint="High = concentrated token use"     isAILike={m2.token_histogram > 55}        />
        <MetricRow label="MATTR (vocab richness)"    value={m2.mattr}                 hint="Low = narrow per-window vocab"     isAILike={m2.mattr < 55}                  />
        <MetricRow label="Bayesian features"         value={m2.bayesian_features}     hint="High = matched AI feature set"     isAILike={m2.bayesian_features > 55}      />
      </Section>
    </div>
  );
}
