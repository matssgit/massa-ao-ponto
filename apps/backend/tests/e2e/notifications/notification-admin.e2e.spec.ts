import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/db/index.js";
import { notificationDeliveries, restaurants } from "../../../src/db/schema/index.js";
import { app } from "../../../src/server.js";
import { useTestAuth } from "../../helpers/auth.js";

const auth = useTestAuth(app);
let restaurant: typeof restaurants.$inferSelect;
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { restaurant = await auth.createRestaurant({ name: "Notifications", address: "Rua A", timezone: "UTC" }); });

describe("Notification admin API", () => {
  it("lists only the OWNER tenant with filters and a safe projection", async () => {
    const [foreign] = await db.insert(restaurants).values({ name: "Foreign", address: "Rua B", timezone: "UTC" }).returning();
    try {
      await db.insert(notificationDeliveries).values([
        { restaurantId: restaurant.id, resourceId: randomUUID(), type: "ORDER_CREATED", status: "FAILED", errorCode: "PRIVATE provider body" },
        { restaurantId: foreign.id, resourceId: randomUUID(), type: "RESERVATION_CREATED", status: "SENT" },
      ]);
      const response = await app.inject({ url: `/restaurants/${restaurant.id}/notifications?status=FAILED&type=ORDER_CREATED`, headers: auth.headers });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ data: [{ type: "ORDER_CREATED", resourceType: "ORDER", status: "FAILED", attempts: 1, errorSummary: "Falha técnica no envio." }], meta: { total: 1 } });
      expect(response.body).not.toMatch(/phone|message|token|PRIVATE|restaurantId|errorCode/i);
      expect((await app.inject({ url: `/restaurants/${foreign.id}/notifications`, headers: auth.headers })).statusCode).toBe(404);
      await auth.grant(restaurant.id, "STAFF");
      expect((await app.inject({ url: `/restaurants/${restaurant.id}/notifications`, headers: auth.headers })).statusCode).toBe(403);
    } finally { await db.delete(restaurants).where(eq(restaurants.id, foreign.id)); }
  });
});
