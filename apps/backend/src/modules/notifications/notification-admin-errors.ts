export class NotificationNotFoundError extends Error {
  constructor() { super("Notification not found."); this.name = "NotificationNotFoundError"; }
}

export class NotificationRetryConflictError extends Error {
  constructor() { super("Only FAILED notifications can be retried."); this.name = "NotificationRetryConflictError"; }
}
