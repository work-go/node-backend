import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  errorFormat: "pretty",
  datasourceUrl: "postgresql://admin:password@postgres:5432/workgo",
});
