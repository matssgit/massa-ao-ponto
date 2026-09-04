import { Navigate, Outlet, Route, Routes } from "react-router";
import { Brand } from "../components/brand";
import { AuthProvider } from "../features/auth/auth-context";
import { useAuth } from "../features/auth/auth-state";
import { AuthService } from "../features/auth/auth-service";
import { RestaurantProvider } from "../features/auth/restaurant-context";
import { isOwner, useRestaurant } from "../features/auth/restaurant-state";
import { LoginPage } from "../pages/login-page";
import { SectionPage } from "../pages/section-page";
import { AppShell } from "./app-shell";
import { navigation } from "./navigation";
import { DashboardPage } from "../features/dashboard/dashboard-page";
import { OrdersPage } from "../features/orders/orders-page";
import { ReservationsPage } from "../features/reservations/reservations-page";
import { CustomersPage } from "../features/customers/customers-page";
import { CatalogPage } from "../features/catalog/catalog-page";
import { TablesPage } from "../features/tables/tables-page";
import { RestaurantSettingsPage } from "../features/restaurant-settings/restaurant-settings-page";

function ProtectedRoutes() {
  const { authenticated, user } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return (
    <RestaurantProvider key={user?.id}>
      <AppShell />
    </RestaurantProvider>
  );
}

function OwnerOnly() {
  const { membership } = useRestaurant();
  return isOwner(membership) ? <Outlet /> : <Navigate to="/" replace />;
}

function AuthRoutes() {
  const { loading, error, authenticated, refresh } = useAuth();
  if (loading)
    return (
      <main className="connection-state">
        <Brand />
        <p role="status">Verificando seu acesso…</p>
      </main>
    );
  if (error)
    return (
      <main className="connection-state">
        <Brand />
        <h1>Não conseguimos verificar sua sessão.</h1>
        <p role="alert">{error}</p>
        <button className="primary" onClick={() => void refresh()}>
          Tentar novamente
        </button>
      </main>
    );
  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/reservas" element={<ReservationsPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        {navigation
          .filter((item) => !item.ownerOnly && !["/", "/pedidos", "/reservas", "/clientes"].includes(item.path))
          .map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<SectionPage title={item.label} detail={item.detail} />}
            />
          ))}
        <Route element={<OwnerOnly />}>
          <Route path="/cardapio" element={<CatalogPage />} />
          <Route path="/mesas" element={<TablesPage />} />
          <Route path="/configuracoes" element={<RestaurantSettingsPage />} />
          {navigation
            .filter((item) => item.ownerOnly && !["/cardapio", "/mesas", "/configuracoes"].includes(item.path))
            .map((item) => (
              <Route
                key={item.path}
                path={item.path}
                element={
                  <SectionPage title={item.label} detail={item.detail} />
                }
              />
            ))}
        </Route>
        <Route
          path="*"
          element={
            <section className="section-page">
              <h1>Página não encontrada</h1>
              <a href="/">Voltar à visão geral</a>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}

export function App({ service }: { service: AuthService }) {
  return (
    <AuthProvider service={service}>
      <AuthRoutes />
    </AuthProvider>
  );
}
