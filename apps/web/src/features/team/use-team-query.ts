import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";

type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

export function useTeamQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>, fallback: string) {
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
      if (!controller.signal.aborted) setResult({ key, state: { status: "error", message: error instanceof ApiError ? error.message : fallback } });
    });
    return () => controller.abort();
  }, [attempt, fallback, key, load]);
  const state: QueryState<T> = result.key === key ? result.state : { status: "loading" };
  return { state, reload };
}