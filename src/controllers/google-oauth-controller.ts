import { generateCodeVerifier, generateState } from "arctic";
import { auth, google } from "../lib/auth";
import { HttpError } from "../shared/errors/http-error";
import { ofetch } from "ofetch";
import { GoogleCallbackUserSchema } from "../shared/schemas/auth-schema";
import { prisma } from "../lib/prisma";
import { createSessionJwt } from "../lib/jwt";
import { generateIdFromEntropySize } from "lucia";
import { AuthenticationError } from "../shared/errors/authentication-error";

export class GoogleOauthController {
  public static async createAuthroizationUrl() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    console.log("generated code verifier", codeVerifier);

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
    if (typeof codeVerifierAuthorizationHeader !== "string") throw new AuthenticationError("Code verifier not found");

    const codeVerifier = auth.readBearerToken(codeVerifierAuthorizationHeader);

    console.log("generated code verifier", codeVerifier);
    console.log("code", code);

    if (!codeVerifier) throw new AuthenticationError("Code verifier not found");

    const tokens = await google.validateAuthorizationCode(code, codeVerifier).catch(() => {
      throw new AuthenticationError("Unable to authenticate Google Profile");
    });

    console.log("tokens");

    const googleUserResponse = await ofetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      params: {
        access_token: tokens.accessToken,
      },
    }).catch(() => {
      throw new AuthenticationError("Unable to authenticate Google Profile");
    });

    console.log("googleUserResponse", googleUserResponse);

    const googleUser = GoogleCallbackUserSchema.parse(googleUserResponse);

    if (!googleUser.email_verified) throw new AuthenticationError("Unable to authenticate Google Profile");

    const existingUser = await prisma.user.findFirst({
      where: { email: googleUser.email },
    });

    const createSessionTokenByUserId = async (userId: string) => {
      const existingSessions = await auth.getUserSessions(userId);
      const session = existingSessions.length > 0 ? existingSessions[0] : await auth.createSession(userId, {});

      return createSessionJwt({ sessionId: session.id });
    };

    if (existingUser) {
      const sessionToken = await createSessionTokenByUserId(existingUser.id);
      return { user: existingUser, sessionToken };
    }

    const userId = generateIdFromEntropySize(10);

    const user = await prisma.user.create({
      data: { id: userId, email: googleUser.email },
    });

    const sessionToken = await createSessionTokenByUserId(userId);
    return { user, sessionToken };
  }
}
