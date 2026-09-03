import { useState, type FormEvent } from "react";
import { Brand } from "../components/brand";
import { useAuth } from "../features/auth/auth-state";
import { authErrorMessage } from "../features/auth/auth-service";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="Massa ao Ponto Gestão">
        <Brand />
        <div className="login-title">
          <p className="eyebrow">GESTÃO DA PIZZARIA</p>
          <h1>
            O cuidado está
            <br />
            em cada detalhe<span>.</span>
          </h1>
          <p>
            Seu espaço para acompanhar a casa,
            <br />
            do primeiro pedido à última mesa.
          </p>
        </div>
        <p className="story-footer">
          Massa ao Ponto <span>•</span> Área da equipe
        </p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <p className="eyebrow">BEM-VINDO DE VOLTA</p>
          <h2 id="login-title">Entre na sua conta</h2>
          <p className="muted">Use o acesso fornecido pelo administrador.</p>
          <form onSubmit={submit} aria-busy={busy}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              aria-describedby={error ? "login-error" : undefined}
            />
            {error && (
              <p id="login-error" className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="login-help">
            Precisa de acesso? Fale com o responsável pela pizzaria.
          </p>
        </div>
        <p className="login-footnote">Acesso restrito à equipe autorizada.</p>
      </section>
    </main>
  );
}
