import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/app";
import { AuthService } from "./features/auth/auth-service";
import { ApiClient, validateApiUrl } from "./lib/api-client";
import "./app/styles.css";

const element = document.getElementById("root");
if (!element) throw new Error("Elemento root ausente.");
const root = createRoot(element);
try {
  const service = new AuthService(
    new ApiClient(validateApiUrl(import.meta.env.VITE_API_URL)),
  );
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App service={service} />
      </BrowserRouter>
    </StrictMode>,
  );
} catch (error) {
  root.render(
    <main className="connection-state">
      <h1>Configuração do frontend pendente</h1>
      <p role="alert">
        {error instanceof Error
          ? error.message
          : "Verifique a configuração da API."}
      </p>
    </main>,
  );
}
