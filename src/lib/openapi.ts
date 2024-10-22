import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { writeFileSync } from "fs";
import path from "path";

declare module "fastify" {
  interface FastifyInstance {
    generateClientTypes: () => void;
  }
}

const plugin: FastifyPluginAsync = async (app) => {
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

  app.register(fastifySwaggerUi, {
    routePrefix: "/documentation",
  });

  app.decorate(
    "generateClientTypes",
    () => {
      const specs = app.swagger({ yaml: true });
      writeFileSync(path.resolve(".", "openapi-specs.yaml"), specs);
    },
    [],
  );
};

export const openApiPlugin = fastifyPlugin(plugin, {
  name: "open-api-plugin",
});
