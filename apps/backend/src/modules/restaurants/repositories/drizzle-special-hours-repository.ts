import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { restaurantSpecialHours } from "../../../db/schema/index.js";
import type { SpecialHourInput, SpecialHoursRepository } from "./special-hours-repository.js";
import { SpecialHourConflictError } from "../errors/special-hours-errors.js";

function throwConflict(error: unknown): never {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint_name" in cause
    && cause.code === "23505" && cause.constraint_name === "restaurant_special_hours_restaurant_date_unique") {
    throw new SpecialHourConflictError();
  }
  throw error;
}

export class DrizzleSpecialHoursRepository implements SpecialHoursRepository {
  async findByRestaurantId(restaurantId: string) {
    return db.select().from(restaurantSpecialHours).where(eq(restaurantSpecialHours.restaurantId, restaurantId)).orderBy(asc(restaurantSpecialHours.date), asc(restaurantSpecialHours.id));
  }
  async findByIdAndRestaurantId(id: string, restaurantId: string) {
    const [item] = await db.select().from(restaurantSpecialHours).where(and(eq(restaurantSpecialHours.id, id), eq(restaurantSpecialHours.restaurantId, restaurantId)));
    return item ?? null;
  }
  async findByRestaurantIdAndDate(restaurantId: string, date: string) {
    const [item] = await db.select().from(restaurantSpecialHours).where(and(eq(restaurantSpecialHours.restaurantId, restaurantId), eq(restaurantSpecialHours.date, date)));
    return item ?? null;
  }
  async create(restaurantId: string, input: SpecialHourInput) {
    try {
      const [item] = await db.insert(restaurantSpecialHours).values({ restaurantId, ...input }).returning();
      return item;
    } catch (error) {
      return throwConflict(error);
    }
  }
  async update(id: string, restaurantId: string, input: Partial<SpecialHourInput>) {
    try {
      const [item] = await db.update(restaurantSpecialHours).set({ ...input, updatedAt: new Date() }).where(and(eq(restaurantSpecialHours.id, id), eq(restaurantSpecialHours.restaurantId, restaurantId))).returning();
      return item ?? null;
    } catch (error) {
      return throwConflict(error);
    }
  }
  async delete(id: string, restaurantId: string) {
    const deleted = await db.delete(restaurantSpecialHours).where(and(eq(restaurantSpecialHours.id, id), eq(restaurantSpecialHours.restaurantId, restaurantId))).returning({ id: restaurantSpecialHours.id });
    return deleted.length > 0;
  }
}
