import { createContext, useContext } from "react";
import type { AuthService, Session } from "./auth-service";

interface AuthState {
  user: Session["user"] | null;
  memberships: Session["memberships"];
  csrfToken: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  service: AuthService;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requer AuthProvider.");
  return context;
}
