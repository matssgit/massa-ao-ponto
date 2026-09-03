import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Brand } from "../components/brand";
import { useAuth } from "../features/auth/auth-state";
import { authErrorMessage } from "../features/auth/auth-service";
import { isOwner, useRestaurant } from "../features/auth/restaurant-state";
import { navigation } from "./navigation";

export function AppShell() {
  const { user, memberships, logout, refresh } = useAuth();
  const { membership, restaurantId, restaurants, selectRestaurant } =
    useRestaurant();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      await logout();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#content">
        Pular para o conteúdo
      </a>
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`} id="navigation">
        <Brand />
        <p className="sidebar-caption">ÁREA DE GESTÃO</p>
        <nav aria-label="Navegação principal">
          {navigation
            .filter((item) => !item.ownerOnly || isOwner(membership))
            .map((item, index) => (
              <NavLink key={item.path} to={item.path} end={item.path === "/"}>
                <span className="nav-number" aria-hidden="true">
                  0{index + 1}
                </span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="accent-dot" /> Massa ao Ponto
          <p>Feito para cuidar da casa.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <button
            className="menu-toggle secondary"
            aria-expanded={menuOpen}
            aria-controls="navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu
          </button>
          <div className="restaurant-picker">
            <label htmlFor="restaurant">RESTAURANTE</label>
            <select
              id="restaurant"
              value={restaurantId ?? ""}
              onChange={(event) => selectRestaurant(event.target.value)}
              disabled={!memberships.length}
            >
              {!restaurantId && (
                <option value="" disabled>
                  {memberships.length
                    ? "Selecione um restaurante"
                    : "Nenhum restaurante vinculado"}
                </option>
              )}
              {memberships.map((item) => (
                <option key={item.restaurantId} value={item.restaurantId}>
                  {restaurants.find(
                    (restaurant) => restaurant.id === item.restaurantId,
                  )?.name ?? `Restaurante · ${item.restaurantId}`}
                </option>
              ))}
            </select>
          </div>
          <div className="user-menu">
            <div className="user-details">
              <span title={user?.email}>{user?.email}</span>
              <small>
                {membership
                  ? isOwner(membership)
                    ? "Proprietário"
                    : "Equipe de operação"
                  : "Equipe"}
              </small>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void signOut()}
            >
              {busy ? "Saindo…" : "Sair"}
            </button>
          </div>
        </header>
        {error && (
          <div className="session-warning">
            <p role="alert" className="error">
              {error}
            </p>
            <button className="secondary" onClick={() => void refresh()}>
              Atualizar sessão
            </button>
          </div>
        )}
        <main id="content" tabIndex={-1} key={restaurantId}>
          {!memberships.length ? (
            <section className="section-page">
              <h1>Seu acesso está pronto.</h1>
              <p>
                Nenhum restaurante está vinculado à sua conta. Solicite uma
                membership ao administrador.
              </p>
              <button className="secondary" onClick={() => void refresh()}>
                Verificar acesso novamente
              </button>
            </section>
          ) : !restaurantId ? (
            <section className="section-page">
              <h1>Qual casa vamos acompanhar?</h1>
              <p>Selecione um restaurante no cabeçalho para continuar.</p>
            </section>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          Massa ao Ponto <span>Gestão com cuidado.</span>
        </footer>
      </div>
    </div>
  );
}
