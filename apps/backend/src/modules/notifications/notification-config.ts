import { z } from "zod";

const schema = z.object({
  PUBLIC_WEB_URL: z.string().trim().url().optional(),
});

export function readNotificationConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.parse(environment);
  if (!parsed.PUBLIC_WEB_URL) return { publicWebUrl: null } as const;

  const url = new URL(parsed.PUBLIC_WEB_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("PUBLIC_WEB_URL must be an HTTP(S) base URL without credentials, query or hash.");
  }

  return { publicWebUrl: url.toString().replace(/\/$/, "") } as const;
}
