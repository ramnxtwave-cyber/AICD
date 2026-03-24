/**
 * components/TierBreakdown.jsx
 * Shows per-tier scores, weights, and ML model status.
 */

const TIER_META = {
  tier1: { label: 'Tier 1', sub: 'Heuristic / Static',    color: '#58a6ff', desc: '17 signals — runs instantly, no model' },
  tier2: { label: 'Tier 2', sub: 'Statistical / Tokens',  color: '#d29922', desc: '5 signals — n-gram, Bayesian, MATTR'   },
  tier3: { label: 'Tier 3', sub: 'ML Embedding',          color: '#bc8cff', desc: 'CodeBERT cosine similarity via WASM'   },
};

function TierCard({ id, tier }) {
  const meta      = TIER_META[id];
  const available = tier.available;
  const score     = tier.score;
  const weight    = Math.round(tier.weight * 100);

  const scoreColor = score === null ? 'var(--color-text-tertiary)'
    : score >= 70 ? '#f85149'
    : score >= 40 ? '#d29922'
    : '#3fb950';

  return (
    <div style={{
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '14px 16px',
      background: 'var(--color-background-primary)',
      opacity: available ? 1 : 0.5,
      transition: 'opacity 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              background: `${meta.color}15`,
              color: meta.color,
              border: `1px solid ${meta.color}30`,
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}>
              {meta.label}
            </span>
            <span style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500 }}>
              {meta.sub}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0 }}>
            {meta.desc}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ color: scoreColor, fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>
            {score !== null ? `${score}%` : '—'}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            weight {weight}%
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: 'var(--color-background-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
        {score !== null && (
          <div style={{
            width: `${score}%`, height: '100%',
            background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}bb)`,
            transition: 'width 1s ease',
            borderRadius: 2,
          }} />
        )}
      </div>

      {id === 'tier3' && !available && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: '8px 0 0' }}>
          {tier.metrics?.reason || 'Model not loaded — enable ML mode to activate'}
        </p>
      )}
    </div>
  );
}

export function TierBreakdown({ tiers, mlEnabled, onToggleML, modelState }) {
  if (!tiers) return null;
  const { loading, ready, error } = modelState || {};

  return (
    <div style={{
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-background-secondary)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-tertiary)',
        background: 'var(--color-background-tertiary)',
      }}>
        <span style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 10, fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
        }}>
          Tier Breakdown
        </span>
        <button
          onClick={onToggleML}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: mlEnabled ? 'rgba(188,140,255,0.12)' : 'var(--color-background-primary)',
            color: mlEnabled ? '#bc8cff' : 'var(--color-text-tertiary)',
            border: `1px solid ${mlEnabled ? 'rgba(188,140,255,0.3)' : 'var(--color-border-tertiary)'}`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: loading ? '#d29922' : ready ? '#3fb950' : error ? '#f85149' : 'var(--color-text-tertiary)',
            display: 'inline-block',
            boxShadow: ready ? '0 0 6px rgba(63,185,80,0.5)' : 'none',
          }} />
          {loading ? 'Loading ML...' : ready ? 'ML Active' : error ? 'ML Error' : 'Enable ML'}
        </button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(tiers).map(([id, tier]) => (
          <TierCard key={id} id={id} tier={tier} />
        ))}
      </div>
    </div>
  );
}
