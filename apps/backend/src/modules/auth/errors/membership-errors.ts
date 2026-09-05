export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found.");
    this.name = "MemberNotFoundError";
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitation not found.");
    this.name = "InvitationNotFoundError";
  }
}

export class LastActiveOwnerError extends Error {
  constructor() {
    super("The restaurant must keep at least one active owner.");
    this.name = "LastActiveOwnerError";
  }
}

export class MemberAlreadyExistsError extends Error {
  constructor() {
    super("This user is already a member of the restaurant.");
    this.name = "MemberAlreadyExistsError";
  }
}

export class InvitationAlreadyPendingError extends Error {
  constructor() {
    super("A pending invitation already exists for this email.");
    this.name = "InvitationAlreadyPendingError";
  }
}

export class InvitationInvalidError extends Error {
  constructor() {
    super("The invitation is invalid.");
    this.name = "InvitationInvalidError";
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super("The invitation has expired.");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationAlreadyUsedError extends Error {
  constructor() {
    super("The invitation has already been used.");
    this.name = "InvitationAlreadyUsedError";
  }
}

export class InvitationRevokedError extends Error {
  constructor() {
    super("The invitation has been revoked.");
    this.name = "InvitationRevokedError";
  }
}
