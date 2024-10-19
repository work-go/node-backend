import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hash, verify } from "@node-rs/argon2";
import { auth } from "../lib/auth";
import { generateIdFromEntropySize } from "lucia";
import { createSessionJwt, validateSessionJwt } from "../lib/jwt";
import { safeTryAsync } from "../lib/safe-try";
import { LoginSchema, RegisterSchema } from "../shared/schemas/auth-schema";
import { HttpError } from "../shared/errors/http-error";

export interface SessionJwt {
  sessionId: string;
}

class AuthUtils {
  public static async createSessionToken(userId: string) {
    const existingSessions = await auth.getUserSessions(userId);

    const session =
      existingSessions.length > 0
        ? existingSessions[0]
        : await auth.createSession(userId, { id: userId });

    return await createSessionJwt({ sessionId: session.id });
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
    }).catch((error) => {
      throw new HttpError(
        error instanceof Error ? error.message : "Unable to store password",
        { statusCode: 401 }
      );
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

    if (!user || !user.passwordHash)
      throw new Error("Invalid email or password");

    const isValidPassword = await verify(user.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!isValidPassword)
      throw new HttpError("Invalid email or password", { statusCode: 401 });

    const sessionToken = await AuthUtils.createSessionToken(user.id);

    return {
      sessionToken,
      user,
    };
  }

  public static async verifySessionToken(
    sessionToken: string | string[] | undefined
  ) {
    if (typeof sessionToken !== "string")
      throw new HttpError("Please authenticate yourself", {
        statusCode: 401,
      });

    const jwt = auth.readBearerToken(sessionToken);

    if (!jwt)
      throw new HttpError("Please authenticate yourself", {
        statusCode: 401,
      });

    const { payload } = await validateSessionJwt(jwt).catch((error) => {
      throw new HttpError(
        error instanceof Error ? error.message : "Please authenticate yourself",
        { statusCode: 401 }
      );
    });

    const sessionId = (payload as SessionJwt).sessionId;

    if (!sessionId)
      throw new HttpError("Please authenticate yourself", {
        statusCode: 401,
      });

    const { user: sessionUser } = await auth
      .validateSession(sessionId)
      .catch((error) => {
        throw new HttpError(
          error instanceof Error
            ? error.message
            : "Please authenticate yourself",
          { statusCode: 401 }
        );
      });

    if (!sessionUser)
      throw new HttpError("Please authenticate yourself", {
        statusCode: 401,
      });

    const user = await prisma.user.findFirst({
      where: { email: sessionUser.email },
    });

    if (!user)
      throw new HttpError("Please authenticate yourself", {
        statusCode: 401,
      });

    return user;
  }
}
