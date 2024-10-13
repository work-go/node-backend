import { generateCodeVerifier, generateState } from "arctic";
import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { generateIdFromEntropySize } from "lucia";
import { ofetch } from "ofetch";
import { AuthController } from "../../../controllers/auth-controller";
import { auth, google } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import {
  GenericErrorSchema,
  GoogleCallbackSearchSchema,
  GoogleCallbackUserSchema,
  GoogleLoginResponseSchema,
  LoginSchema,
  RegisterSchema,
} from "../../../schemas/shared/auth-schema";
import { UserSchema } from "../../../schemas/shared/user-schema";

export const authRouter: FastifyPluginAsync = async (plugin) => {
  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/register",
    {
      schema: {
        body: RegisterSchema,
        response: {
          200: UserSchema,
        },
      },
    },
    async (request, reply) => {
      const { user, sessionCookie } = await AuthController.register(
        request.body
      );

      reply.setCookie("session", sessionCookie.serialize(), {
        httpOnly: true,
        signed: true,
      });

      reply.send(UserSchema.parse(user));
    }
  );

  plugin
    .withTypeProvider<ZodTypeProvider>()
    .post(
      "/login",
      { schema: { body: LoginSchema, response: { 200: UserSchema } } },
      async (request, reply) => {
        const { user, sessionCookie } = await AuthController.login(
          request.body
        );

        reply.setCookie("session", sessionCookie.serialize(), {
          httpOnly: true,
          signed: true,
        });

        reply.send(UserSchema.parse(user));
      }
    );

  plugin
    .withTypeProvider<ZodTypeProvider>()
    .get(
      "/google/login",
      { schema: { response: { 200: GoogleLoginResponseSchema } } },
      async (request, reply) => {
        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        console.log(
          "Generated code verifier",
          codeVerifier,
          typeof codeVerifier
        );
        const authorizationUrl = await google.createAuthorizationURL(
          state,
          codeVerifier,
          {
            scopes: ["profile", "email"],
          }
        );

        reply.setCookie("google_oauth_code_verifier", codeVerifier, {
          httpOnly: true,
          sameSite: "strict",
        });

        reply.send(GoogleLoginResponseSchema.parse({ authorizationUrl }));
      }
    );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/google/callback",
    {
      schema: {
        querystring: GoogleCallbackSearchSchema,
        response: {
          200: UserSchema,
          401: GenericErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { code } = request.query;

      const codeVerifier = request.cookies["google_oauth_code_verifier"]!;

      const tokens = await google.validateAuthorizationCode(code, codeVerifier);

      const googleUserResponse = await ofetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          params: {
            access_token: tokens.accessToken,
          },
        }
      );

      const googleUser = GoogleCallbackUserSchema.parse(googleUserResponse);

      if (!googleUser.email_verified)
        return reply.status(401).send({ message: "Please verify your email" });

      const existingUser = await prisma.user.findFirst({
        where: { email: googleUser.email },
      });

      const createSessionCookieByUserId = async (userId: string) => {
        const existingSessions = await auth.getUserSessions(userId);
        const session =
          existingSessions.length > 0
            ? existingSessions[0]
            : await auth.createSession(userId, { id: userId });
        const sessionCookie = auth.createSessionCookie(session.id);

        reply.setCookie("session", sessionCookie.serialize(), {
          httpOnly: true,
          signed: true,
        });
      };

      if (existingUser) {
        await createSessionCookieByUserId(existingUser.id);
        return reply.send(UserSchema.parse(existingUser));
      }

      const userId = generateIdFromEntropySize(10);

      const user = await prisma.user.create({
        data: { id: userId, email: googleUser.email },
      });

      await createSessionCookieByUserId(userId);
      reply.send(UserSchema.parse(user));
    }
  );
};
