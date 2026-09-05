import type { FastifyReply, FastifyRequest } from "fastify";

import { readAuthConfig } from "../auth-config.js";
import { UnauthenticatedError } from "../errors/auth-errors.js";
import { Argon2PasswordHasher } from "../password-hasher.js";
import { DrizzleMembershipRepository } from "../repositories/drizzle-membership-repository.js";
import {
  acceptExistingUserInvitationBodySchema,
  acceptNewUserInvitationBodySchema,
  createInvitationBodySchema,
  invitationParamsSchema,
  listInvitationsQuerySchema,
  listMembersQuerySchema,
  memberParamsSchema,
  restaurantParamsSchema,
  updateMembershipBodySchema,
} from "../schemas/membership.schema.js";
import { DrizzleMembershipTransactionManager } from "../transactions/drizzle-membership-transaction-manager.js";
import { AcceptExistingUserInvitationUseCase } from "../use-cases/accept-existing-user-invitation.use-case.js";
import { AcceptNewUserInvitationUseCase } from "../use-cases/accept-new-user-invitation.use-case.js";
import { CreateMemberInvitationUseCase } from "../use-cases/create-member-invitation.use-case.js";
import { ListMemberInvitationsUseCase } from "../use-cases/list-member-invitations.use-case.js";
import { ListMembersUseCase } from "../use-cases/list-members.use-case.js";
import { RevokeMemberInvitationUseCase } from "../use-cases/revoke-member-invitation.use-case.js";
import { UpdateMembershipUseCase } from "../use-cases/update-membership.use-case.js";

function actor(request: FastifyRequest) {
  if (!request.authContext) throw new UnauthenticatedError();
  return request.authContext;
}

export async function listMembersController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = restaurantParamsSchema.parse(request.params);
  const query = listMembersQuerySchema.parse(request.query);
  const result = await new ListMembersUseCase(new DrizzleMembershipRepository()).execute({
    restaurantId,
    ...query,
  });
  return reply.status(200).send(result);
}

export async function updateMembershipController(request: FastifyRequest, reply: FastifyReply) {
  const params = memberParamsSchema.parse(request.params);
  const changes = updateMembershipBodySchema.parse(request.body);
  const result = await new UpdateMembershipUseCase(
    new DrizzleMembershipTransactionManager(),
  ).execute({ ...params, ...changes });
  return reply.status(200).send(result);
}

export async function createMemberInvitationController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = restaurantParamsSchema.parse(request.params);
  const { email } = createInvitationBodySchema.parse(request.body);
  const config = readAuthConfig();
  const result = await new CreateMemberInvitationUseCase(
    new DrizzleMembershipTransactionManager(),
    config.invitationLifetimeMs,
  ).execute({ restaurantId, email, createdByUserId: actor(request).userId });
  return reply.status(201).send(result);
}

export async function listMemberInvitationsController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = restaurantParamsSchema.parse(request.params);
  const query = listInvitationsQuerySchema.parse(request.query);
  const result = await new ListMemberInvitationsUseCase(
    new DrizzleMembershipRepository(),
  ).execute({ restaurantId, ...query });
  return reply.status(200).send(result);
}

export async function revokeMemberInvitationController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, invitationId } = invitationParamsSchema.parse(request.params);
  await new RevokeMemberInvitationUseCase(
    new DrizzleMembershipTransactionManager(),
  ).execute(restaurantId, invitationId);
  return reply.status(204).send();
}

export async function acceptNewUserInvitationController(request: FastifyRequest, reply: FastifyReply) {
  const input = acceptNewUserInvitationBodySchema.parse(request.body);
  const repository = new DrizzleMembershipRepository();
  const result = await new AcceptNewUserInvitationUseCase(
    repository,
    new DrizzleMembershipTransactionManager(),
    new Argon2PasswordHasher(),
  ).execute(input);
  return reply.status(201).send(result);
}

export async function acceptExistingUserInvitationController(request: FastifyRequest, reply: FastifyReply) {
  const input = acceptExistingUserInvitationBodySchema.parse(request.body);
  if (!request.authenticatedUserId) throw new UnauthenticatedError();
  const result = await new AcceptExistingUserInvitationUseCase(
    new DrizzleMembershipTransactionManager(),
  ).execute({ ...input, userId: request.authenticatedUserId });
  return reply.status(201).send(result);
}
