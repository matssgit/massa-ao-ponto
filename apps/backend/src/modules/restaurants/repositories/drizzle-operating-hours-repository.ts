import { asc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { restaurantOperatingHours } from "../../../db/schema/index.js";
import type { OperatingHourInput, OperatingHoursRepository } from "./operating-hours-repository.js";

export class DrizzleOperatingHoursRepository implements OperatingHoursRepository {
  async findByRestaurantId(restaurantId: string) {
    return db.select().from(restaurantOperatingHours).where(eq(restaurantOperatingHours.restaurantId, restaurantId)).orderBy(asc(restaurantOperatingHours.dayOfWeek));
  }

  async replaceWeek(restaurantId: string, days: OperatingHourInput[]) {
    return db.transaction(async (tx) => {
      await tx.delete(restaurantOperatingHours).where(eq(restaurantOperatingHours.restaurantId, restaurantId));
      return tx.insert(restaurantOperatingHours).values(days.map((day) => ({ restaurantId, ...day }))).returning();
    });
  }
}
