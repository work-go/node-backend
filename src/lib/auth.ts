import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma";
import { z } from "zod";

export const auth = new Lucia(new PrismaAdapter(prisma.session, prisma.user), {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (user) => ({
    id: user.id,
    email: user.email,
  }),
  getSessionAttributes: (session) => ({
    id: session.id,
  }),
});

export const isValidEmail = (email: string) =>
  z.string().email().safeParse(email).success;

// IMPORTANT!
declare module "lucia" {
  interface Register {
    Lucia: typeof auth;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseSessionAttributes {
  id: string;
}
interface DatabaseUserAttributes {
  id: string;
  email: string;
}