import { useState, useCallback } from "react";
import { LANGUAGES } from "../data/constants.js";
import {
  runTier1Debug,
  scoreTier1,
  computeBypassFlag,
} from "../algorithms/tier1/heuristics.js";

const SIGNAL_META = {
  naming_verbosity:       { label: "Naming Verbosity",           weight: "23%", group: "scored" },
  dead_code_absence:      { label: "Dead Code Absence",          weight: "18%", group: "scored" },
  variable_reuse:         { label: "Variable Reuse",             weight: "16%", group: "scored" },
  structural_regularity:  { label: "Structural Regularity",      weight: "12%", group: "scored" },
  magic_numbers:          { label: "Magic Number Usage",         weight: "10%", group: "scored" },
  type_token_ratio:       { label: "Type-Token Ratio",           weight: "8%",  group: "scored" },
  exception_handling:     { label: "Exception Handling",         weight: "6%",  group: "scored" },
  entropy:                { label: "Identifier Entropy",         weight: "5%",  group: "scored" },
  import_organisation:    { label: "Import Organisation",        weight: "2%",  group: "scored" },
  guard_clauses:          { label: "Guard Clause Density",       weight: "---",    group: "diagnostic" },
  complexity_uniformity:  { label: "Complexity Uniformity",      weight: "---",    group: "diagnostic" },
  type_annotations:       { label: "Type Annotations",           weight: "bypass", group: "diagnostic" },
  docstring_coverage:     { label: "Docstring Coverage",         weight: "bypass", group: "diagnostic" },
  emoji_presence:         { label: "Emoji Presence",             weight: "bypass", group: "diagnostic" },
  comment_absence:        { label: "Comment Absence",            weight: "---",    group: "diagnostic" },
  blank_density:          { label: "Blank Line Density",         weight: "---",    group: "diagnostic" },
  indent_consistency:     { label: "Indent Consistency",         weight: "---",    group: "diagnostic" },
  halstead_uniformity:    { label: "Halstead Uniformity",        weight: "---",    group: "diagnostic" },
  string_formatting:      { label: "String Formatting",          weight: "---",    group: "diagnostic" },
  error_verbosity:        { label: "Error Message Verbosity",    weight: "---",    group: "diagnostic" },
};

const SIGNAL_ORDER = [
  "naming_verbosity", "dead_code_absence",
  "variable_reuse", "structural_regularity", "magic_numbers",
  "type_token_ratio", "exception_handling", "entropy",
  "import_organisation",
  "guard_clauses", "complexity_uniformity",
  "type_annotations", "docstring_coverage", "emoji_presence",
  "comment_absence", "blank_density", "indent_consistency",
  "halstead_uniformity", "string_formatting", "error_verbosity",
];

function scoreColor(score) {
  if (score >= 65) return "var(--color-text-danger)";
  if (score >= 45) return "var(--color-text-warning)";
  return "var(--color-text-success)";
}

function Chip({ children, variant = "default" }) {
  const bg = {
    default: "var(--color-background-tertiary)",
    verbose: "rgba(248, 81, 73, 0.15)",
    filtered: "rgba(88, 166, 255, 0.12)",
    match: "rgba(210, 153, 34, 0.15)",
    human: "rgba(46, 160, 67, 0.15)",
    constant: "rgba(136, 98, 230, 0.15)",
  }[variant] || "var(--color-background-tertiary)";

  const color = {
    default: "var(--color-text-secondary)",
    verbose: "var(--color-text-danger)",
    filtered: "var(--color-text-info)",
    match: "var(--color-text-warning)",
    human: "var(--color-text-success)",
    constant: "#8862e6",
  }[variant] || "var(--color-text-secondary)";

  return (
    <span style={{
      display: "inline-block",
      background: bg,
      color,
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      padding: "2px 8px",
      borderRadius: 6,
      margin: "2px 3px",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function ChipList({ label, items, variant, max = 30 }) {
  if (!items || items.length === 0) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div style={{ margin: "4px 0" }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", marginRight: 6 }}>
        {label} ({items.length}):
      </span>
      {shown.map((item, i) => <Chip key={i} variant={variant}>{String(item)}</Chip>)}
      {rest > 0 && <Chip variant="default">+{rest} more</Chip>}
    </div>
  );
}

function KVList({ label, entries, max = 20 }) {
  if (!entries || entries.length === 0) return null;
  const shown = entries.slice(0, max);
  return (
    <div style={{ margin: "4px 0" }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", marginRight: 6 }}>
        {label}:
      </span>
      {shown.map(([k, v], i) => <Chip key={i} variant="default">{k}={v}</Chip>)}
    </div>
  );
}

function SignalDetails({ signalKey, data }) {
  if (!data) return null;

  switch (signalKey) {
    case "naming_verbosity":
      return (
        <>
          <ChipList label="All identifiers" items={data.allIdentifiers} variant="default" />
          <ChipList label="Verbose (len>9 or _+len>6)" items={data.verboseIdentifiers} variant="verbose" />
          <ChipList label="Short / normal" items={data.shortIdentifiers} variant="human" />
          <ChipList label="Filtered (keywords)" items={data.filteredKeywords} variant="filtered" />
          <ChipList label="Filtered (stdlib)" items={data.filteredStdlib} variant="filtered" />
        </>
      );
    case "variable_reuse":
      return (
        <>
          <KVList label="Assignments" entries={Object.entries(data.assignments)} />
          <ChipList label="Reused vars" items={data.reusedVars} variant="human" />
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
            Total vars: {data.totalVars}
          </div>
        </>
      );
    case "magic_numbers":
      return (
        <>
          <ChipList label="Named constants" items={data.namedConstants} variant="constant" />
          <ChipList label="Magic numbers found" items={data.magicNumbers} variant="verbose" />
        </>
      );
    case "type_annotations":
      return (
        <>
          <ChipList label="Type annotations" items={data.typeAnnotations} variant="match" />
          <ChipList label="Return types" items={data.returnTypes} variant="match" />
        </>
      );
    case "docstring_coverage":
      return (
        <>
          <ChipList label="Functions/classes found" items={data.entities} variant="default" />
          <ChipList label="Documented" items={data.documented} variant="verbose" />
          <ChipList label="Undocumented" items={data.undocumented} variant="human" />
        </>
      );
    case "structural_regularity":
      return (
        <>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
            Methods found: {data.totalMethods}
          </div>
          <ChipList label="Canonical (2+ of: full-word params, single return, long name, params used once)" items={data.canonicalMethods} variant="verbose" />
        </>
      );
    case "comment_absence":
      return (
        <>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
            Code lines: {data.totalCodeLines}
          </div>
          <ChipList label="Casual (TODO/FIXME/hack)" items={data.casualComments} variant="human" />
          <ChipList label="Formal comments" items={data.formalComments} variant="verbose" />
        </>
      );
    case "indent_consistency":
      return (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
          Base indent: {data.baseIndent} spaces | Indent values: [{data.indentValues.join(", ")}]
          {data.language === "Python" && " | Python (neutral — always 50)"}
        </div>
      );
    case "exception_handling":
      return (
        <>
          <ChipList label="Broad catches" items={data.broadCatches} variant="verbose" />
          <ChipList label="Bare catches" items={data.bareCatches} variant="human" />
          <ChipList label="raise/throw/panic" items={data.raiseThrow} variant="match" />
        </>
      );
    case "import_organisation":
      return (
        <>
          <ChipList label="Import lines" items={data.importLines} variant="default" />
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
            Groups: {data.groupCount} | Typing import: {data.hasTypingImport ? "yes" : "no"}
          </div>
        </>
      );
    case "string_formatting":
      return (
        <>
          <ChipList label="Modern (f-string, template literal)" items={data.modernMatches} variant="verbose" />
          <ChipList label="Old-style (%, .format, concat)" items={data.oldMatches} variant="human" />
        </>
      );
    case "dead_code_absence":
      return (
        <>
          <ChipList label="Commented-out code" items={data.commentedCode} variant="human" />
          <ChipList label="Debug prints" items={data.debugPrints} variant="human" />
          {data.commentedCode.length === 0 && data.debugPrints.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
              No dead code found (AI-like: surgically clean)
            </div>
          )}
        </>
      );
    case "entropy":
      return (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
          Unique tokens: {data.uniqueTokens} | Total: {data.totalTokens}
          <ChipList label="Top tokens" items={data.topTokens.map(([t, c]) => `${t} (${c}x)`)} variant="default" max={15} />
        </div>
      );
    case "blank_density":
      return (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
          Blank lines: {data.blankCount} / {data.totalLines} total ({(data.ratio * 100).toFixed(1)}%)
        </div>
      );
    case "complexity_uniformity":
      return (
        <ChipList label="Cyclomatic complexity per fn" items={data.perFunction.map((c, i) => `fn${i + 1}: ${c}`)} variant="default" />
      );
    case "halstead_uniformity":
      return (
        <ChipList label="Halstead volume per fn" items={data.perFunction.map((v, i) => `fn${i + 1}: ${v}`)} variant="default" />
      );
    case "type_token_ratio":
      return (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", margin: "4px 0" }}>
          Unique: {data.uniqueTokens} | Total: {data.totalTokens} | TTR: {data.ratio}
        </div>
      );
    case "guard_clauses":
      return (
        <>
          {data.functions.map((fn, i) => (
            <div key={i} style={{ margin: "4px 0" }}>
              <Chip variant={fn.guards.length > 0 ? "verbose" : "default"}>{fn.name.slice(0, 60)}</Chip>
              {fn.guards.length > 0
                ? fn.guards.map((g, j) => <Chip key={j} variant="match">{g.slice(0, 80)}</Chip>)
                : <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}> no guards</span>}
            </div>
          ))}
        </>
      );
    case "error_verbosity":
      return (
        <>
          <ChipList label="Verbose messages (>30 chars, 4+ words)" items={data.verboseMessages} variant="verbose" />
          <ChipList label="Terse messages" items={data.terseMessages} variant="human" />
        </>
      );
    case "emoji_presence":
      return (
        <ChipList label="Emojis found" items={data.emojis} variant="verbose" />
      );
    default:
      return <pre style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{JSON.stringify(data, null, 2)}</pre>;
  }
}

function SignalCard({ signalKey, data, meta }) {
  const [open, setOpen] = useState(true);
  const isDiag = meta.group === "diagnostic";

  return (
    <div className="rlab-card" style={{ opacity: isDiag ? 0.65 : 1 }}>
      <button className="rlab-card__header" onClick={() => setOpen(!open)}>
        <span className="rlab-card__arrow">{open ? "▼" : "▶"}</span>
        <span className="rlab-card__label">{meta.label}</span>
        <span className="rlab-card__weight">{meta.weight}</span>
        <span className="rlab-card__score" style={{ color: scoreColor(data.score) }}>
          {data.score}
        </span>
      </button>
      {open && (
        <div className="rlab-card__body">
          <SignalDetails signalKey={signalKey} data={data} />
        </div>
      )}
    </div>
  );
}

export function RegexLab() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Python");
  const [result, setResult] = useState(null);
  const [bypass, setBypass] = useState(null);
  const [t1Score, setT1Score] = useState(null);

  const analyze = useCallback(() => {
    if (!code.trim()) return;
    const lines = code.split("\n");
    const debug = runTier1Debug(code, lines, language);
    setResult(debug);

    const scores = {};
    for (const key of Object.keys(debug)) scores[key] = debug[key].score;
    setT1Score(scoreTier1(scores));
    setBypass(computeBypassFlag(code, lines, language));
  }, [code, language]);

  const scored = SIGNAL_ORDER.filter((k) => SIGNAL_META[k]?.group === "scored");
  const diagnostic = SIGNAL_ORDER.filter((k) => SIGNAL_META[k]?.group === "diagnostic");

  return (
    <div className="rlab">
      {/* Language selector */}
      <div className="lang-row" style={{ marginBottom: 12 }}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            className={`lang-btn${language === lang ? " active" : ""}`}
            onClick={() => setLanguage(lang)}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="rlab-editor">
        <div className="rlab-editor__bar">
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {language} · {code.split("\n").length} lines
          </span>
          <button className="rlab-analyze" onClick={analyze} disabled={!code.trim()}>
            Analyze Regex Extractions
          </button>
        </div>
        <textarea
          className="rlab-editor__textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste code here to see what each Tier 1 regex extracts..."
          spellCheck={false}
        />
      </div>

      {/* Results */}
      {result && (
        <div className="rlab-results">
          {/* Summary bar */}
          <div className="rlab-summary">
            <span className="rlab-summary__title">Tier 1 Weighted Score</span>
            <span className="rlab-summary__score" style={{ color: scoreColor(t1Score) }}>
              {t1Score}
            </span>
            {bypass?.triggered && (
              <span className="rlab-summary__bypass">
                BYPASS {Math.round(bypass.bypass_confidence * 100)}% — {bypass.reasons.join(", ")}
              </span>
            )}
          </div>

          {/* Scored signals */}
          <div className="rlab-section-label">Active Scoring Signals (9)</div>
          {scored.map((key) => (
            <SignalCard key={key} signalKey={key} data={result[key]} meta={SIGNAL_META[key]} />
          ))}

          {/* Diagnostic signals */}
          <div className="rlab-section-label" style={{ marginTop: 16 }}>Diagnostic Only (not in score)</div>
          {diagnostic.map((key) => (
            <SignalCard key={key} signalKey={key} data={result[key]} meta={SIGNAL_META[key]} />
          ))}
        </div>
      )}
    </div>
  );
}
