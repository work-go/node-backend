import fastify from "fastify";
import { authRouter } from "./routes/v1/public-routes/auth-route";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { mapPrismaErrorToErrorMessages, mapZodIssuesToErrorMessages } from "./lib/error-handling";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifyCors from "@fastify/cors";
import { prisma } from "./lib/prisma";
import { env } from "./lib/env";
import { HttpError } from "./shared/errors/http-error";
import { HttpInputError } from "./shared/errors/http-input-error";

const port = env.PORT;

export const app = fastify();

export const logger = app.log;

const bootstrap = async () => {
  try {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((err, req, reply) => {
      if (hasZodFastifySchemaValidationErrors(err)) {
        return reply.code(400).send({
          message: "Invalid request",
          details: mapZodIssuesToErrorMessages(err.validation.map((e) => e.params.issue)),
        });
      }

      if (isResponseSerializationError(err)) {
        return reply.code(500).send({
          message: "Invalid response",
          details: mapZodIssuesToErrorMessages(err.cause.issues),
        });
      }

      if (err instanceof PrismaClientKnownRequestError)
        return reply.code(400).send({
          message: "Invalid request",
          details: mapPrismaErrorToErrorMessages(err),
        });

      if (err instanceof HttpError)
        return reply.code(err.meta.statusCode).send({
          message: err.message,
        });

      if (err instanceof HttpInputError)
        return reply.code(err.meta.statusCode).send({
          message: err.message,
          details: err.meta.details,
        });

      return reply.code(500).send({
        message: "Internal server error",
        error: err,
      });
    });

    app.register(fastifyCors, {
      origin: env.FRONTEND_URL,
      credentials: true,
    });

    app.register(fastifySwagger, {
      openapi: {
        info: {
          title: "Work Go API",
          description: "",
          version: "1.0.0",
        },
        servers: [],
      },
      transform: jsonSchemaTransform,
    });

    console.log(await prisma.user.findMany());

    app.register(fastifySwaggerUI, {
      routePrefix: "/documentation",
    });

    app.get("/", (request, reply) => {
      reply.send(`Server running at port ${port}`);
    });

    app.register(authRouter, { prefix: "/v1/auth" });

    await app.ready();
    console.log("❕ Starting server, please wait...");
    const dest = await app.listen({ host: "0.0.0.0", port });
    console.log(`✅ Server listing on ${dest}`);
  } catch (error) {
    console.log(`❗ Failed to start server: ${error instanceof Error ? error.message : "Uknown error occured"}`);
  }
};

bootstrap();
