import { useState, useEffect, useCallback } from "react";
import { fetchHealth, fetchMetrics, type HealthResponse, type MetricsResponse } from "@/lib/api";

export type BackendStatus = "online" | "offline" | "loading";

interface BackendState {
  status: BackendStatus;
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
  refresh: () => void;
}

/**
 * Polls the FastAPI backend every 10 seconds.
 * Returns live health + metrics so any component can display backend status.
 */
export function useBackendStatus(pollIntervalMs = 10_000): BackendState {
  const [status, setStatus]   = useState<BackendStatus>("loading");
  const [health, setHealth]   = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([fetchHealth(), fetchMetrics()]);
      setHealth(h);
      setMetrics(m);
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  return { status, health, metrics, refresh };
}
