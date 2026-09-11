import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import type { KitchenOrder } from "./kitchen-service";

type KitchenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: KitchenOrder[]; refreshing: boolean; refreshError?: string };

export function useKitchenQueue(key: string, load: (signal: AbortSignal) => Promise<KitchenOrder[]>, intervalMs = 20_000) {
  const [state, setState] = useState<KitchenState>({ status: "loading" });
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function execute(initial: boolean) {
      if (running) return;
      running = true;
      if (!initial) setState(current => current.status === "success" ? { ...current, refreshing: true, refreshError: undefined } : current);
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setState({ status: "success", data, refreshing: false });
      } catch (cause) {
        if (controller.signal.aborted) return;
        const message = cause instanceof ApiError ? cause.message : "Não foi possível carregar a fila da cozinha.";
        setState(current => current.status === "success" ? { ...current, refreshing: false, refreshError: message } : { status: "error", message });
      } finally { running = false; }
    }
    setState({ status: "loading" });
    refreshRef.current = () => void execute(false);
    void execute(true);
    const timer = window.setInterval(() => void execute(false), intervalMs);
    return () => { controller.abort(); window.clearInterval(timer); refreshRef.current = () => {}; };
  }, [key, load, intervalMs]);
  return { state, refresh: useCallback(() => refreshRef.current(), []) };
}
