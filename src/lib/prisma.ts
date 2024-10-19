import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = env;

export const prisma = new PrismaClient({
  errorFormat: "pretty",
  datasourceUrl: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`,
  log: ["error", "info", "query", "warn"],
});
