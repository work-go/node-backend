import { PrismaClient } from "@prisma/client";

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;

export const prisma = new PrismaClient({
  errorFormat: "pretty",
  datasourceUrl: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`,
});
