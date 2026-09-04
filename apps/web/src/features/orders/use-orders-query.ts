import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";

type QueryState<T> = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: T };

export function useOrdersQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: QueryState<T> }>({ key, state: { status: "loading" } });
  const reload = useCallback(() => {
    setResult({ key, state: { status: "loading" } });
    setAttempt((value) => value + 1);
  }, [key]);

  useEffect(() => {
    const controller = new AbortController();
    setResult({ key, state: { status: "loading" } });
    void load(controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: "success", data } });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const message = error instanceof ApiError ? error.message : "Não foi possível carregar os pedidos.";
      setResult({ key, state: { status: "error", message } });
    });
    return () => controller.abort();
  }, [key, load, attempt]);

  const state: QueryState<T> = result.key === key ? result.state : { status: "loading" };
  return { state, reload };
}
