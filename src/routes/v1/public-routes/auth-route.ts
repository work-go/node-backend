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
  GoogleCallbackResponseSchema,
  GoogleCallbackSearchSchema,
  GoogleCallbackUserSchema,
  GoogleLoginResponseSchema,
  LoginSchema,
  RegisterSchema,
} from "../../../schemas/shared/auth-schema";
import { UserSchema } from "../../../schemas/shared/user-schema";
import { createJWT, validateJWT } from "oslo/jwt";
import { z } from "zod";

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
      const jwt = auth.readBearerToken(
        request.headers["Authorization"] as string
      );

      if (!jwt)
        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });

      /* const { session, user: sessionUser } = await auth.validateSession(
        sessionCookie
      ); */

      const { payload } = await validateJWT(
        "HS256",
        new TextEncoder().encode(process.env.JWT_SECRET),
        jwt
      );
      const sessionId = (payload as any)?.sessionId as undefined | string;
      if (!sessionId) {
        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });
      }

      const { user: sessionUser } = await auth.validateSession(sessionId);

      if (!sessionUser)
        return reply
          .status(401)
          .send({ message: "Please authenticate yourself" });

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

        /* reply.setCookie("google_oauth_code_verifier", codeVerifier, {
          path: "/",
          httpOnly: true,
        }); */

        reply.send(
          GoogleLoginResponseSchema.parse({
            authorizationUrl: authorizationUrl.toString(),
            codeVerifier,
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
          200: GoogleCallbackResponseSchema,
        },
      },
    },
    async (request, reply) => {
      console.log("entered");

      const { code } = request.query;
      console.log("code", code);

      /*       const codeVerifier = request.cookies["google_oauth_code_verifier"]!;
       */

      const authorizationHeader = request.headers.authorization as string;
      console.log("authorizationHeader", authorizationHeader);

      const codeVerifier = auth.readBearerToken(authorizationHeader);
      console.log("codeVerifier", codeVerifier);
      if (!codeVerifier) {
        return reply.status(401).send({ message: "Invalid code verifier" });
      }
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      console.log("tokens", tokens);

      const googleUserResponse = await ofetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          params: {
            access_token: tokens.accessToken,
          },
        }
      );

      const googleUser = GoogleCallbackUserSchema.parse(googleUserResponse);

      console.log("googleUser", googleUser);

      if (!googleUser.email_verified)
        return reply.status(401).send({ message: "Please verify your email" });

      const existingUser = await prisma.user.findFirst({
        where: { email: googleUser.email },
        select: { id: true },
      });

      console.log("existingUser", existingUser);

      const createSessionTokenByUserId = async (userId: string) => {
        const existingSessions = await auth.getUserSessions(userId);
        const session =
          existingSessions.length > 0
            ? existingSessions[0]
            : await auth.createSession(userId, {});

        return createJWT(
          "HS256",
          new TextEncoder().encode(process.env.JWT_SECRET),
          { sessionId: session.id }
        );
      };

      if (existingUser) {
        const token = await createSessionTokenByUserId(existingUser.id);
        return reply.send(GoogleCallbackResponseSchema.parse({ token }));
      }

      const userId = generateIdFromEntropySize(10);

      await prisma.user.create({
        data: { id: userId, email: googleUser.email },
      });

      const token = await createSessionTokenByUserId(userId);
      reply.send(GoogleCallbackResponseSchema.parse({ token }));
    }
  );
};
