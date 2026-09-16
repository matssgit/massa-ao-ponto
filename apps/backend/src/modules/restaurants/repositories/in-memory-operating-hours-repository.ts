import { randomUUID } from "node:crypto";
import type { OperatingHour, OperatingHourInput, OperatingHoursRepository } from "./operating-hours-repository.js";

export class InMemoryOperatingHoursRepository implements OperatingHoursRepository {
  public items: OperatingHour[] = [];

  async findByRestaurantId(restaurantId: string) {
    return this.items.filter((item) => item.restaurantId === restaurantId).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async replaceWeek(restaurantId: string, days: OperatingHourInput[]) {
    this.items = this.items.filter((item) => item.restaurantId !== restaurantId);
    const created = days.map((day) => ({ id: randomUUID(), restaurantId, ...day }));
    this.items.push(...created);
    return created.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }
}
