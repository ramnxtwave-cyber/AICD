/**
 * algorithms/reasonGenerator.js
 * Builds specific signal-driven plain-English reasons per group and overall.
 */

const SIGNAL_PHRASES = {
  'docstring delimiter':                        'contains docstring delimiters — AI tools add these to every function, even trivial ones',
  'structured docstring section (Args/Returns)':'has a formal Args/Returns section — real developers rarely write these',
  'fully type-annotated function signature':    'has full type annotations on every parameter — a strong AI pattern',
  'return type annotation':                     'declares a return type — AI annotates every return; humans usually skip it',
  'broad exception catch with alias (AI pattern)': "uses 'except Exception as e' — AI's default; humans write bare or specific catches",
  'typing module import':                       'imports from the typing module — AI always adds this for List, Dict, Optional etc.',
  'formal sentence-style comment':              'has a comment written as a full sentence — AI writes these; humans dash off quick notes',
  'casual comment marker':                      'contains a TODO or casual note — developers leave these; AI tools never do',
  'lowercase terse comment':                    'has a short, lowercase comment — the kind written quickly while coding',
  'one-liner shortcut':                         'uses a compact one-liner — a human shortcut AI usually writes across multiple lines',
  'AI-typical demo variable':                   "uses 'test_cases' — almost exclusively seen in AI-generated tutorial code",
  'bare except (human shortcut)':               "has a bare 'except:' — a human shortcut that AI never writes",
  'TODO/FIXME comment':                         'has a TODO/FIXME — a developer reminder to themselves; AI tools never leave these',
};

const DYNAMIC_PREFIXES = [
  { prefix: 'verbose naming:', tmpl: extra => `uses long descriptive names like '${extra}' — AI tools name for clarity; humans abbreviate` },
  { prefix: 'abbreviated names:', tmpl: extra => `uses short names like '${extra}' — a developer writing quickly` },
];

function renderPhrase(signal) {
  if (SIGNAL_PHRASES[signal]) return SIGNAL_PHRASES[signal];
  for (const { prefix, tmpl } of DYNAMIC_PREFIXES) {
    if (signal.startsWith(prefix)) return tmpl(signal.slice(prefix.length).trim());
  }
  return null;
}

export function buildGroupReason(group) {
  const { dominant, start, end, signals = [] } = group;
  const range   = start === end ? `Line ${start}` : `Lines ${start}–${end}`;
  const phrases = [...new Set(signals.map(renderPhrase).filter(Boolean))];

  if (dominant === 'ai') {
    if (!phrases.length) return `${range} follow highly consistent formatting and naming patterns typical of AI-generated code.`;
    if (phrases.length === 1) return `${range} ${phrases[0]}.`;
    return `${range} ${phrases[0]}. It also ${phrases[1]}.`;
  }
  if (dominant === 'human') {
    if (!phrases.length) return `${range} show an informal, practical style — code written to get the job done.`;
    if (phrases.length === 1) return `${range} ${phrases[0]}.`;
    return `${range} ${phrases[0]}. Additionally, it ${phrases[1]}.`;
  }
  if (!phrases.length) return `${range} shows a blend of AI and human patterns — possibly edited AI-generated code.`;
  return `${range} shows mixed signals: ${phrases.slice(0, 2).join('; ')}.`;
}

export function buildOverallExplanation(result) {
  const { overall_score, confidence, tiers, groups } = result;
  const isAI    = overall_score >= 70;
  const isMixed = overall_score >= 40 && overall_score < 70;
  const isHuman = overall_score < 40;

  const m1 = tiers?.tier1?.metrics || {};
  const m2 = tiers?.tier2?.metrics || {};
  const m3 = tiers?.tier3;

  const aiEvidence    = [];
  const humanEvidence = [];

  // Tier 1 evidence
  if (m1.type_annotations > 60)      aiEvidence.push('every function has full type annotations');
  if (m1.docstring_coverage > 80)    aiEvidence.push('every method has a docstring including trivial ones');
  if (m1.structural_regularity > 70) aiEvidence.push('all methods follow an identical def→types→docstring structure');
  if (m1.blank_density > 60)         aiEvidence.push('blank lines between almost every statement');
  if (m1.exception_handling > 70)    aiEvidence.push("broad 'except Exception as e' pattern throughout");
  if (m1.import_organisation > 70)   aiEvidence.push('imports are perfectly organised by stdlib → third-party → local');
  if (m1.complexity_uniformity > 70) aiEvidence.push('all functions have suspiciously similar complexity');
  if (m1.variable_reuse < 30)        aiEvidence.push('every intermediate value gets a fresh named variable');
  if (m1.comment_absence > 70)       aiEvidence.push('zero informal inline comments anywhere in the file');

  // Tier 1 human evidence
  if (m1.variable_reuse > 60)        humanEvidence.push('variables are reused and reassigned naturally');
  if (m1.dead_code_absence < 40)     humanEvidence.push('commented-out code or debug prints are present');
  if (m1.magic_numbers < 30)         humanEvidence.push('magic numbers are used inline rather than named constants');
  if ((100 - m1.type_token_ratio) < 35) humanEvidence.push('vocabulary is varied and informal');

  // Tier 2 evidence
  if (m2.log_rank > 65)              aiEvidence.push('vocabulary skews heavily toward formal AI-favoured words');
  if (m2.bayesian_features > 65)     aiEvidence.push('multiple Bayesian features matched known AI patterns');
  if ((100 - m2.mattr) > 55)         aiEvidence.push('low moving-average vocabulary richness across segments');

  // Tier 3 evidence
  const t3Available = m3?.available && m3?.score !== null;
  const t3Label = t3Available
    ? `ML embedding similarity — AI: ${m3.sim_to_ai?.toFixed(2)}, Human: ${m3.sim_to_human?.toFixed(2)}`
    : null;

  const aiGroups    = groups.filter(g => g.dominant === 'ai').length;
  const humanGroups = groups.filter(g => g.dominant === 'human').length;

  let headline, body, suggestions;

  if (isAI) {
    headline = 'This code was most likely written by an AI assistant.';
    const top = aiEvidence.slice(0, 3);
    body = top.length
      ? `The clearest indicators are: ${top.join('; ')}. ${t3Label ? t3Label + '.' : ''} ${aiGroups} section${aiGroups !== 1 ? 's' : ''} of the code triggered AI signals.`
      : `The overall structure, naming, and documentation is too polished and uniform for typical human authorship.`;
    suggestions = [
      m1.type_annotations > 60    && 'Remove type annotations from simpler or private methods',
      m1.docstring_coverage > 80  && 'Skip or shorten docstrings on trivial methods',
      m1.blank_density > 60       && 'Remove some blank lines between statements',
      m1.exception_handling > 70  && "Replace broad 'except Exception' with specific error types",
    ].filter(Boolean).slice(0, 3);
    if (!suggestions.length) suggestions = ['Try using shorter variable names and removing the formal documentation structure'];
  } else if (isMixed) {
    headline = 'This code appears to be a mix of AI-generated and human-written sections.';
    const aiParts    = aiEvidence.slice(0, 2);
    const humanParts = humanEvidence.slice(0, 2);
    body = `The AI-like sections show ${aiParts.length ? aiParts.join(' and ') : 'structured, formal patterns'}. `
         + `The human-like sections show ${humanParts.length ? humanParts.join(' and ') : 'a more relaxed style'}. `
         + `This often happens when someone uses an AI tool to generate the skeleton and fills in the logic themselves.`;
    suggestions = [
      'The red-highlighted lines are the most AI-generated — review those for original authorship',
      'The green lines are where your own writing most likely appears',
    ];
  } else {
    headline = 'This code reads as genuinely human-written.';
    const top = humanEvidence.slice(0, 3);
    body = top.length
      ? `The human signals are: ${top.join('; ')}. ${humanGroups} section${humanGroups !== 1 ? 's' : ''} scored as human-written.`
      : `The style is informal and practical throughout — code written to get the job done, not to impress.`;
    suggestions = [
      overall_score > 25 && 'A few sections scored slightly AI-like — check the yellow-highlighted lines',
      overall_score <= 25 && 'Strong human signal throughout',
    ].filter(Boolean);
  }

  return {
    headline,
    body,
    suggestions: suggestions.filter(Boolean).slice(0, 3),
    emoji:       isAI ? '🤖' : isMixed ? '🔀' : '👤',
    scoreColor:  isAI ? '#c94444' : isMixed ? '#c07030' : '#3aaa60',
  };
}
