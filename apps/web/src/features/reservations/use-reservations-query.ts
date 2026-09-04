import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";

type QueryState<T> = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: T };
export function useReservationsQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: QueryState<T> }>({ key, state: { status: "loading" } });
  const reload = useCallback(() => { setResult({ key, state: { status: "loading" } }); setAttempt((value) => value + 1); }, [key]);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ key, state: { status: "loading" } });
    void load(controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ key, state: { status: "success", data } });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setResult({ key, state: { status: "error", message: error instanceof ApiError ? error.message : "Não foi possível carregar as reservas." } });
    });
    return () => controller.abort();
  }, [key, load, attempt]);
  return { state: result.key === key ? result.state : { status: "loading" } as QueryState<T>, reload };
}
