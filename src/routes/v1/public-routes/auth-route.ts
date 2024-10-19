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
    async (request) => RegisterResponseSchema.parse(await AuthController.register(request.body)),
  );

  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/login",
    {
      schema: {
        body: LoginSchema,
        response: { 200: RegisterResponseSchema },
      },
    },
    async (request) => RegisterResponseSchema.parse(await AuthController.login(request.body)),
  );

  plugin.withTypeProvider<ZodTypeProvider>().get(
    "/verify",
    {
      schema: {
        response: {
          200: RegisterResponseSchema,
        },
      },
    },
    async (request) => RegisterResponseSchema.parse(await AuthController.verifySessionToken(request.headers.authorization)),
  );

  plugin
    .withTypeProvider<ZodTypeProvider>()
    .get("/google/login", { schema: { response: { 200: GoogleLoginResponseSchema } } }, async () =>
      GoogleLoginResponseSchema.parse(await GoogleOauthController.createAuthroizationUrl()),
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
      RegisterResponseSchema.parse(
        await GoogleOauthController.login({
          code: request.query.code,
          codeVerifierAuthorizationHeader: request.headers.authorization,
        }),
      ),
  );
};
