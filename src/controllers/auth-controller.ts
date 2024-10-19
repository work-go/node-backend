import { hash, verify } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";
import { z } from "zod";
import { auth } from "../lib/auth";
import { createSessionJwt, validateSessionJwt } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { AuthenticationError } from "../shared/errors/authentication-error";
import { LoginSchema, RegisterSchema } from "../shared/schemas/auth-schema";

export interface SessionJwt {
  sessionId: string;
}

class AuthUtils {
  public static async createSessionToken(userId: string) {
    const existingSessions = await auth.getUserSessions(userId);

    const session = existingSessions.length > 0 ? existingSessions[0] : await auth.createSession(userId, { id: userId });

    return await createSessionJwt({ sessionId: session.id });
  }
}

export class AuthController {
  public static async register({ email, password }: z.infer<typeof RegisterSchema>) {
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

    const sessionToken = await AuthUtils.createSessionToken(user.id);

    return { user, sessionToken };
  }

  public static async login({ email, password }: z.infer<typeof LoginSchema>) {
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user || !user.passwordHash) throw new Error("Invalid email or password");

    const isValidPassword = await verify(user.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!isValidPassword) throw new AuthenticationError("Invalid email or password");

    const sessionToken = await AuthUtils.createSessionToken(user.id);

    return {
      sessionToken,
      user,
    };
  }

  public static async verifySessionToken(bearerSessionToken: string | string[] | undefined) {
    const authenticationError = new AuthenticationError("Please authenticate yourself");

    if (typeof bearerSessionToken !== "string") throw authenticationError;

    const sessionToken = auth.readBearerToken(bearerSessionToken);

    if (!sessionToken) throw authenticationError;

    const { payload } = await validateSessionJwt(sessionToken).catch((error) => {
      throw authenticationError;
    });

    const sessionId = (payload as SessionJwt).sessionId;

    if (!sessionId) throw authenticationError;

    const { user: sessionUser } = await auth.validateSession(sessionId).catch(() => {
      throw authenticationError;
    });

    if (!sessionUser) throw authenticationError;

    const user = await prisma.user.findFirst({
      where: { email: sessionUser.email },
    });

    if (!user) throw authenticationError;

    return { user, sessionToken };
  }
}
