/**
 * App.jsx — CodeSentinel entry point
 *
 * Handles:
 *   - Language / code editor state
 *   - Scan animation + async analyzeCode (T1+T2 sync, T3 async)
 *   - ML toggle (enables/disables Tier 3)
 *   - Layout: left column (editor + results) / right sidebar (scores + metrics)
 *
 * Zero API calls. All detection runs locally in the browser.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import "./App.css";

import { LANGUAGES, SCAN_STAGES, EXAMPLES } from "./data/constants.js";
import { analyzeCode, getModelState, preloadModel, setStatusCallback } from "./algorithms/detector.js";

import { ScanProgress }     from "./components/ScanProgress.jsx";
import { ScorePanel }       from "./components/ScorePanel.jsx";
import { MetricsPanel }     from "./components/MetricsPanel.jsx";
import { TierBreakdown }    from "./components/TierBreakdown.jsx";
import { CodeViewer }       from "./components/CodeViewer.jsx";
import { DetectionSummary } from "./components/DetectionSummary.jsx";
import { PlainEnglishCard } from "./components/PlainEnglishCard.jsx";

const PINECONE_API_KEY = "pcsk_69ch9a_RPQLUArtXyReUKk87f7grMHiBzmz2EBWoqhENNJFufkbCPJ4DWJ9hrfq1DzcDXN";
const PINECONE_INDEX_NAME = "plagiarism-detector";

const LANG_MAP = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
};

async function fetchSubmissionFromPinecone(submissionId) {
  const descRes = await fetch(
    `https://api.pinecone.io/indexes/${PINECONE_INDEX_NAME}`,
    { headers: { "Api-Key": PINECONE_API_KEY, Accept: "application/json" } }
  );
  if (!descRes.ok) throw new Error(`Failed to describe index: ${descRes.status}`);
  const { host } = await descRes.json();

  const fetchRes = await fetch(
    `https://${host}/vectors/fetch?ids=${encodeURIComponent(`sub_${submissionId}`)}`,
    { headers: { "Api-Key": PINECONE_API_KEY, Accept: "application/json" } }
  );
  if (!fetchRes.ok) throw new Error(`Failed to fetch vector: ${fetchRes.status}`);
  const data = await fetchRes.json();

  const record = data.vectors?.[`sub_${submissionId}`];
  if (!record?.metadata) throw new Error("Submission not found in database");

  return {
    code: record.metadata.code || "",
    language: record.metadata.language || null,
    studentId: record.metadata.studentId || null,
    questionId: record.metadata.questionId || null,
  };
}

export default function App() {
  const [language,    setLanguage]   = useState("Python");
  const [code,        setCode]       = useState("");
  const [scanning,    setScanning]   = useState(false);
  const [stageIdx,    setStageIdx]   = useState(0);
  const [result,      setResult]     = useState(null);
  const [error,       setError]      = useState("");
  const [mlEnabled,   setMlEnabled]  = useState(true);
  const [modelState,  setModelState] = useState({ loading: false, ready: false, error: null });
  const [fetchingSubmission, setFetchingSubmission] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const autoScanPending = useRef(false);

  useEffect(() => {
    setStatusCallback(() => {
      setModelState(getModelState());
    });
    preloadModel();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    setFetchingSubmission(true);
    setError("");
    fetchSubmissionFromPinecone(id)
      .then((sub) => {
        setCode(sub.code);
        const mappedLang = LANG_MAP[sub.language?.toLowerCase()] || "Python";
        setLanguage(mappedLang);
        setSubmissionInfo({ id, studentId: sub.studentId, questionId: sub.questionId });
        autoScanPending.current = true;
      })
      .catch((err) => {
        setError(`Failed to load submission "${id}": ${err.message}`);
      })
      .finally(() => setFetchingSubmission(false));
  }, []);

  useEffect(() => {
    if (autoScanPending.current && code && !scanning && !fetchingSubmission) {
      autoScanPending.current = false;
      runScan();
    }
  }, [code, fetchingSubmission]);

  const loadExample = useCallback((type) => {
    const ex = EXAMPLES[type];
    setCode(ex.code);
    setLanguage(ex.language);
    setResult(null);
    setError("");
  }, []);

  const toggleML = useCallback(() => {
    const next = !mlEnabled;
    setMlEnabled(next);
    if (next && !modelState.ready && !modelState.loading) {
      preloadModel();
    }
  }, [mlEnabled, modelState]);

  const runScan = useCallback(async () => {
    if (!code.trim()) { setError("Please paste some code first."); return; }
    setError(""); setResult(null); setScanning(true); setStageIdx(0);

    for (let i = 0; i < SCAN_STAGES.length; i++) {
      await new Promise(r => setTimeout(r, 280 + Math.random() * 200));
      setStageIdx(i);
    }

    const analysisResult = await analyzeCode(
      code,
      language,
      mlEnabled,
      () => {}
    );

    setResult(analysisResult);
    setScanning(false);
  }, [code, language, mlEnabled]);

  return (
    <div className="app-shell">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__logo">
          <span className="app-header__logo-icon">⬡</span>
          <span>CodeSentinel</span>
        </div>
        <div className="app-header__badges">
          <span className="app-badge app-badge--tier">3-tier detection</span>
          <span className="app-badge app-badge--info">T1: 17 signals · T2: 5 signals · T3: ML</span>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="app-container">

        {/* Hero */}
        <div className="hero">
          <h1 className="hero__title">Detect AI-Generated Code</h1>
          <p className="hero__subtitle">
            Three-tier analysis — 17 heuristic signals, 5 statistical signals, and
            optional in-browser ML classification. Everything runs locally.
          </p>
        </div>

        {fetchingSubmission && (
          <div className="submission-banner submission-banner--loading">
            <span style={{ animation: 'pulse 0.8s infinite', display: 'inline-block' }}>◉</span>
            {' '}Loading submission from database…
          </div>
        )}

        {submissionInfo && !fetchingSubmission && (
          <div className="submission-banner submission-banner--info">
            <span>📋</span>
            <span>
              Loaded submission <strong>{submissionInfo.id}</strong>
              {submissionInfo.studentId && <> · Student: <strong>{submissionInfo.studentId}</strong></>}
              {submissionInfo.questionId && <> · Question: <strong>{submissionInfo.questionId}</strong></>}
            </span>
          </div>
        )}

        {/* Main grid */}
        <div className="main-grid">

          {/* ── LEFT COLUMN ────────────────────────────────────────── */}
          <div className="main-left">

            {/* Language selector */}
            <div className="lang-row">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  className={`lang-btn${language === lang ? ' active' : ''}`}
                  onClick={() => setLanguage(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="editor-card">
              <div className="editor-card__titlebar">
                <div className="editor-card__dots">
                  {['#ef4444','#f59e0b','#22c55e'].map(c => (
                    <div key={c} className="editor-card__dot" style={{ background: c }} />
                  ))}
                </div>
                <span className="editor-card__info">
                  {language} · {code.split('\n').length} lines
                </span>
                <div className="editor-card__actions">
                  <button className="editor-action editor-action--ai" onClick={() => loadExample('ai')}>
                    AI Sample
                  </button>
                  <button className="editor-action editor-action--human" onClick={() => loadExample('human')}>
                    Human Sample
                  </button>
                  <button className="editor-action editor-action--clear" onClick={() => { setCode(''); setResult(null); setError(''); }}>
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                className="editor-card__textarea"
                value={code}
                onChange={e => { setCode(e.target.value); setResult(null); }}
                placeholder={`// Paste your ${language} code here…`}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="error-banner">
                <span>⚠</span> {error}
              </div>
            )}

            {/* Scan button + ML toggle */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              <button
                className={`scan-btn ${scanning ? 'scan-btn--scanning' : 'scan-btn--ready'}`}
                onClick={runScan}
                disabled={scanning}
              >
                {scanning
                  ? <><span style={{ animation: 'pulse 0.8s infinite', display: 'inline-block' }}>◉</span>  Analyzing…</>
                  : '▶  Start Detection'
                }
              </button>
              <button
                className="ml-toggle"
                onClick={toggleML}
                title={mlEnabled ? 'ML Tier 3 is enabled — click to disable' : 'ML Tier 3 is disabled — click to enable'}
              >
                <span className={`ml-toggle__dot${modelState.loading ? ' ml-toggle__dot--loading' : modelState.ready ? ' ml-toggle__dot--ready' : modelState.error ? ' ml-toggle__dot--error' : ''}`} />
                <span className="ml-toggle__label">
                  {modelState.loading ? 'Loading…' : modelState.ready ? 'ML On' : modelState.error ? 'ML Err' : mlEnabled ? 'ML' : 'ML Off'}
                </span>
              </button>
            </div>

            {/* Results */}
            {!scanning && result && (
              <div className="fade-in">
                <CodeViewer result={result} />
                <div style={{ marginTop: 16 }}>
                  <DetectionSummary groups={result.groups} />
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ──────────────────────────────────────── */}
          <div className="main-right">

            {/* Scanning state */}
            {scanning && (
              <div className="scanning-box scan-pulse">
                <div className="scanning-box__header">
                  <span style={{ animation: 'pulse 0.8s infinite', color: 'var(--color-text-info)' }}>◉</span>
                  <span className="scanning-box__label">Scanning</span>
                </div>
                <ScanProgress stageIdx={stageIdx} />
              </div>
            )}

            {/* Empty state */}
            {!scanning && !result && (
              <div className="sidebar-empty">
                <div className="sidebar-empty__icon">⬡</div>
                <p className="sidebar-empty__text">
                  Paste code and hit<br /><strong style={{ color: 'var(--color-text-info)' }}>Start Detection</strong><br />to see results
                </p>
              </div>
            )}

            {/* Results */}
            {!scanning && result && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ScorePanel result={result} />

                <TierBreakdown tiers={result.tiers} />

                <MetricsPanel tiers={result.tiers} />

                {/* Key signals */}
                {(() => {
                  const allSigs = result.groups.flatMap(g => g.signals || []);
                  const freq = {};
                  allSigs.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
                  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);
                  if (!top.length) return null;
                  return (
                    <div className="key-signals-card">
                      <p className="card-label" style={{ marginBottom: 10 }}>Key Signals</p>
                      {top.map((s, i) => (
                        <div key={i} className="signal-row">
                          <span className="signal-row__marker">›</span>
                          <span className="signal-row__text">{s}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div>
                  <p className="card-label" style={{ marginBottom: 8 }}>Plain English</p>
                  <PlainEnglishCard result={result} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
