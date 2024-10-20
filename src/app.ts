import fastify, { FastifyError } from "fastify";
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
import { env } from "./lib/env";
import { ValidationError } from "./shared/errors/validation-error";
import { ServerError } from "./shared/errors/server-error.";

const port = env.PORT;

export const app = fastify();

export const logger = app.log;

const bootstrap = async () => {
  try {
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((fastifyError, req, reply) => {
      let error: FastifyError | ValidationError | ServerError = fastifyError;

      if (hasZodFastifySchemaValidationErrors(fastifyError))
        error = new ValidationError(
          "Bad request", // TODO: Add dynamic message for every route
          mapZodIssuesToErrorMessages(fastifyError.validation.map((e) => e.params.issue)),
        );

      if (fastifyError instanceof PrismaClientKnownRequestError)
        error = new ValidationError("Bad request", mapPrismaErrorToErrorMessages(fastifyError));

      if (isResponseSerializationError(fastifyError)) error = new ServerError("Response schema parsing failed");

      let resp: any = {
        name: "Error",
        message: "Something went wrong",
        stack: env.NODE_ENV === "development" ? error.stack : undefined,
      };

      if (error instanceof ServerError)
        resp = { name: error.name, message: error.message, stack: env.NODE_ENV === "development" ? error.stack : undefined };
      else if (error instanceof ValidationError) resp = { name: error.name, message: error.message, details: error.details };
      else if (error instanceof Error)
        resp = { name: error.name, message: error.name, stack: env.NODE_ENV === "development" ? error.stack : undefined };

      return reply.code(error.statusCode || 500).send(resp);
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
