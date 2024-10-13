import { z } from "zod";
import { LoginSchema, RegisterSchema } from "../schemas/shared/auth-schema";
import { prisma } from "../lib/prisma";
import { hash, verify } from "@node-rs/argon2";
import { auth } from "../lib/auth";
import { generateIdFromEntropySize } from "lucia";

class AuthUtils {
  public static async createSessionCookie(userId: string) {
    const existingSessions = await auth.getUserSessions(userId);

    const session =
      existingSessions.length > 0
        ? existingSessions[0]
        : await auth.createSession(userId, { id: userId });

    const sessionCookie = auth.createSessionCookie(session.id);

    return sessionCookie;
  }
}

export class AuthController {
  public static async register({
    email,
    password,
  }: z.infer<typeof RegisterSchema>) {
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const userId = generateIdFromEntropySize(10);

    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
      },
    });

    return { user, sessionCookie: await AuthUtils.createSessionCookie(userId) };
  }

  public static async login({ email, password }: z.infer<typeof LoginSchema>) {
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user || !user.passwordHash)
      throw new Error("Invalid email or password");

    const isValidPassword = await verify(user.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!isValidPassword) throw new Error("Invalid email or password");

    return {
      sessionCookie: await AuthUtils.createSessionCookie(user.id),
      user,
    };
  }
}
