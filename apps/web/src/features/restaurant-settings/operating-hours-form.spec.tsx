import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { emptyOperatingWeek } from "../../lib/operating-hours";
import { OperatingHoursForm } from "./operating-hours-form";
import { RestaurantSettingsService } from "./restaurant-settings-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";

describe("OperatingHoursForm", () => {
  it("loads the compatibility default and saves the complete typed week once", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? "GET") === "GET") return Response.json({ configured: false, days: emptyOperatingWeek() });
      return Response.json({ configured: true, ...JSON.parse(String(init?.body)) });
    });
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    render(<OperatingHoursForm restaurantId={restaurantId} service={new RestaurantSettingsService(client)} />);
    expect(await screen.findByText(/sem configuração/i)).toBeTruthy();
    await userEvent.click(screen.getByLabelText("Segunda-feira"));
    await userEvent.clear(screen.getByLabelText("Segunda-feira abre"));
    await userEvent.type(screen.getByLabelText("Segunda-feira abre"), "10:00");
    await userEvent.clear(screen.getByLabelText("Segunda-feira fecha"));
    await userEvent.type(screen.getByLabelText("Segunda-feira fecha"), "22:00");
    await userEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(await screen.findByText("Horários de funcionamento atualizados.")).toBeTruthy();
    const request = transport.mock.calls.find(([, init]) => init?.method === "PUT");
    const body = JSON.parse(String(request?.[1]?.body)) as { days: unknown[] };
    expect(body.days).toHaveLength(7);
    expect(body.days[1]).toEqual({ dayOfWeek: 1, active: true, opensAt: "10:00", closesAt: "22:00" });
  });
});
