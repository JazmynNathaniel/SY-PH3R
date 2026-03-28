import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4300),
  HOST: z.string().min(1).default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_SECRET: z.string().min(24, "SESSION_SECRET must be at least 24 characters"),
  DB_PATH: z.string().min(1).default("./data/sy-ph3r.db")
});

export type RelayEnv = z.infer<typeof envSchema>;

export function loadEnv(rawEnv: NodeJS.ProcessEnv): RelayEnv {
  return envSchema.parse(rawEnv);
}
