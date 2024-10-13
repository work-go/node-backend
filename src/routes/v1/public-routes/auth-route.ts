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

      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

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

        reply.setCookie(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );

        reply.send(UserSchema.parse(user));
      }
    );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/verify",
    {
      schema: {
        response: {
          200: UserSchema,
          503: GenericErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const sessionCookie = request.cookies[auth.sessionCookieName];

      if (!sessionCookie)
        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });

      const { session, user: sessionUser } = await auth.validateSession(
        sessionCookie
      );

      if (!session) {
        const sessionCookie = auth.createBlankSessionCookie();

        reply.setCookie(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );

        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });
      }

      if (session.fresh) {
        const sessionCookie = auth.createSessionCookie(session.id);
        reply.setCookie(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }

      const user = await prisma.user.findFirst({
        where: { email: sessionUser.email },
      });

      if (!user)
        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });

      return reply.send(UserSchema.parse(user));
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

        const authorizationUrl = await google.createAuthorizationURL(
          state,
          codeVerifier,
          {
            scopes: ["profile", "email"],
          }
        );

        reply.setCookie("google_oauth_code_verifier", codeVerifier, {
          path: "/",
          httpOnly: true,
        });

        reply.send(
          GoogleLoginResponseSchema.parse({
            authorizationUrl: authorizationUrl.toString(),
          })
        );
      }
    );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/google/callback",
    {
      schema: {
        querystring: GoogleCallbackSearchSchema,
        response: {
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
        select: { id: true },
      });

      const createSessionCookieByUserId = async (userId: string) => {
        const existingSessions = await auth.getUserSessions(userId);
        const session =
          existingSessions.length > 0
            ? existingSessions[0]
            : await auth.createSession(userId, {});

        const sessionCookie = auth.createSessionCookie(session.id);

        reply.setCookie(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      };

      if (existingUser) {
        await createSessionCookieByUserId(existingUser.id);
        return reply.send();
      }

      const userId = generateIdFromEntropySize(10);

      await prisma.user.create({
        data: { id: userId, email: googleUser.email },
      });

      await createSessionCookieByUserId(userId);
      reply.send();
    }
  );
};
