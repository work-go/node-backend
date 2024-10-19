import { generateCodeVerifier, generateState } from "arctic";
import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { generateIdFromEntropySize } from "lucia";
import { ofetch } from "ofetch";
import { createJWT } from "oslo/jwt";
import {
  AuthController,
  SessionJwt,
} from "../../../controllers/auth-controller";
import { auth, google } from "../../../lib/auth";
import { validateSessionJwt } from "../../../lib/jwt";
import { prisma } from "../../../lib/prisma";
import {
  GenericErrorSchema,
  GoogleCallbackResponseSchema,
  GoogleCallbackSearchSchema,
  GoogleCallbackUserSchema,
  GoogleLoginResponseSchema,
  LoginSchema,
  RegisterResponseSchema,
  RegisterSchema,
} from "../../../shared/schemas/auth-schema";
import { UserSchema } from "../../../shared/schemas/user-schema";
import { safeTryAsync } from "../../../lib/safe-try";
import { HttpError } from "../../../shared/errors/http-error";

export const authRouter: FastifyPluginAsync = async (plugin) => {
  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/register",
    {
      schema: {
        body: RegisterSchema,
        response: {
          200: RegisterResponseSchema,
        },
      },
    },
    async (request, reply) => {
      reply.send(
        RegisterResponseSchema.parse(
          await AuthController.register(request.body)
        )
      );
    }
  );

  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/login",
    {
      schema: {
        body: LoginSchema,
        response: { 200: RegisterResponseSchema },
      },
    },
    async (request, reply) => {
      reply.send(
        RegisterResponseSchema.parse(await AuthController.login(request.body))
      );
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
      const sessionToken = request.headers.authorization;

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
          error instanceof Error
            ? error.message
            : "Please authenticate yourself",
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
