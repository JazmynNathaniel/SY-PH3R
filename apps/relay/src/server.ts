import cors from "@fastify/cors";
import Fastify from "fastify";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { RelayEnv } from "./config/env";
import { createSqliteStorage } from "./domain/storage";
import { healthRoutes } from "./routes/health";
import { v1Routes } from "./routes/v1";

export function buildServer(env: RelayEnv) {
  const dbPath = resolve(process.cwd(), env.DB_PATH);
  mkdirSync(dirname(dbPath), { recursive: true });
  const storage = createSqliteStorage({ dbPath });

  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  void app.register(cors, {
    origin: true
  });
  app.register(healthRoutes);
  app.register(v1Routes, { storage });

  return app;
}
