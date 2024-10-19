import { generateCodeVerifier, generateState } from "arctic";
import { auth, google } from "../lib/auth";
import { HttpError } from "../shared/errors/http-error";
import { ofetch } from "ofetch";
import { GoogleCallbackUserSchema } from "../shared/schemas/auth-schema";
import { prisma } from "../lib/prisma";
import { createSessionJwt } from "../lib/jwt";
import { generateIdFromEntropySize } from "lucia";

export class GoogleOauthController {
  public static async createAuthroizationUrl() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const authorizationUrl = await google.createAuthorizationURL(state, codeVerifier, {
      scopes: ["profile", "email"],
    });

    return { authorizationUrl: authorizationUrl.toString(), codeVerifier };
  }

  public static async login({
    code,
    codeVerifierAuthorizationHeader,
  }: {
    code: string;
    codeVerifierAuthorizationHeader: string | string[] | undefined;
  }) {
    if (typeof codeVerifierAuthorizationHeader !== "string") throw new HttpError("Code verifier not found", { statusCode: 401 });

    const codeVerifier = auth.readBearerToken(codeVerifierAuthorizationHeader);

    if (!codeVerifier) throw new HttpError("Code verifier not found", { statusCode: 401 });

    const tokens = await google.validateAuthorizationCode(code, codeVerifier).catch(() => {
      throw new HttpError("Unable to authenticate Google Profile", {
        statusCode: 401,
      });
    });

    const googleUserResponse = await ofetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      params: {
        access_token: tokens.accessToken,
      },
    }).catch(() => {
      throw new HttpError("Unable to authenticate Google Profile", {
        statusCode: 401,
      });
    });

    const googleUser = GoogleCallbackUserSchema.parse(googleUserResponse);

    if (!googleUser.email_verified)
      throw new HttpError("Unable to authenticate Google Profile", {
        statusCode: 401,
      });

    const existingUser = await prisma.user.findFirst({
      where: { email: googleUser.email },
      select: { id: true },
    });

    const createSessionTokenByUserId = async (userId: string) => {
      const existingSessions = await auth.getUserSessions(userId);
      const session = existingSessions.length > 0 ? existingSessions[0] : await auth.createSession(userId, {});

      return createSessionJwt({ sessionId: session.id });
    };

    if (existingUser) {
      const token = await createSessionTokenByUserId(existingUser.id);
      return { user: existingUser, token };
    }

    const userId = generateIdFromEntropySize(10);

    const user = await prisma.user.create({
      data: { id: userId, email: googleUser.email },
    });

    const token = await createSessionTokenByUserId(userId);
    return { user, token };
  }
}
