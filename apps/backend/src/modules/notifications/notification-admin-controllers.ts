import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { notificationStatusEnum, notificationTypeEnum } from "../../db/schema/notification-deliveries.js";
import { DrizzleNotificationRepository } from "./drizzle-notification-repository.js";
import { ListNotificationsUseCase, RetryNotificationUseCase } from "./notification-admin-use-cases.js";
import { makeWhatsAppProvider } from "./notification-factory.js";
const params = z.object({ restaurantId: z.uuid() });
const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(notificationStatusEnum.enumValues).optional(),
  type: z.enum(notificationTypeEnum.enumValues).optional(),
});
export async function listNotificationsController(request: FastifyRequest, reply: FastifyReply) {
  const input = { ...params.parse(request.params), ...query.parse(request.query) };
  return reply.send(await new ListNotificationsUseCase(new DrizzleNotificationRepository()).execute(input));
}
export async function retryNotificationController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, notificationId } = params.extend({ notificationId: z.uuid() }).parse(request.params);
  z.object({}).strict().parse(request.body ?? {});
  return reply.send(await new RetryNotificationUseCase(new DrizzleNotificationRepository(), makeWhatsAppProvider(request.log)).execute(restaurantId, notificationId));
}
