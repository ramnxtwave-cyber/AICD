"""
main.py — FastAPI backend for CodeSentinel AI code detection.

Endpoints:
  GET  /api/health   — readiness probe (are models loaded?)
  POST /api/analyze  — run ML inference on submitted code
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from detector import load_models, models_ready, analyze

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Downloading / loading ML models (first run may take a few minutes) …")
    load_models()
    log.info("Models ready — server accepting requests.")
    yield


app = FastAPI(
    title="CodeSentinel API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=100_000)
    language: str = Field(default="Python")


class ModelResult(BaseModel):
    score: int
    confidence: int
    label: str
    model: str
    chunks: int


class AnalyzeResponse(BaseModel):
    score: int
    confidence: int
    models: dict[str, ModelResult]
    chunks_analyzed: int
    processing_time_ms: int


@app.get("/api/health")
def health():
    return {
        "status": "ok" if models_ready() else "loading",
        "models_ready": models_ready(),
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_code(req: AnalyzeRequest):
    if not models_ready():
        raise HTTPException(503, "Models are still loading. Try again shortly.")

    try:
        result = analyze(req.code, req.language)
    except Exception as exc:
        log.exception("Analysis failed")
        raise HTTPException(500, f"Analysis error: {exc}") from exc

    return result
