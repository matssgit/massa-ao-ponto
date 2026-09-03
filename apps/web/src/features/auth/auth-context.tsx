import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../../lib/api-client";
import { AuthService, authErrorMessage, type Session } from "./auth-service";
import { AuthContext } from "./auth-state";

export function AuthProvider({
  service,
  children,
}: {
  service: AuthService;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    service.client.setCsrfToken(null);
    setSession(null);
    setLoading(false);
    setError(null);
  }, [service]);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await service.session();
      if (current !== generation.current) return;
      service.client.setCsrfToken(next.csrfToken);
      setSession(next);
    } catch (cause) {
      if (current !== generation.current) return;
      if (cause instanceof ApiError && cause.status === 401) clear();
      else {
        service.client.setCsrfToken(null);
        setSession(null);
        setError(authErrorMessage(cause));
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [clear, service]);

  useEffect(() => {
    const unsubscribe = service.client.onUnauthorized(clear);
    void refresh();
    return () => {
      unsubscribe();
      generation.current += 1;
      service.client.setCsrfToken(null);
    };
  }, [clear, refresh, service]);

  async function login(email: string, password: string) {
    const current = ++generation.current;
    await service.login(email, password);
    if (current === generation.current) await refresh();
  }

  async function logout() {
    generation.current += 1;
    try {
      await service.logout();
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) throw cause;
    }
    clear();
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        memberships: session?.memberships ?? [],
        csrfToken: session?.csrfToken ?? null,
        authenticated: session !== null,
        loading,
        error,
        refresh,
        login,
        logout,
        service,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
