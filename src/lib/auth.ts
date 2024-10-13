import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma";
import { z } from "zod";
import { Google } from "arctic";

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
});

export const google = new Google(
  process.env.OAUTH_GOOGLE_CLIENT_ID!,
  process.env.OAUTH_GOOGLE_CLIENT_SECRET!,
  `${process.env.FRONTEND_URL}/auth/google/callback`
);

export const isValidEmail = (email: string) =>
  z.string().email().safeParse(email).success;

// IMPORTANT!
declare module "lucia" {
  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: string;
  email: string;
}
