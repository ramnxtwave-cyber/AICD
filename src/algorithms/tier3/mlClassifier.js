/**
 * algorithms/tier3/mlClassifier.js
 *
 * Backend API client for CodeSentinel.
 *
 * The backend returns both Tier 2 (statistical, Python-based) and
 * Tier 3 (ML classification) results in a single /api/analyze call.
 *
 * Tier 3 runs two RoBERTa-based models:
 *   - roberta-large-openai-detector   (primary, RoBERTa Large, 355M params)
 *   - roberta-base-openai-detector    (secondary, RoBERTa Base, 125M params)
 *
 * Exported interface:
 *   mlClassify, getModelState, preloadModel, setStatusCallback
 */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://augustus-dishevelled-janessa.ngrok-free.dev/api";
const TIMEOUT_MS = 30_000;

let backendReady = false;
let backendError = null;
let checking = false;

let onStatusChange = () => {};
export function setStatusCallback(cb) {
  onStatusChange = cb;
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Ping the backend health endpoint to check readiness.
 */
export async function preloadModel() {
  if (backendReady || checking) return;
  checking = true;
  onStatusChange({ stage: "loading", message: "Connecting to backend…" });

  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, {}, 8_000);
    if (!res.ok) throw new Error(`Health check HTTP ${res.status}`);
    const data = await res.json();

    if (data.models_ready && data.tier2_ready) {
      backendReady = true;
      backendError = null;
      onStatusChange({ stage: "ready", message: "Backend connected" });
    } else {
      onStatusChange({
        stage: "loading",
        message: "Backend is loading resources…",
      });
      setTimeout(() => {
        checking = false;
        preloadModel();
      }, 3_000);
      return;
    }
  } catch (err) {
    backendError = err.message;
    onStatusChange({
      stage: "error",
      message: `Backend unavailable: ${err.message}`,
    });
  } finally {
    checking = false;
  }
}

export function getModelState() {
  return {
    loading: checking,
    ready: backendReady,
    error: backendError,
  };
}

/**
 * Send code to the backend for combined Tier 2 + Tier 3 analysis.
 *
 * Returns {
 *   tier3:      { score, confidence, available, reason, ... }
 *   backendT2:  { metrics, score } | null
 * }
 */
export async function mlClassify(code, language = "Python") {
  onStatusChange({ stage: "classifying", message: "Running backend analysis…" });

  try {
    const res = await fetchWithTimeout(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Backend returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    backendReady = true;
    backendError = null;

    onStatusChange({ stage: "done", message: "Backend analysis complete" });

    // Extract Tier 3 (ML) result
    let tier3;
    if (data.tier3) {
      const t3 = data.tier3;
      const primary = t3.models?.primary || {};
      const secondary = t3.models?.secondary || {};

      tier3 = {
        score: t3.score,
        confidence: t3.confidence,
        available: true,
        sim_to_ai: primary.score != null ? primary.score / 100 : null,
        sim_to_human:
          secondary.score != null ? (100 - secondary.score) / 100 : null,
        reason: [
          `Primary (${primary.model}): ${primary.score}% AI`,
          `Secondary (${secondary.model}): ${secondary.score}% AI`,
          `${t3.chunks_analyzed} chunk(s) in ${t3.processing_time_ms}ms`,
        ].join(" · "),
        models: t3.models,
        chunks_analyzed: t3.chunks_analyzed,
        processing_time_ms: t3.processing_time_ms,
      };
    } else {
      tier3 = {
        score: null,
        confidence: 0,
        available: false,
        reason: "ML models not available in backend response",
      };
    }

    // Extract Tier 2 (statistical) result from backend
    const backendT2 = data.tier2 || null;

    return { tier3, backendT2 };
  } catch (err) {
    backendError = err.message;
    onStatusChange({
      stage: "error",
      message: `Backend analysis failed: ${err.message}`,
    });

    return {
      tier3: {
        score: null,
        confidence: 0,
        available: false,
        reason: `Backend error: ${err.message}`,
      },
      backendT2: null,
    };
  }
}
