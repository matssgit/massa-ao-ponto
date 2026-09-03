export interface OwnerProvisioningRepository {
  createUser(input: { email: string; passwordHash: string }): Promise<{ id: string }>;
  createOwnerMembership(input: { userId: string; restaurantId: string }): Promise<{ id: string }>;
}
