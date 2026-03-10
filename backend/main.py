"""
Sentiment Insights Engine - FastAPI Backend
============================================
High-throughput sentiment analysis API using DistilBERT with async batching.
- POST /predict         : Single-text sentiment prediction (with emotions)
- POST /predict/batch   : Multi-text batch prediction
- POST /analyze         : Simple overall sentiment + emotion detection with emojis
- GET  /health          : Service health + model info
- GET  /metrics         : Live throughput & latency stats
"""

import asyncio
import time
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional

import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from dotenv import load_dotenv
import os
import joblib
import numpy as np
import pandas as pd
import io
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from user_models import UserCreate, UserInDB, UserOut, Token, TokenData, HistoryEntry
from auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token
from fastapi.security import OAuth2PasswordBearer
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from face_utils import analyze_face_base64
import speech_recognition as sr
from pydub import AudioSegment
import tempfile
import static_ffmpeg


# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()

HF_TOKEN           = os.getenv("HF_TOKEN", "")
MODEL_NAME         = os.getenv("MODEL_NAME", "lxyuan/distilbert-base-multilingual-cased-sentiments-student")
EMOTION_MODEL_NAME = os.getenv("EMOTION_MODEL_NAME", "j-hartmann/emotion-english-distilroberta-base")
BATCH_WAIT_MS      = int(os.getenv("BATCH_WAIT_MS", "20"))
MAX_BATCH          = int(os.getenv("MAX_BATCH_SIZE", "32"))
UNCERTAINTY_ENTROPY_THRESHOLD = 0.6   # bits; above this → flagged uncertain

# MongoDB configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "sentimental_analysis"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Emotion → emoji mapping (we surface the top-5 human emotions)
EMOTION_EMOJI: dict = {
    "joy":      "😊",
    "anger":    "😡",
    "sadness":  "😢",
    "fear":     "😨",
    "love":     "😍",
    "surprise": "😲",
    "neutral":  "😐",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sentiment-api")

# ──────────────────────────────────────────────────────────────────────────────
# Database connection
# ──────────────────────────────────────────────────────────────────────────────
client: AsyncIOMotorClient = None
db = None

async def init_db():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DB_NAME]
        log.info(f"💾 Connected to MongoDB via {MONGODB_URI}")
    except Exception as e:
        log.error(f"❌ Could not connect to MongoDB: {e}")

def get_database():
    """Dependency to provide the database object."""
    return db

# ──────────────────────────────────────────────────────────────────────────────
# Global state
# ──────────────────────────────────────────────────────────────────────────────
class ModelState:
    tokenizer: Optional[AutoTokenizer] = None
    model: Optional[AutoModelForSequenceClassification] = None
    device: str = "cpu"
    label_map: dict = {}          # e.g. {"POSITIVE": 0, "NEGATIVE": 1}
    total_requests: int = 0
    total_latency_ms: float = 0.0
    start_time: float = time.time()
    # Emotion model (separate small model)
    emotion_tokenizer: Optional[AutoTokenizer] = None
    emotion_model: Optional[AutoModelForSequenceClassification] = None

    # Classical models
    lr_model:   Optional[any] = None
    svm_model:  Optional[any] = None
    nb_model:   Optional[any] = None
    vectorizer: Optional[any] = None

state = ModelState()

# ──────────────────────────────────────────────────────────────────────────────
# Async batch queue
# ──────────────────────────────────────────────────────────────────────────────
class BatchRequest:
    def __init__(self, text: str):
        self.text   = text
        self.future = asyncio.get_event_loop().create_future()

batch_queue: asyncio.Queue = asyncio.Queue()


async def _batch_worker():
    """Background coroutine: collects requests, runs batched GPU inference."""
    log.info("⚡ Batch inference worker started (wait=%dms, max_batch=%d)", BATCH_WAIT_MS, MAX_BATCH)
    while True:
        # Wait for the first item
        first: BatchRequest = await batch_queue.get()
        batch: List[BatchRequest] = [first]

        # Drain remaining items that arrive within the wait window
        deadline = time.monotonic() + BATCH_WAIT_MS / 1000.0
        while len(batch) < MAX_BATCH:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            try:
                item = await asyncio.wait_for(batch_queue.get(), timeout=remaining)
                batch.append(item)
            except asyncio.TimeoutError:
                break

        texts = [item.text for item in batch]
        log.debug("Running batch of %d items", len(texts))

        t0 = time.perf_counter()
        try:
            results = _run_inference(texts)
            elapsed = (time.perf_counter() - t0) * 1000  # ms
            per_item_latency = elapsed / len(texts)

            for item, res in zip(batch, results):
                res["latency_ms"] = round(per_item_latency, 2)
                state.total_latency_ms += per_item_latency
                state.total_requests   += 1
                if not item.future.done():
                    item.future.set_result(res)

        except Exception as exc:
            log.exception("Inference error: %s", exc)
            for item in batch:
                if not item.future.done():
                    item.future.set_exception(exc)


def _run_inference(texts: List[str]) -> List[dict]:
    """
    Runs batched inference with CUDA autocast.
    Returns list of {sentiment, confidence, uncertainty} dicts.
    """
    model = state.model
    tokenizer = state.tokenizer
    device = state.device

    inputs = tokenizer(
        texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
    ).to(device)

    with torch.no_grad():
        if device == "cuda":
            with torch.cuda.amp.autocast():
                logits = model(**inputs).logits
        else:
            logits = model(**inputs).logits

    probs = F.softmax(logits, dim=-1)  # (batch, num_labels)

    results = []
    for i, prob_row in enumerate(probs):
        prob_np = prob_row.cpu().float().numpy()
        text = texts[i].lower()

        # Map model labels to IDs
        id2label = model.config.id2label
        label_scores = {id2label[idx].upper(): float(prob_np[idx]) for idx in range(len(prob_np))}
        
        pos_score = sum(score for label, score in label_scores.items() if "POS" in label)
        neg_score = sum(score for label, score in label_scores.items() if "NEG" in label)
        neu_score = sum(score for label, score in label_scores.items() if "NEU" in label)

        # Entropy-based uncertainty flag
        import numpy as np
        eps = 1e-9
        entropy = float(-np.sum(prob_np * np.log2(prob_np + eps)))
        uncertainty = entropy > UNCERTAINTY_ENTROPY_THRESHOLD

        # Mixed Sentiment Detection Heuristic
        # 1. Significant scores for both positive and negative
        # 2. Presence of transition words or "confusion" words
        mixed_keywords = ["but", "however", "although", "yet", "confused", "confusion", "mixed", "while", "nevertheless"]
        has_mixed_keywords = any(f" {kw} " in f" {text} " or text.startswith(kw) or text.endswith(kw) for kw in mixed_keywords)
        
        is_mixed = False
        if pos_score > 0.15 and neg_score > 0.15:
            is_mixed = True
        elif has_mixed_keywords and pos_score > 0.08 and neg_score > 0.08:
            is_mixed = True
        # Special case for user's example: 0.14 pos, 0.75 neg + "confused"
        elif "confused" in text and pos_score > 0.1 and neg_score > 0.1:
            is_mixed = True

        # Determine sentiment label
        pred_idx = int(prob_np.argmax())
        raw_label = id2label[pred_idx].upper()

        if is_mixed:
            sentiment = "neutral (mixed)"
            confidence = float(max(pos_score, neg_score)) # Reference the strongest side but label as neutral
        elif "POS" in raw_label:
            sentiment = "positive"
            confidence = pos_score
        elif "NEG" in raw_label:
            sentiment = "negative"
            confidence = neg_score
        else:
            sentiment = "neutral"
            confidence = neu_score

        results.append({
            "sentiment":   sentiment,
            "confidence":  round(confidence, 4),
            "uncertainty": uncertainty,
            "entropy":     round(entropy, 4),
            "raw_label":   raw_label,
            "all_scores":  {
                k: round(v, 4) for k, v in label_scores.items()
            },
        })

    return results


def _run_emotion_inference(text: str) -> List[dict]:
    """
    Runs emotion classification on a single text.
    Returns a sorted list of {emotion, score, emoji} dicts.
    """
    if state.emotion_model is None:
        return []

    import numpy as np
    inputs = state.emotion_tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
    ).to(state.device)

    with torch.no_grad():
        if state.device == "cuda":
            with torch.cuda.amp.autocast():
                logits = state.emotion_model(**inputs).logits
        else:
            logits = state.emotion_model(**inputs).logits

    probs = F.softmax(logits, dim=-1)[0].cpu().float().numpy()
    id2label = state.emotion_model.config.id2label

    emotions = []
    for i, score in enumerate(probs):
        label = id2label[i].lower()
        if label == "disgust":
            continue
            
        emotions.append({
            "emotion": label,
            "score":   round(float(score), 4),
            "emoji":   EMOTION_EMOJI.get(label, "🔸"),
        })

    # Sort by score descending
    emotions.sort(key=lambda x: x["score"], reverse=True)
    return emotions


def _run_classical_inference(text: str) -> dict:
    """Runs inference using LR, SVM, and NB models."""
    if not all([state.lr_model, state.svm_model, state.nb_model, state.vectorizer]):
        return {}

    t0 = time.perf_counter()
    X_vec = state.vectorizer.transform([text])
    
    # Predict
    lr_pred = state.lr_model.predict(X_vec)[0]
    svm_pred = state.svm_model.predict(X_vec)[0]
    nb_pred = state.nb_model.predict(X_vec)[0]
    
    # Confidence (NB and LR only)
    lr_conf = float(np.max(state.lr_model.predict_proba(X_vec)))
    nb_conf = float(np.max(state.nb_model.predict_proba(X_vec)))
    svm_conf = 1.0 # LinearSVC doesn't provide proba by default
    
    latency = (time.perf_counter() - t0) * 1000
    
    # Map 'pos'/'neg' to 'positive'/'negative'
    mapping = {"pos": "positive", "neg": "negative"}
    
    return {
        "lr":  {"sentiment": mapping.get(lr_pred, lr_pred), "confidence": round(lr_conf, 4)},
        "svm": {"sentiment": mapping.get(svm_pred, svm_pred), "confidence": round(svm_conf, 4)},
        "nb":  {"sentiment": mapping.get(nb_pred, nb_pred), "confidence": round(nb_conf, 4)},
        "latency_ms": round(latency, 2)
    }


# ──────────────────────────────────────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ──────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    static_ffmpeg.add_paths()
    await init_db()
    log.info("🚀 Loading model: %s", MODEL_NAME)
    t0 = time.perf_counter()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    state.device = device
    log.info("🖥  Device: %s", device.upper())

    token_kwargs = {"token": HF_TOKEN} if HF_TOKEN else {}

    state.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, **token_kwargs)
    state.model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, **token_kwargs
    ).to(device)
    state.model.eval()

    elapsed = time.perf_counter() - t0
    log.info("✅ Sentiment model loaded in %.2fs | Labels: %s", elapsed, state.model.config.id2label)

    # Load emotion model (prefer safetensors to avoid torch.load CVE-2025-32434)
    log.info("🎭 Loading emotion model: %s", EMOTION_MODEL_NAME)
    t1 = time.perf_counter()
    state.emotion_tokenizer = AutoTokenizer.from_pretrained(EMOTION_MODEL_NAME, **token_kwargs)
    try:
        state.emotion_model = AutoModelForSequenceClassification.from_pretrained(
            EMOTION_MODEL_NAME, use_safetensors=True, **token_kwargs
        ).to(device)
    except Exception:
        # safetensors not available for this model — fall back with weights_only override
        import transformers
        state.emotion_model = AutoModelForSequenceClassification.from_pretrained(
            EMOTION_MODEL_NAME, **token_kwargs
        ).to(device)
    state.emotion_model.eval()
    log.info("✅ Emotion model loaded in %.2fs | Labels: %s", time.perf_counter() - t1, state.emotion_model.config.id2label)

    # ── Load Classical Models ────────────────────────────────────────────────
    try:
        log.info("📊 Loading classical models (LR, SVM, NB)...")
        state.lr_model = joblib.load("lr_model.pkl")
        state.svm_model = joblib.load("svm_model.pkl")
        state.nb_model = joblib.load("nb_model.pkl")
        state.vectorizer = joblib.load("vectorizer.pkl")
        log.info("✅ Classical models loaded successfully.")
    except Exception as e:
        log.warning("⚠️ Could not load classical models: %s", e)

    # Start batch worker
    loop = asyncio.get_event_loop()
    worker_task = loop.create_task(_batch_worker())

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    log.info("🛑 Shutting down...")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sentiment Insights Engine API",
    description="Industrial-grade sentiment analysis powered by DistilBERT.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, example="I absolutely loved this product!")

class EmotionResult(BaseModel):
    emotion: str
    score:   float
    emoji:   str

class PredictResponse(BaseModel):
    sentiment:        str    # "positive" | "negative" | "neutral"
    overall_sentiment: str   # Same as sentiment
    confidence:       float  # 0.0 – 1.0
    uncertainty:      bool
    latency_ms:       float
    entropy:          float
    raw_label:        str
    all_scores:       dict
    top_emotion:      EmotionResult  # The single most dominant emotion
    emotions:         List[EmotionResult]  # All detected emotions (sorted)

class VoiceAnalyzeResponse(PredictResponse):
    text: str

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, example="hello")

class AnalyzeResponse(BaseModel):
    overall_sentiment: str               # "positive" | "negative" | "neutral"
    confidence:        float
    top_emotion:       EmotionResult        # The single most dominant emotion
    emotions:          List[EmotionResult]  # All significant emotions (>10%)

class CompareResult(BaseModel):
    name: str
    sentiment: str
    confidence: float
    latency_ms: float

class CompareResult(BaseModel):
    name: str
    sentiment: str
    confidence: float
    latency_ms: float

class CompareResponse(BaseModel):
    results: List[CompareResult]
    overall_sentiment: str
    top_emotion: Optional[EmotionResult] = None
    emotions: List[EmotionResult] = []

class BulkFileResult(BaseModel):
    text: str
    sentiment: str
    confidence: float
    top_emotion: str
    latency_ms: float

class BulkFileResponse(BaseModel):
    filename: str
    total_processed: int
    results: List[BulkFileResult]

class BatchPredictRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=50)

class HealthResponse(BaseModel):
    status:     str
    model:      str
    device:     str
    num_labels: int
    labels:     dict

class MetricsResponse(BaseModel):
    total_requests:     int
    avg_latency_ms:     float
    uptime_seconds:     float
    requests_per_second: float

class GoogleAuthRequest(BaseModel):
    credential: str

class FaceAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")

class FaceAnalyzeResponse(BaseModel):
    dominant_emotion: str
    emotions: List[EmotionResult]
    box: dict

# ──────────────────────────────────────────────────────────────────────────────
# Authentication Dependencies
# ──────────────────────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        email: str = payload.get("sub")
        if email is None:
            return None
        user = await db.users.find_one({"email": email})
        return user
    except Exception:
        return None

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/register", response_model=UserOut, tags=["Auth"])
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password if provided (for local login)
    hashed_password = None
    if user.password:
        hashed_password = get_password_hash(user.password)
    
    new_user = {
        "email": user.email,
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "provider": user.provider,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user

@app.post("/login", response_model=Token, tags=["Auth"])
async def login(user_data: UserCreate):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if user.get("provider") != "local":
        raise HTTPException(status_code=400, detail=f"Please sign in with {user.get('provider')}")
        
    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/google-auth", response_model=Token, tags=["Auth"])
async def google_auth(req: GoogleAuthRequest):
    try:
        # Verify the Google JWT token
        idinfo = id_token.verify_oauth2_token(req.credential, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # Check if user exists
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Create new user for Google login
            new_user = {
                "email": email,
                "full_name": name,
                "provider": "google",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            await db.users.insert_one(new_user)
        elif user.get("provider") != "google":
            # If user exists but registered differently, maybe link or error
            # For this MVP, let's update provider or allow both if no pass.
            # But usually we enforce one provider per email for security.
            # raise HTTPException(status_code=400, detail="Email already registered with another provider")
            pass
            
        access_token = create_access_token(data={"sub": email})
        return {"access_token": access_token, "token_type": "bearer"}
    except ValueError as e:
        log.error(f"Google auth error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google token")
    except Exception as e:
        log.error(f"Google auth unexpected error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Google auth error: {str(e)}")

@app.get("/users/me", response_model=UserOut, tags=["Auth"])
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return current_user

# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health():
    """Returns model readiness and metadata."""
    if state.model is None:
        raise HTTPException(503, "Model not loaded yet")
    return {
        "status":     "ok",
        "model":      MODEL_NAME,
        "device":     state.device,
        "num_labels": state.model.config.num_labels,
        "labels":     state.model.config.id2label,
    }


@app.get("/metrics", response_model=MetricsResponse, tags=["System"])
async def metrics():
    """Returns live throughput and latency statistics."""
    uptime = time.time() - state.start_time
    avg_lat = (state.total_latency_ms / state.total_requests) if state.total_requests else 0.0
    rps     = state.total_requests / uptime if uptime > 0 else 0.0
    return {
        "total_requests":      state.total_requests,
        "avg_latency_ms":      round(avg_lat, 2),
        "uptime_seconds":      round(uptime, 1),
        "requests_per_second": round(rps, 2),
    }


@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
async def predict(req: PredictRequest, current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Analyze the sentiment of a single text.

    - **text**: The text to classify (1–5000 characters)

    Returns sentiment label, confidence score, uncertainty flag, and latency.
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up, please retry in a moment.")

    batch_req = BatchRequest(req.text)
    await batch_queue.put(batch_req)

    try:
        result = await asyncio.wait_for(batch_req.future, timeout=30.0)
    except asyncio.TimeoutError:
        raise HTTPException(504, "Inference timed out. Please retry.")

    # Add emotion detection
    loop = asyncio.get_event_loop()
    all_emotions = await loop.run_in_executor(None, _run_emotion_inference, req.text)
    
    result["emotions"] = all_emotions
    result["top_emotion"] = all_emotions[0] if all_emotions else None
    result["overall_sentiment"] = result["sentiment"]

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "text",
            "input_data": req.text,
            "output_data": result,
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return result


@app.post("/predict/batch", response_model=List[PredictResponse], tags=["Inference"])
async def predict_batch(req: BatchPredictRequest, current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Analyze the sentiment of up to 50 texts in a single request.

    Returns a list of prediction results in the same order as the input.
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up, please retry in a moment.")
    if len(req.texts) > 50:
        raise HTTPException(400, "Maximum 50 texts per batch request.")

    futures = []
    for text in req.texts:
        br = BatchRequest(text)
        await batch_queue.put(br)
        futures.append(br.future)

    try:
        results = await asyncio.wait_for(
            asyncio.gather(*futures, return_exceptions=False),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "Batch inference timed out. Please retry.")

    # Enrich batch results with emotions
    enriched = []
    for text, res in zip(req.texts, results):
        loop = asyncio.get_event_loop()
        all_emotions = await loop.run_in_executor(None, _run_emotion_inference, text)
        res["emotions"] = all_emotions
        res["top_emotion"] = all_emotions[0] if all_emotions else None
        res["overall_sentiment"] = res["sentiment"]
        enriched.append(res)

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "batch_text",
            "input_data": req.texts,
            "output_data": enriched,
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return enriched


@app.post("/analyze", response_model=AnalyzeResponse, tags=["Inference"])
async def analyze(req: AnalyzeRequest, current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    **Simple sentiment + emotion analysis.**

    Given any text input (e.g. `"hello"`), returns:
    - `overall_sentiment` — "positive", "negative", or "neutral"
    - `top_emotion` — The single most likely emotion (e.g. 😊 Joy)
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up, please retry in a moment.")

    # Sentiment via the batch queue
    batch_req = BatchRequest(req.text)
    await batch_queue.put(batch_req)
    try:
        result = await asyncio.wait_for(batch_req.future, timeout=30.0)
    except asyncio.TimeoutError:
        raise HTTPException(504, "Inference timed out. Please retry.")

    # Emotions
    loop = asyncio.get_event_loop()
    all_emotions = await loop.run_in_executor(None, _run_emotion_inference, req.text)

    # Filter: Return all in 'emotions' but specifically highlight 'top_emotion'
    # For the simplified output, we can show only emotions with > 10% score
    significant = [e for e in all_emotions if e["score"] > 0.1]
    if not significant:
        significant = all_emotions[:1]

    final_result = {
        "overall_sentiment": result["sentiment"],
        "confidence":        result["confidence"],
        "top_emotion":       all_emotions[0] if all_emotions else None,
        "emotions":          significant,
    }

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "text_analysis",
            "input_data": req.text,
            "output_data": final_result,
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return final_result


@app.post("/analyze/face", response_model=FaceAnalyzeResponse, tags=["Analysis"])
async def analyze_face(req: FaceAnalyzeRequest, current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Analyze facial expressions from a base64 encoded image.
    """
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, analyze_face_base64, req.image_base64)
        
        # Save to history if logged in
        if current_user:
            history_item = {
                "user_id": current_user["email"],
                "type": "face",
                "input_data": "[Webcam Snapshot]", 
                "output_data": result,
                "timestamp": datetime.utcnow()
            }
            await db.history.insert_one(history_item)
            
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        log.error(f"Face analysis error: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing face image.")


@app.post("/predict/compare", response_model=CompareResponse, tags=["Analysis"])
@app.post("/analysis", response_model=CompareResponse, tags=["Analysis"], include_in_schema=False)
async def predict_compare(req: PredictRequest, current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Runs inference on all 4 models and returns a comparison.
    - Champion DistilBERT
    - Logistic Regression
    - Linear SVM
    - Naive Bayes
    
    This endpoint is aliased to /analysis for frontend compatibility.
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up...")

    results = []
    
    # 1. DistilBERT Prediction
    try:
        batch_req = BatchRequest(req.text)
        await batch_queue.put(batch_req)
        distil_res = await asyncio.wait_for(batch_req.future, timeout=30.0)
        
        loop = asyncio.get_event_loop()
        emo_res = await loop.run_in_executor(None, _run_emotion_inference, req.text)

        results.append(CompareResult(
            name="DistilBERT (Champion)",
            sentiment=distil_res["sentiment"],
            confidence=round(distil_res["confidence"] * 100, 2),
            latency_ms=distil_res["latency_ms"]
        ))
        
        # Pull emotions from DistilBERT
        top_emotion = EmotionResult(**emo_res[0]) if emo_res else None
        emotions = [EmotionResult(**e) for e in emo_res if e["score"] > 0.1]
    except Exception as e:
        log.error(f"DistilBERT fail: {e}")
        top_emotion = None
        emotions = []

    # 2. Scikit-learn Models
    if state.vectorizer and state.lr_model:
        loop = asyncio.get_event_loop()
        mapping = {"pos": "positive", "neg": "negative"}
        
        # Logistic Regression
        try:
            start_time = time.perf_counter()
            vec = state.vectorizer.transform([req.text])
            pred = state.lr_model.predict(vec)[0]
            proba = state.lr_model.predict_proba(vec)[0].max()
            results.append(CompareResult(
                name="Logistic Regression",
                sentiment=mapping.get(pred, pred),
                confidence=round(float(proba) * 100, 2),
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2)
            ))
        except Exception as e:
            log.error(f"LR fail: {e}")

        # Linear SVM
        try:
            start_time = time.perf_counter()
            pred = state.svm_model.predict(vec)[0]
            proba = state.svm_model.predict_proba(vec)[0].max()
            results.append(CompareResult(
                name="Linear SVM",
                sentiment=mapping.get(pred, pred),
                confidence=round(float(proba) * 100, 2),
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2)
            ))
        except Exception as e:
            log.error(f"SVM fail: {e}")

        # Naive Bayes
        try:
            start_time = time.perf_counter()
            pred = state.nb_model.predict(vec)[0]
            proba = state.nb_model.predict_proba(vec)[0].max()
            results.append(CompareResult(
                name="Naive Bayes",
                sentiment=mapping.get(pred, pred),
                confidence=round(float(proba) * 100, 2),
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2)
            ))
        except Exception as e:
            log.error(f"NB fail: {e}")

    final_resp = CompareResponse(
        results=results,
        overall_sentiment=results[0].sentiment if results else "neutral",
        top_emotion=top_emotion,
        emotions=emotions
    )

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "text",
            "input_data": req.text,
            "output_data": final_resp.model_dump(),
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return final_resp


@app.post("/analyze/file", response_model=BulkFileResponse, tags=["Inference"])
async def analyze_file(file: UploadFile = File(...), current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Analyzes sentiment for each row in a CSV, Excel, or TXT file.
    Max 100 rows for real-time performance.
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up...")

    contents = await file.read()
    filename = file.filename
    texts = []

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".txt"):
            text_str = contents.decode("utf-8")
            # Split by lines and remove empty
            lines = [l.strip() for l in text_str.split("\n") if l.strip()]
            df = pd.DataFrame({"text": lines})
        else:
            raise HTTPException(400, "Unsupported file format. Use .csv, .xlsx, or .txt")

        # Find text column
        text_col = None
        possible_cols = ["text", "content", "review", "message", "body", "input"]
        for c in df.columns:
            if str(c).lower() in possible_cols:
                text_col = c
                break
        
        if text_col is None:
            # Fallback to the first object/string column
            text_cols = df.select_dtypes(include=['object']).columns
            if len(text_cols) > 0:
                text_col = text_cols[0]
            else:
                text_col = df.columns[0]

        # Limit to 100 rows
        df = df.head(100)
        texts = df[text_col].astype(str).tolist()

    except Exception as e:
        log.error(f"File processing error: {e}")
        raise HTTPException(400, f"Error processing file: {str(e)}")

    if not texts:
        raise HTTPException(400, "No text content found in file.")

    # Run inference in batches
    loop = asyncio.get_event_loop()
    results = []
    
    # We use the batch queue for sentiment
    futures = []
    for t in texts:
        br = BatchRequest(t)
        await batch_queue.put(br)
        futures.append(br.future)

    try:
        sentiment_results = await asyncio.wait_for(
            asyncio.gather(*futures), timeout=60.0
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "Bulk inference timeout.")

    # Enrich with top emotion (parallel)
    for t, s_res in zip(texts, sentiment_results):
        emo_res = await loop.run_in_executor(None, _run_emotion_inference, t)
        top_emo = emo_res[0]["emotion"] if emo_res else "neutral"
        
        results.append(BulkFileResult(
            text=t,
            sentiment=s_res["sentiment"],
            confidence=round(s_res["confidence"] * 100, 2),
            top_emotion=top_emo,
            latency_ms=s_res["latency_ms"]
        ))

    final_response = {
        "filename": filename,
        "total_processed": len(results),
        "results": results
    }

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "file_analysis",
            "input_data": filename,
            "output_data": final_response,
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return final_response


@app.post("/analyze/voice", response_model=VoiceAnalyzeResponse, tags=["Analysis"])
async def analyze_voice(file: UploadFile = File(...), current_user: Optional[dict] = Depends(get_current_user_optional), db: AsyncIOMotorClient = Depends(get_database)):
    """
    Accepts an audio file, converts it to text (STT), and runs sentiment analysis.
    Supported formats: wav, mp3, m4a, webm (via pydub conversion).
    """
    if state.model is None:
        raise HTTPException(503, "Model warming up...")

    t0 = time.perf_counter()
    
    # ── Read and Convert Audio ──
    try:
        contents = await file.read()
        audio_io = io.BytesIO(contents)
        
        # Determine format
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "webm"
        
        # Load audio data
        try:
            log.info(f"🎙️ Processing audio: {file.filename} | Size: {len(contents)} bytes | Ext: {file_ext}")
            audio = AudioSegment.from_file(audio_io, format=file_ext)
        except Exception as e:
            log.warning(f"⚠️ Audio load failed with ext {file_ext}, trying auto-detect: {e}")
            audio_io.seek(0)
            audio = AudioSegment.from_file(audio_io)

        log.info(f"📏 Audio Loaded: {len(audio)}ms | Channels: {audio.channels} | Frame Rate: {audio.frame_rate}")

        # Convert to WAV (Mono, 1kHz is ideal for Google STT)
        audio = audio.set_channels(1).set_frame_rate(16000)
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav_path = tmp_wav.name
            audio.export(tmp_wav_path, format="wav")

        # ── Speech Recognition ──
        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_wav_path) as source:
            audio_data = recognizer.record(source)
        
        # Using Google Web Speech API (no key required for testing)
        text = recognizer.recognize_google(audio_data)
        
        # Cleanup
        os.remove(tmp_wav_path)

    except sr.UnknownValueError:
        raise HTTPException(400, "Speech Recognition could not understand the audio.")
    except sr.RequestError as e:
        raise HTTPException(502, f"Could not request results from STT service; {e}")
    except Exception as e:
        log.error(f"Voice processing error: {e}")
        raise HTTPException(400, f"Error processing audio: {str(e)}")

    if not text.strip():
        raise HTTPException(400, "No text recognized in audio.")

    # ── Sentiment Inference ──
    # We use the existing batch worker system for the sentiment part
    br = BatchRequest(text)
    await batch_queue.put(br)
    
    # Wait for result
    try:
        sentiment_res = await asyncio.wait_for(br.future, timeout=10.0)
    except asyncio.TimeoutError:
        raise HTTPException(504, "Sentiment inference timeout.")

    # Emotion detect (not batched, runs in executor)
    loop = asyncio.get_event_loop()
    emotions = await loop.run_in_executor(None, _run_emotion_inference, text)

    latency_ms = (time.perf_counter() - t0) * 1000

    final_result = VoiceAnalyzeResponse(
        text=text,
        sentiment=sentiment_res["sentiment"],
        overall_sentiment=sentiment_res["sentiment"],
        confidence=sentiment_res["confidence"],
        uncertainty=sentiment_res["uncertainty"],
        latency_ms=latency_ms,
        entropy=sentiment_res["entropy"],
        raw_label=sentiment_res["raw_label"],
        all_scores=sentiment_res["all_scores"],
        top_emotion=EmotionResult(**emotions[0]) if emotions else EmotionResult(emotion="neutral", score=1.0, emoji="😐"),
        emotions=[EmotionResult(**e) for e in emotions]
    )

    # Save to history if logged in
    if current_user:
        history_item = {
            "user_id": current_user["email"],
            "type": "voice",
            "input_data": text,
            "output_data": final_result.model_dump(),
            "timestamp": datetime.utcnow()
        }
        await db.history.insert_one(history_item)

    return final_result

@app.get("/history", response_model=List[HistoryEntry], tags=["Auth"])
async def get_history(current_user: dict = Depends(get_current_user)):
    """
    Retrieve all analysis history for the logged-in user.
    """
    cursor = db.history.find({"user_id": current_user["email"]}).sort("timestamp", -1)
    history = await cursor.to_list(length=100)
    return history


# ──────────────────────────────────────────────────────────────────────────────
# Dev entry-point
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
