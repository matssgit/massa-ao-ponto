interface CancellableQuery extends PromiseLike<unknown> {
  cancel(): void;
}

export async function waitForDatabaseQuery(
  query: CancellableQuery,
  timeoutMs: number,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      query,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          query.cancel();
          reject(new Error("Database readiness check timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
