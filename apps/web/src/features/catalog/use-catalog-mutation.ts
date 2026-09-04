import { useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";

export function useCatalogMutation(reload: () => void) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  async function run(success: string, action: () => Promise<unknown>): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setNotice(null);
    try {
      await action();
      setNotice({ error: false, text: success });
      reload();
      return true;
    } catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível concluir a alteração." });
      reload();
      return false;
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return { busy, notice, run };
}
