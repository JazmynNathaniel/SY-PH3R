import { loadEnv } from "./config/env";
import { buildServer } from "./server";

async function start() {
  const env = loadEnv(process.env);
  const app = buildServer(env);

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
