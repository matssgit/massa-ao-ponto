import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: unknown[],
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function validateApiUrl(value: string | undefined): string {
  if (value === "/api" || value === "/api/") return "/api";

  try {
    const url = new URL(value ?? "");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error(
      "Configure VITE_API_URL como /api ou uma URL HTTP(S) pública, sem credenciais, query ou fragmento.",
    );
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  csrf?: boolean;
  credentials?: RequestCredentials;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal;
  allowEmptyResponse?: boolean;
};

export class ApiClient {
  private csrfToken: string | null = null;
  private revision = 0;
  private readonly unauthorized = new Set<() => void>();
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    this.baseUrl = validateApiUrl(baseUrl);
  }

  setCsrfToken(token: string | null) {
    this.csrfToken = token;
    this.revision += 1;
  }

  onUnauthorized(listener: () => void) {
    this.unauthorized.add(listener);
    return () => {
      this.unauthorized.delete(listener);
    };
  }

  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
      throw new Error("A API aceita somente caminhos relativos internos.");
    const method = options.method ?? "GET";
    const mutation = method !== "GET";
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined)
      headers.set("Content-Type", "application/json");
    if (mutation) {
      headers.set("X-Auth-Request", "1");
      if (options.csrf !== false) {
        if (!this.csrfToken)
          throw new ApiError(
            403,
            "MISSING_CSRF",
            "Atualize sua sessão antes de continuar.",
          );
        headers.set("X-CSRF-Token", this.csrfToken);
      }
    }
    const revision = this.revision;
    let response: Response;
    try {
      response = await this.transport(`${this.baseUrl}${path}`, {
        method,
        headers,
        credentials: options.credentials ?? "include",
        referrerPolicy: options.referrerPolicy,
        cache: "no-store",
        redirect: "error",
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Não foi possível conectar à API. Verifique a conexão e tente novamente.",
      );
    }
    if (
      response.status === 401 &&
      options.csrf !== false &&
      revision === this.revision
    ) {
      this.unauthorized.forEach((listener) => listener());
    }
    if (response.status === 204 && response.ok) return undefined;
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const retryHeader = response.headers.get("Retry-After");
      const retryValue = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : retryHeader ? Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000) : NaN;
      const retryAfterSeconds = Number.isFinite(retryValue) ? Math.max(0, retryValue) : undefined;
      const parsed = errorSchema.safeParse(payload);
      throw parsed.success
        ? new ApiError(
            response.status,
            parsed.data.code,
            parsed.data.message,
            parsed.data.issues,
            retryAfterSeconds,
          )
        : new ApiError(
            response.status,
            "HTTP_ERROR",
            "A API não pôde concluir a solicitação.",
          );
    }
    if (payload === undefined && options.allowEmptyResponse) return undefined;
    if (payload === undefined)
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "A API retornou uma resposta inesperada.",
      );
    return payload;
  }
}
