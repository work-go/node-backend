import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { AuthController } from "../../../controllers/auth-controller";
import { GoogleOauthController } from "../../../controllers/google-oauth-controller";
import {
  GoogleCallbackSearchSchema,
  GoogleLoginResponseSchema,
  LoginSchema,
  RegisterResponseSchema,
  RegisterSchema,
} from "../../../shared/schemas/auth-schema";
import { z } from "zod";

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
    async (request) => AuthController.register(request.body),
  );

  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/login",
    {
      schema: {
        body: LoginSchema,
        response: { 200: RegisterResponseSchema },
      },
    },
    async (request) => AuthController.login(request.body),
  );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/verify",
    {
      schema: {
        response: {
          200: RegisterResponseSchema,
        },
        headers: z.object({ authorization: z.string() }),
      },
    },
    async (request) => AuthController.verifySessionToken(request.headers.authorization),
  );

  plugin
    .withTypeProvider<ZodTypeProvider>()
    .get("/google/login", { schema: { response: { 200: GoogleLoginResponseSchema } } }, async () =>
      GoogleOauthController.createAuthroizationUrl(),
    );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/google/callback",
    {
      schema: {
        querystring: GoogleCallbackSearchSchema,
        response: {
          200: RegisterResponseSchema,
        },
      },
    },
    async (request) =>
      GoogleOauthController.login({
        code: request.query.code,
        codeVerifierAuthorizationHeader: request.headers.authorization,
      }),
  );
};
