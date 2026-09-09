interface ShutdownDependencies {
  closeHttp: () => Promise<void>;
  closeDatabase: () => Promise<void>;
}

export function createGracefulShutdown(dependencies: ShutdownDependencies) {
  let shutdown: Promise<void> | undefined;

  return (): Promise<void> => {
    shutdown ??= (async () => {
      let httpFailure: unknown;
      try {
        await dependencies.closeHttp();
      } catch (error) {
        httpFailure = error;
      }

      let databaseFailure: unknown;
      try {
        await dependencies.closeDatabase();
      } catch (error) {
        databaseFailure = error;
      }

      if (httpFailure !== undefined || databaseFailure !== undefined) {
        throw new Error("Runtime shutdown failed.", { cause: httpFailure ?? databaseFailure });
      }
    })();

    return shutdown;
  };
}
