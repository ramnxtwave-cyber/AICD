/**
 * algorithms/tier3/mlClassifier.js
 *
 * TIER 3 — ML Classification via backend API
 *
 * Calls the Python/FastAPI backend which runs two RoBERTa-based models:
 *   - roberta-large-openai-detector   (primary, RoBERTa Large, 355M params)
 *   - roberta-base-openai-detector    (secondary, RoBERTa Base, 125M params)
 *
 * Keeps the same exported interface so the orchestrator (detector.js) needs
 * no changes:  mlClassify, getModelState, preloadModel, setStatusCallback
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
 * Ping the backend health endpoint to check if models are loaded.
 * Called on mount — fires and forgets.
 */
export async function preloadModel() {
  if (backendReady || checking) return;
  checking = true;
  onStatusChange({ stage: "loading", message: "Connecting to ML backend…" });

  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, {}, 8_000);
    if (!res.ok) throw new Error(`Health check HTTP ${res.status}`);
    const data = await res.json();

    if (data.models_ready) {
      backendReady = true;
      backendError = null;
      onStatusChange({ stage: "ready", message: "ML backend connected" });
    } else {
      onStatusChange({
        stage: "loading",
        message: "Backend is loading models…",
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
      message: `ML backend unavailable: ${err.message}`,
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
 * Send code to the backend for ML analysis.
 *
 * Returns the same shape the orchestrator expects:
 *   { score, confidence, available, reason, ...extras }
 */
export async function mlClassify(code) {
  onStatusChange({ stage: "classifying", message: "Running ML inference…" });

  try {
    const res = await fetchWithTimeout(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Backend returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    backendReady = true;
    backendError = null;

    onStatusChange({ stage: "done", message: "ML classification complete" });

    const primary = data.models?.primary || {};
    const secondary = data.models?.secondary || {};

    return {
      score: data.score,
      confidence: data.confidence,
      available: true,
      sim_to_ai: primary.score != null ? primary.score / 100 : null,
      sim_to_human:
        secondary.score != null ? (100 - secondary.score) / 100 : null,
      reason: [
        `Primary (${primary.model}): ${primary.score}% AI`,
        `Secondary (${secondary.model}): ${secondary.score}% AI`,
        `${data.chunks_analyzed} chunk(s) in ${data.processing_time_ms}ms`,
      ].join(" · "),
      models: data.models,
      chunks_analyzed: data.chunks_analyzed,
      processing_time_ms: data.processing_time_ms,
    };
  } catch (err) {
    backendError = err.message;
    onStatusChange({
      stage: "error",
      message: `ML inference failed: ${err.message}`,
    });

    return {
      score: null,
      confidence: 0,
      available: false,
      reason: `ML backend error: ${err.message}`,
    };
  }
}
