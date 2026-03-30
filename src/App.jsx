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
import {
  analyzeCode,
  getModelState,
  preloadModel,
  setStatusCallback,
} from "./algorithms/detector.js";

import { ScanProgress } from "./components/ScanProgress.jsx";
import { ScorePanel } from "./components/ScorePanel.jsx";
import { MetricsPanel } from "./components/MetricsPanel.jsx";
import { TierBreakdown } from "./components/TierBreakdown.jsx";
import { CodeViewer } from "./components/CodeViewer.jsx";
import { DetectionSummary } from "./components/DetectionSummary.jsx";
import { PlainEnglishCard } from "./components/PlainEnglishCard.jsx";

const PINECONE_API_KEY =
  "pcsk_69ch9a_RPQLUArtXyReUKk87f7grMHiBzmz2EBWoqhENNJFufkbCPJ4DWJ9hrfq1DzcDXN";
const PINECONE_INDEX_NAME = "plagiarism-detector";
const PLAG_BACKEND_URL = "https://pd-production-b265.up.railway.app/api";
const AI_STUDENT_ID = "ai-chatgpt";

const LANG_MAP = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
};

const REVERSE_LANG_MAP = {
  Python: "python",
  JavaScript: "javascript",
  Java: "java",
  "C++": "cpp",
  C: "c",
  "C#": "csharp",
};

async function fetchSubmissionFromPinecone(submissionId) {
  const descRes = await fetch(
    `https://api.pinecone.io/indexes/${PINECONE_INDEX_NAME}`,
    { headers: { "Api-Key": PINECONE_API_KEY, Accept: "application/json" } },
  );
  if (!descRes.ok)
    throw new Error(`Failed to describe index: ${descRes.status}`);
  const { host } = await descRes.json();

  const fetchRes = await fetch(
    `https://${host}/vectors/fetch?ids=${encodeURIComponent(`sub_${submissionId}`)}`,
    { headers: { "Api-Key": PINECONE_API_KEY, Accept: "application/json" } },
  );
  if (!fetchRes.ok)
    throw new Error(`Failed to fetch vector: ${fetchRes.status}`);
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

async function findExistingAiSubmission(questionId, examId) {
  const qs = examId
    ? `/submissions/${encodeURIComponent(questionId)}?examId=${encodeURIComponent(examId)}`
    : `/submissions/${encodeURIComponent(questionId)}`;
  const res = await fetch(`${PLAG_BACKEND_URL}${qs}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success) return null;
  const match = (data.submissions || []).find(
    (s) => s.studentId === AI_STUDENT_ID,
  );
  return match || null;
}

async function fetchSubmissionCode(submissionId) {
  const res = await fetch(
    `${PLAG_BACKEND_URL}/submission/${encodeURIComponent(submissionId)}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success || !data.submission) return null;
  return data.submission.code || "";
}

async function generateCodeWithAI(apiKey, question, language) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a coding assistant. Generate only code in ${language}. Output ONLY the code — no explanations, no markdown fences, no comments about the code. Just pure runnable code.`,
        },
        { role: "user", content: question },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }
  const data = await res.json();
  let code = data.choices?.[0]?.message?.content || "";
  code = code
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return code;
}
// http://127.0.0.1:8080
async function submitCodeToBackend(
  apiKey,
  { code, studentId, questionId, examId, language },
) {
  const res = await fetch(`${PLAG_BACKEND_URL}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-OpenAI-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({
      code,
      studentId,
      questionId,
      examId: examId || undefined,
      language,
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Submit failed");
  return data;
}

async function runDirectComparison(apiKey, { code1, code2, language }) {
  const res = await fetch(`${PLAG_BACKEND_URL}/compare-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-OpenAI-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({ code1, code2, language }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Direct comparison failed");
  return data;
}

export default function App() {
  const [language, setLanguage] = useState("Python");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mlEnabled, setMlEnabled] = useState(true);
  const [modelState, setModelState] = useState({
    loading: false,
    ready: false,
    error: null,
  });
  const [fetchingSubmission, setFetchingSubmission] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const autoScanPending = useRef(false);
  const aiResultsRef = useRef(null);

  // AI Compare modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiApiKey, setAiApiKey] = useState(
    () => localStorage.getItem("aicd_openai_key") || "",
  );
  const [aiStep, setAiStep] = useState(null); // null | 'generating' | 'submitting' | 'checking' | 'done' | 'error'
  const [aiGeneratedCode, setAiGeneratedCode] = useState("");
  const [aiPlagResult, setAiPlagResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [mergedScore, setMergedScore] = useState(null);

  useEffect(() => {
    setStatusCallback(() => {
      setModelState(getModelState());
    });
    preloadModel();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const examIdParam = params.get("examId") || "";
    const questionIdParam = params.get("questionId") || "";
    if (!id) return;

    setFetchingSubmission(true);
    setError("");
    fetchSubmissionFromPinecone(id)
      .then((sub) => {
        setCode(sub.code);
        const mappedLang = LANG_MAP[sub.language?.toLowerCase()] || "Python";
        setLanguage(mappedLang);
        setSubmissionInfo({
          id,
          studentId: sub.studentId,
          questionId: questionIdParam || sub.questionId,
          examId: examIdParam || null,
          language: sub.language,
        });
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
    if (!code.trim()) {
      setError("Please paste some code first.");
      return;
    }
    setError("");
    setResult(null);
    setScanning(true);
    setStageIdx(0);

    for (let i = 0; i < SCAN_STAGES.length; i++) {
      await new Promise((r) => setTimeout(r, 280 + Math.random() * 200));
      setStageIdx(i);
    }

    const analysisResult = await analyzeCode(
      code,
      language,
      mlEnabled,
      () => {},
    );

    setResult(analysisResult);
    setScanning(false);
  }, [code, language, mlEnabled]);

  const handleAiCompare = useCallback(async () => {
    if (!aiApiKey.trim()) return;

    const backendLang = REVERSE_LANG_MAP[language] || "python";
    const qId = submissionInfo?.questionId;
    const eId = submissionInfo?.examId;
    if (!qId) {
      setAiError("Question ID is required. Pass questionId in URL.");
      setAiStep("error");
      return;
    }

    setAiError("");
    setAiGeneratedCode("");
    setAiPlagResult(null);
    setMergedScore(null);

    try {
      // Check if an AI submission already exists for this question
      setAiStep("generating");
      const existing = await findExistingAiSubmission(qId, eId);
      let generatedCode;

      if (existing) {
        const existingCode = await fetchSubmissionCode(existing.id);
        if (existingCode) {
          generatedCode = existingCode;
        }
      }

      if (!generatedCode) {
        if (!aiQuestion.trim()) {
          setAiError(
            "No existing AI submission found. Please enter a question to generate code.",
          );
          setAiStep("error");
          return;
        }
        generatedCode = await generateCodeWithAI(
          aiApiKey,
          aiQuestion,
          language,
        );

        setAiStep("submitting");
        await submitCodeToBackend(aiApiKey, {
          code: generatedCode,
          studentId: AI_STUDENT_ID,
          questionId: qId,
          examId: eId,
          language: backendLang,
        });
        await new Promise((r) => setTimeout(r, 3000));
      }

      setAiGeneratedCode(generatedCode);

      setAiStep("checking");
      const plagResult = await runDirectComparison(aiApiKey, {
        code1: code,
        code2: generatedCode,
        language: backendLang,
      });
      setAiPlagResult(plagResult);
      setAiStep("done");
    } catch (err) {
      setAiError(err.message);
      setAiStep("error");
    }
  }, [aiQuestion, aiApiKey, language, submissionInfo, code]);

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
          <span className="app-badge app-badge--info">
            T1: 17 signals · T2: 5 signals · T3: ML
          </span>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="app-container">
        {/* Hero */}
        <div className="hero">
          <h1 className="hero__title">Detect AI-Generated Code</h1>
          <p className="hero__subtitle">
            Three-tier analysis — 17 heuristic signals, 5 statistical signals,
            and optional in-browser ML classification. Everything runs locally.
          </p>
        </div>

        {fetchingSubmission && (
          <div className="submission-banner submission-banner--loading">
            <span
              style={{
                animation: "pulse 0.8s infinite",
                display: "inline-block",
              }}
            >
              ◉
            </span>{" "}
            Loading submission from database…
          </div>
        )}

        {submissionInfo && !fetchingSubmission && (
          <div className="submission-banner submission-banner--info">
            <span>📋</span>
            <span style={{ flex: 1 }}>
              Loaded submission <strong>{submissionInfo.id}</strong>
              {submissionInfo.studentId && (
                <>
                  {" "}
                  · Student: <strong>{submissionInfo.studentId}</strong>
                </>
              )}
              {submissionInfo.questionId && (
                <>
                  {" "}
                  · Question: <strong>{submissionInfo.questionId}</strong>
                </>
              )}
              {submissionInfo.examId && (
                <>
                  {" "}
                  · Exam: <strong>{submissionInfo.examId}</strong>
                </>
              )}
            </span>
            <button
              className="ai-compare-btn"
              onClick={() => {
                setShowAiModal(true);
                setAiStep(null);
                setAiError("");
              }}
            >
              🤖 Compare with AI Code
            </button>
          </div>
        )}

        {/* Main grid */}
        <div className="main-grid">
          {/* ── LEFT COLUMN ────────────────────────────────────────── */}
          <div className="main-left">
            {/* Language selector */}
            <div className="lang-row">
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
            <div className="editor-card">
              <div className="editor-card__titlebar">
                <div className="editor-card__dots">
                  {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                    <div
                      key={c}
                      className="editor-card__dot"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <span className="editor-card__info">
                  {language} · {code.split("\n").length} lines
                </span>
                <div className="editor-card__actions">
                  <button
                    className="editor-action editor-action--ai"
                    onClick={() => loadExample("ai")}
                  >
                    AI Sample
                  </button>
                  <button
                    className="editor-action editor-action--human"
                    onClick={() => loadExample("human")}
                  >
                    Human Sample
                  </button>
                  <button
                    className="editor-action editor-action--clear"
                    onClick={() => {
                      setCode("");
                      setResult(null);
                      setError("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                className="editor-card__textarea"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setResult(null);
                }}
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
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <button
                className={`scan-btn ${scanning ? "scan-btn--scanning" : "scan-btn--ready"}`}
                onClick={runScan}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <span
                      style={{
                        animation: "pulse 0.8s infinite",
                        display: "inline-block",
                      }}
                    >
                      ◉
                    </span>{" "}
                    Analyzing…
                  </>
                ) : (
                  "▶  Start Detection"
                )}
              </button>
              <button
                className="ml-toggle"
                onClick={toggleML}
                title={
                  mlEnabled
                    ? "ML Tier 3 is enabled — click to disable"
                    : "ML Tier 3 is disabled — click to enable"
                }
              >
                <span
                  className={`ml-toggle__dot${modelState.loading ? " ml-toggle__dot--loading" : modelState.ready ? " ml-toggle__dot--ready" : modelState.error ? " ml-toggle__dot--error" : ""}`}
                />
                <span className="ml-toggle__label">
                  {modelState.loading
                    ? "Loading…"
                    : modelState.ready
                      ? "ML On"
                      : modelState.error
                        ? "ML Err"
                        : mlEnabled
                          ? "ML"
                          : "ML Off"}
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
                  <span
                    style={{
                      animation: "pulse 0.8s infinite",
                      color: "var(--color-text-info)",
                    }}
                  >
                    ◉
                  </span>
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
                  Paste code and hit
                  <br />
                  <strong style={{ color: "var(--color-text-info)" }}>
                    Start Detection
                  </strong>
                  <br />
                  to see results
                </p>
              </div>
            )}

            {/* Results */}
            {!scanning && result && (
              <div
                className="fade-in"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <ScorePanel result={result} />

                <TierBreakdown tiers={result.tiers} />

                <MetricsPanel tiers={result.tiers} />

                {/* Key signals */}
                {(() => {
                  const allSigs = result.groups.flatMap((g) => g.signals || []);
                  const freq = {};
                  allSigs.forEach((s) => {
                    freq[s] = (freq[s] || 0) + 1;
                  });
                  const top = Object.entries(freq)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([s]) => s);
                  if (!top.length) return null;
                  return (
                    <div className="key-signals-card">
                      <p className="card-label" style={{ marginBottom: 10 }}>
                        Key Signals
                      </p>
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
                  <p className="card-label" style={{ marginBottom: 8 }}>
                    Plain English
                  </p>
                  <PlainEnglishCard result={result} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Plagiarism Comparison Results ─────────────────────── */}
        {aiStep === "done" && aiPlagResult && (
          <div className="ai-plag-results fade-in" ref={aiResultsRef}>
            <h2 className="ai-plag-results__title">
              🤖 AI Code Comparison Results
            </h2>

            {/* Max Similarity */}
            {(() => {
              const raw = (aiPlagResult.summary?.maxSimilarity ?? 0) * 100;
              const pct = Math.min(Math.round(raw), 100);
              return (
                <div className="ai-plag-max-sim">
                  <span className="ai-plag-max-sim__label">
                    Max Similarity with AI Code
                  </span>
                  <span
                    className={`ai-plag-max-sim__value ${pct >= 85 ? "high" : pct >= 60 ? "med" : "low"}`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })()}

            {/* Side-by-side code comparison */}
            <div className="ai-plag-code-compare">
              <div className="ai-plag-card">
                <div className="ai-plag-card__header">
                  <span>AI-Generated Code ({language})</span>
                  <button
                    className="ai-plag-copy"
                    onClick={() =>
                      navigator.clipboard?.writeText(aiGeneratedCode)
                    }
                  >
                    📋 Copy
                  </button>
                </div>
                <pre className="ai-plag-code">{aiGeneratedCode}</pre>
              </div>
              <div className="ai-plag-card">
                <div className="ai-plag-card__header">
                  <span>Current Submission ({language})</span>
                  <button
                    className="ai-plag-copy"
                    onClick={() => navigator.clipboard?.writeText(code)}
                  >
                    📋 Copy
                  </button>
                </div>
                <pre className="ai-plag-code">{code}</pre>
              </div>
            </div>

            {/* Scoring details */}
            {aiPlagResult.final_decision && (
              <div className="ai-plag-card">
                <div className="ai-plag-card__header">
                  <span>Scoring Details</span>
                </div>
                <div style={{ padding: "12px 16px", fontSize: 13 }}>
                  {aiPlagResult.final_decision.reasoning?.length > 0 && (
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {aiPlagResult.final_decision.reasoning.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Merge Score */}
            {result && !mergedScore && (
              <button
                className="merge-score-btn"
                onClick={() => {
                  const aiDetection = result.overall_score;
                  const aiSimilarityRaw =
                    (aiPlagResult.summary?.maxSimilarity ?? 0) * 100;
                  const aiSimilarity = Math.min(
                    Math.round(aiSimilarityRaw),
                    100,
                  );
                  const merged = Math.min(
                    Math.round(aiDetection * 0.55 + aiSimilarity * 0.45),
                    100,
                  );
                  setMergedScore({ merged, aiDetection, aiSimilarity });
                }}
              >
                🔀 Merge Scores
              </button>
            )}

            {mergedScore && (
              <div className="merged-score-card">
                <div className="merged-score-card__header">
                  Combined AI Probability
                </div>
                <div className="merged-score-card__body">
                  <div
                    className={`merged-score-card__gauge ${mergedScore.merged >= 70 ? "high" : mergedScore.merged >= 40 ? "med" : "low"}`}
                  >
                    {mergedScore.merged}%
                  </div>
                  <div className="merged-score-card__verdict">
                    {mergedScore.merged >= 70
                      ? "High probability this code is AI-generated."
                      : mergedScore.merged >= 40
                        ? "Moderate AI signals — review recommended."
                        : "Low AI probability — likely human-written."}
                  </div>
                  <div className="merged-score-card__breakdown">
                    <div className="merged-score-card__row">
                      <span className="merged-score-card__label">
                        AI Detection (heuristic + ML)
                      </span>
                      <span className="merged-score-card__weight">55%</span>
                      <span className="merged-score-card__val">
                        {mergedScore.aiDetection}%
                      </span>
                    </div>
                    <div className="merged-score-card__row">
                      <span className="merged-score-card__label">
                        AI Code Similarity
                      </span>
                      <span className="merged-score-card__weight">45%</span>
                      <span className="merged-score-card__val">
                        {mergedScore.aiSimilarity}%
                      </span>
                    </div>
                    <div className="merged-score-card__divider" />
                    <div className="merged-score-card__row merged-score-card__row--total">
                      <span className="merged-score-card__label">
                        Merged Score
                      </span>
                      <span className="merged-score-card__weight" />
                      <span className="merged-score-card__val">
                        {mergedScore.merged}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AI Compare Modal ──────────────────────────────────────── */}
      {showAiModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !aiStep) setShowAiModal(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-card__header">
              <h3>🤖 Compare with AI-Generated Code</h3>
              {!aiStep && (
                <button
                  className="modal-close"
                  onClick={() => setShowAiModal(false)}
                >
                  ✕
                </button>
              )}
            </div>

            {!aiStep && (
              <div className="modal-card__body">
                <label className="modal-label">OpenAI API Key</label>
                <input
                  type="password"
                  className="modal-input"
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    localStorage.setItem("aicd_openai_key", e.target.value);
                  }}
                  placeholder="sk-..."
                />

                <label className="modal-label" style={{ marginTop: 14 }}>
                  Question / Prompt for ChatGPT
                  <span
                    style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}
                  >
                    (leave empty to reuse existing AI submission)
                  </span>
                </label>
                <textarea
                  className="modal-textarea"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder={`e.g., Write a ${language} function that computes the Fibonacci sequence…`}
                  rows={5}
                />

                <div className="modal-meta">
                  <span>
                    Language: <strong>{language}</strong>
                  </span>
                  <span>
                    Question ID:{" "}
                    <strong>{submissionInfo?.questionId || "—"}</strong>
                  </span>
                  {submissionInfo?.examId && (
                    <span>
                      Exam ID: <strong>{submissionInfo.examId}</strong>
                    </span>
                  )}
                  <span>
                    AI Student: <strong>{AI_STUDENT_ID}</strong>
                  </span>
                </div>

                <button
                  className="modal-submit"
                  disabled={!aiApiKey.trim()}
                  onClick={handleAiCompare}
                >
                  ▶ Compare
                </button>
              </div>
            )}

            {aiStep && aiStep !== "done" && aiStep !== "error" && (
              <div className="modal-card__body modal-progress">
                <div className="modal-step">
                  <span
                    className={`modal-step__dot ${aiStep === "generating" ? "active" : aiStep === "submitting" || aiStep === "checking" ? "done" : ""}`}
                  />
                  <span>Looking up / generating AI code…</span>
                </div>
                <div className="modal-step">
                  <span
                    className={`modal-step__dot ${aiStep === "submitting" ? "active" : aiStep === "checking" ? "done" : ""}`}
                  />
                  <span>Saving AI code to database…</span>
                </div>
                <div className="modal-step">
                  <span
                    className={`modal-step__dot ${aiStep === "checking" ? "active" : ""}`}
                  />
                  <span>Comparing current code with AI code…</span>
                </div>
              </div>
            )}

            {aiStep === "error" && (
              <div className="modal-card__body">
                <div className="modal-error">
                  <strong>Error:</strong> {aiError}
                </div>
                <button
                  className="modal-submit"
                  onClick={() => setAiStep(null)}
                >
                  ← Try Again
                </button>
              </div>
            )}

            {aiStep === "done" && (
              <div className="modal-card__body">
                <div className="modal-success">✅ Comparison complete!</div>
                <button
                  className="modal-submit"
                  onClick={() => {
                    setShowAiModal(false);
                    setTimeout(
                      () =>
                        aiResultsRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                      100,
                    );
                  }}
                >
                  View Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
