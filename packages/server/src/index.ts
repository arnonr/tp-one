import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { database } from "./config/database";
import { redis } from "./config/redis";

const app = new Elysia()
  .use(cors())
  .use(database)
  .use(redis)
  .get("/api/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .listen(process.env.PORT || 3000);

console.log(`TP-One API running at http://localhost:${app.server!.port}`);
