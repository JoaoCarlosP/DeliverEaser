import { useState, useRef, useCallback, useEffect } from "react";
import type { RouteState, WebSocketLogEvent, OptimizeResult } from "../types";
import { optimizeRoute } from "../services/api";

const WS_URL = "ws://localhost:8000/ws/logs";
const DRAFT_KEY = "deliverease_draft";

function loadDraft(): Pick<RouteState, "origin" | "stops"> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { origin: "", stops: [] };
}

export const useRouteOptimizer = () => {
  const [state, setState] = useState<RouteState>({
    ...loadDraft(),
    isLoading: false,
    result: null,
    failedAddresses: [],
    logs: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Persist origin + stops to localStorage on every change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ origin: state.origin, stops: state.stops }));
  }, [state.origin, state.stops]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onmessage = (event) => {
      try {
        const parsed: WebSocketLogEvent = JSON.parse(event.data);
        setState(prev => ({ ...prev, logs: [...prev.logs, parsed] }));
      } catch (err) {
        console.error("Failed to parse log", err);
      }
    };
  }, []);

  const setOrigin = (origin: string) => setState(prev => ({ ...prev, origin }));

  const addStop = (stop: string) => setState(prev => {
    if (!stop.trim()) return prev;
    return { ...prev, stops: [...prev.stops, stop] };
  });

  const removeStop = (index: number) => setState(prev => {
    const newStops = [...prev.stops];
    newStops.splice(index, 1);
    return { ...prev, stops: newStops };
  });

  const loadExample = () => {
    setState(prev => ({
      ...prev,
      origin: "Avenida Dom Aguirre 3000 Sorocaba",
      stops: [
        "18035-200",
        "Rua Barão de Tatuí 162 Sorocaba",
        "Avenida Doutor Afonso Vergueiro 1700 Sorocaba",
        "18013-000",
        "Rua da Penha 600 Sorocaba",
        "Avenida Itavuvu 100 Sorocaba",
        "18085-250",
        "Avenida Engenheiro Carlos Reinaldo Mendes 3200 Sorocaba",
        "Rua Padre Luís Rodrigues 282 Sorocaba",
        "18030-000",
        "Rua São Bento 165 Sorocaba",
        "Avenida General Carneiro 1765 Sorocaba",
        "18040-630",
        "Rua Benedito Campos 80 Sorocaba",
        "Avenida Independência 1500 Sorocaba",
        "18087-200",
        "Rua Wenceslau Braz 50 Sorocaba",
        "Avenida Professor Everardo Passos 2001 Sorocaba",
        "18050-040",
        "Rua General Carneiro 320 Sorocaba",
      ],
      result: null,
      failedAddresses: [],
      logs: [],
      error: null,
    }));
  };

  const _doOptimize = async (origin: string, stops: string[]) => {
    setState(prev => ({ ...prev, isLoading: true, logs: [], result: null, failedAddresses: [], error: null }));
    connectWebSocket();

    try {
      const res = await optimizeRoute(origin, stops) as OptimizeResult;

      if (!res.route || res.route.length === 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          result: [],
          failedAddresses: res.failed ?? [],
          error: "Não foi possível geocodificar endereços suficientes para calcular a rota.",
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          result: res.route,
          failedAddresses: res.failed ?? [],
        }));
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? "Erro ao conectar com o servidor.";
      setState(prev => ({ ...prev, isLoading: false, error: detail }));
    }
  };

  const runOptimization = async () => {
    if (!state.origin || state.stops.length === 0) return;
    await _doOptimize(state.origin, state.stops);
  };

  // Replace failed addresses with user-provided corrections and re-run
  const replaceFailedAndRerun = async (fixes: Record<string, string>) => {
    const newStops = state.stops.map(s => fixes[s] ?? s);
    const newOrigin = fixes[state.origin] ?? state.origin;
    // Update stops in state so localStorage is also updated
    setState(prev => ({ ...prev, stops: newStops, origin: newOrigin }));
    await _doOptimize(newOrigin, newStops);
  };

  const reorderStop = (from: number, to: number) => {
    setState(prev => {
      if (!prev.result) return prev;
      const arr = [...prev.result];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...prev, result: arr.map((s, i) => ({ ...s, sequence: s.type === "origin" ? 0 : i })) };
    });
  };

  const removeResultStop = (index: number) => {
    setState(prev => {
      if (!prev.result) return prev;
      const arr = prev.result.filter((_, i) => i !== index);
      return { ...prev, result: arr.map((s, i) => ({ ...s, sequence: s.type === "origin" ? 0 : i })) };
    });
  };

  const resetResults = () => setState(prev => ({ ...prev, result: null, failedAddresses: [], logs: [], error: null }));

  return {
    ...state,
    setOrigin,
    addStop,
    removeStop,
    runOptimization,
    replaceFailedAndRerun,
    loadExample,
    resetResults,
    reorderStop,
    removeResultStop,
  };
};
