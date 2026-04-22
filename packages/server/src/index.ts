import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { database } from "./config/database";
import { redis } from "./config/redis";
import { authPlugin } from "./modules/auth/auth.plugin";
import { workspacePlugin } from "./modules/workspace/workspace.plugin";
import { taskPlugin } from "./modules/task/task.plugin";
import { templatePlugin } from "./modules/template/template.plugin";
import { myWorkPlugin } from "./modules/my-work/my-work.plugin";
import { AppError } from "./shared/errors";

const app = new Elysia()
  .use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3019'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(database)
  .use(redis)
  .use(authPlugin)
  .use(workspacePlugin)
  .use(taskPlugin)
  .use(templatePlugin)
  .use(myWorkPlugin)
  .get("/api/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return { success: false, error: { code: error.code, message: error.message } };
    }
    console.error("Unhandled error:", error);
    set.status = 500;
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
  })
  .listen(process.env.PORT || 3019);

console.log(`TP-One API running at http://localhost:${app.server!.port}`);
