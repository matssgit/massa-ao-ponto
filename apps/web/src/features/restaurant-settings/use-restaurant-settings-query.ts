import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";
import type { RestaurantDetails } from "./restaurant-settings-service";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: RestaurantDetails };

export function useRestaurantSettingsQuery(restaurantId: string, load: (signal: AbortSignal) => Promise<RestaurantDetails>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const reload = useCallback(() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController(); setState({ status: "loading" });
    void load(controller.signal).then((data) => { if (!controller.signal.aborted) setState({ status: "success", data }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: "error", message: error instanceof ApiError ? error.message : "Não foi possível carregar as configurações." }); });
    return () => controller.abort();
  }, [restaurantId, load, attempt]);
  return { state, reload, setData: (data: RestaurantDetails) => setState({ status: "success", data }) };
}
