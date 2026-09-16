import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { RestaurantSettingsService } from "./restaurant-settings-service";
import { SpecialHoursForm } from "./special-hours-form";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const timestamps = { createdAt: "2030-01-01T12:00:00.000Z", updatedAt: "2030-01-01T12:00:00.000Z" };

describe("SpecialHoursForm", () => {
  it("creates a closed date, edits it to an open interval and deletes it", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return Response.json([]);
      if (method === "DELETE") return new Response(null, { status: 204 });
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id, restaurantId, ...body, ...timestamps });
    });
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    render(<SpecialHoursForm restaurantId={restaurantId} timezone="America/Sao_Paulo" service={new RestaurantSettingsService(client)} />);
    expect(await screen.findByText(/nenhuma data especial futura/i)).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Data"), "2030-12-25");
    await userEvent.type(screen.getByLabelText("Rótulo opcional"), "Natal");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar data" }));
    expect(await screen.findByText("Data especial criada.")).toBeTruthy();
    expect(screen.getByText("Fechado")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByLabelText("Restaurante fechado"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar alteração" }));
    expect(await screen.findByText("Data especial atualizada.")).toBeTruthy();
    expect(screen.getByText("09:00–18:00")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText("Data especial excluída.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Natal")).toBeNull());
    expect(transport.mock.calls.map(([, init]) => init?.method ?? "GET")).toEqual(["GET", "POST", "PATCH", "DELETE"]);
  });
});
