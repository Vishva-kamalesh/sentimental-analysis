/**
 * Sentiment Insights Engine — API Service
 * ----------------------------------------
 * All backend communication goes through this file.
 * Uses the Vite proxy (/api → http://localhost:8000),
 * so no hardcoded localhost URLs elsewhere in the app.
 */

const BASE = "/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmotionResult {
  emotion: string;
  score:   number;
  emoji:   string;
}

export interface PredictResponse {
  sentiment: "positive" | "negative" | "neutral";
  overall_sentiment: string;
  confidence: number;   // 0.0 – 1.0
  uncertainty: boolean;
  latency_ms: number;
  entropy: number;
  raw_label: string;
  all_scores: Record<string, number>;
  top_emotion: EmotionResult;
  emotions: EmotionResult[];
}

export interface AnalyzeResponse {
  overall_sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  top_emotion: EmotionResult;
  emotions: EmotionResult[];
}

export interface FaceAnalyzeResponse {
  dominant_emotion: string;
  emotions: EmotionResult[];
  box: { x: number; y: number; w: number; h: number };
}

export interface CompareResult {
  name: string;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  latency_ms: number;
}

export interface CompareResponse {
  results: CompareResult[];
  overall_sentiment: "positive" | "negative" | "neutral";
  top_emotion: EmotionResult;
  emotions: EmotionResult[];
}

export interface HealthResponse {
  status: string;
  model: string;
  device: string;         // "cpu" | "cuda"
  num_labels: number;
  labels: Record<string, string>;
}

export interface MetricsResponse {
  total_requests: number;
  avg_latency_ms: number;
  uptime_seconds: number;
  requests_per_second: number;
}

export interface BulkFileResult {
  text: string;
  sentiment: string;
  confidence: number;
  top_emotion: string;
  latency_ms: number;
}

export interface BulkFileResponse {
  filename: string;
  total_processed: number;
  results: BulkFileResult[];
}

export interface VoiceAnalyzeResponse extends PredictResponse {
  text: string;
}

export interface UserProfile {
  email: string;
  full_name?: string;
  is_active: boolean;
  provider: string;
  created_at: string;
}

export interface HistoryEntry {
  _id: string;
  user_id: string;
  type: string;
  input_data: any;
  output_data: any;
  timestamp: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Endpoints ──────────────────────────────────────────────────────────────

/** Analyze sentiment for a single text. */
export const predictSentiment = (text: string) =>
  post<PredictResponse>("/predict", { text });

/** Simple sentiment + emotion analysis. */
export const analyzeText = (text: string) =>
  post<AnalyzeResponse>("/analyze", { text });

/** Analyze facial emotion via webcam frame. */
export const analyzeFace = (base64Image: string) =>
  post<FaceAnalyzeResponse>("/analyze/face", { image_base64: base64Image });

/** Compare all 4 models. */
export const compareSentiment = (text: string) =>
  post<CompareResponse>("/predict/compare", { text });

/** Analyze sentiment for up to 50 texts in one call. */
export const predictBatch = (texts: string[]) =>
  post<PredictResponse[]>("/predict/batch", { texts });

/** Check backend health — also returns device (CPU vs CUDA). */
export const fetchHealth = () => get<HealthResponse>("/health");

/** Get live throughput and latency stats. */
export const fetchMetrics = () => get<MetricsResponse>("/metrics");

/** Analyze sentiment for each row in a file. */
export const analyzeFile = async (file: File): Promise<BulkFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/analyze/file`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<BulkFileResponse>;
};

/** Analyze voice sentiment via audio recording. */
export const analyzeVoice = async (audioBlob: Blob): Promise<VoiceAnalyzeResponse> => {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/analyze/voice`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<VoiceAnalyzeResponse>;
};

/** Get the currently logged-in user profile. */
export const fetchUserProfile = () => get<UserProfile>("/users/me");

/** Get analysis history. */
export const fetchHistory = () => get<HistoryEntry[]>("/history");
