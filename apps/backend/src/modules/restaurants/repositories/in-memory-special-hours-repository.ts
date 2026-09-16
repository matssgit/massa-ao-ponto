import { randomUUID } from "node:crypto";
import type { SpecialHour, SpecialHourInput, SpecialHoursRepository } from "./special-hours-repository.js";

export class InMemorySpecialHoursRepository implements SpecialHoursRepository {
  public items: SpecialHour[] = [];
  async findByRestaurantId(restaurantId: string) { return this.items.filter((item) => item.restaurantId === restaurantId).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)); }
  async findByIdAndRestaurantId(id: string, restaurantId: string) { return this.items.find((item) => item.id === id && item.restaurantId === restaurantId) ?? null; }
  async findByRestaurantIdAndDate(restaurantId: string, date: string) { return this.items.find((item) => item.restaurantId === restaurantId && item.date === date) ?? null; }
  async create(restaurantId: string, input: SpecialHourInput) {
    const now = new Date(); const item = { id: randomUUID(), restaurantId, ...input, createdAt: now, updatedAt: now };
    this.items.push(item); return item;
  }
  async update(id: string, restaurantId: string, input: Partial<SpecialHourInput>) {
    const item = await this.findByIdAndRestaurantId(id, restaurantId); if (!item) return null;
    Object.assign(item, input, { updatedAt: new Date() }); return item;
  }
  async delete(id: string, restaurantId: string) {
    const before = this.items.length; this.items = this.items.filter((item) => item.id !== id || item.restaurantId !== restaurantId); return this.items.length < before;
  }
}
