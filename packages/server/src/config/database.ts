import { Elysia } from "elysia";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { config } from "./env";

const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });

export const database = new Elysia({ name: "database" }).decorate({ db });
