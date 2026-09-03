import { db } from "../../../db/index.js";
import { users, restaurantMemberships } from "../../../db/schema/index.js";
import { OwnerEmailAlreadyExistsError, OwnerMembershipAlreadyExistsError } from "../errors/owner-provisioning-errors.js";
import type { OwnerProvisioningRepository } from "./owner-provisioning-repository.js";

export class DrizzleOwnerProvisioningRepository implements OwnerProvisioningRepository {
  constructor(private readonly client: Pick<typeof db, "insert"> = db) {}

  async createUser(input: { email: string; passwordHash: string }): Promise<{ id: string }> {
    const [user] = await this.client.insert(users)
      .values({ ...input, active: true })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    if (!user) throw new OwnerEmailAlreadyExistsError();
    return user;
  }

  async createOwnerMembership(input: { userId: string; restaurantId: string }): Promise<{ id: string }> {
    const [membership] = await this.client.insert(restaurantMemberships)
      .values({ ...input, role: "OWNER", active: true })
      .onConflictDoNothing({ target: [restaurantMemberships.userId, restaurantMemberships.restaurantId] })
      .returning({ id: restaurantMemberships.id });
    if (!membership) throw new OwnerMembershipAlreadyExistsError();
    return membership;
  }
}
