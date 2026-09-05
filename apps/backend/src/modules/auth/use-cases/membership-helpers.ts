import {
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationRevokedError,
} from "../errors/membership-errors.js";
import type { MemberInvitation } from "../repositories/membership-repository.js";

export function paginationMeta(page: number, limit: number, total: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export function publicInvitation(invitation: MemberInvitation) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
  };
}

export function assertInvitationUsable(invitation: MemberInvitation, now: Date): void {
  if (invitation.revokedAt) throw new InvitationRevokedError();
  if (invitation.acceptedAt) throw new InvitationAlreadyUsedError();
  if (invitation.expiresAt <= now) throw new InvitationExpiredError();
}
