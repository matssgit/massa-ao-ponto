import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";

export type SectionState<T> = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: T };

export function useDashboardSection<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<SectionState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void load(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: "success", data });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const message = error instanceof ApiError && error.status === 403
        ? "Seu acesso a este relatório não está disponível. Atualize sua sessão."
        : "Não foi possível carregar esta seção. Tente novamente.";
      setState({ status: "error", message });
    });
    return () => controller.abort();
  }, [load, attempt]);
  return { state, retry: () => { setState({ status: "loading" }); setAttempt((value) => value + 1); } };
}
