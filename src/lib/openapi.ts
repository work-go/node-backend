import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { writeFile, writeFileSync } from "fs";
import path from "path";
import openapiTS, { astToString } from "openapi-typescript";

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

  app.decorate("generateClientTypes", async () => {
    const specs = app.swagger({ yaml: true });
    writeFile(path.resolve("./src/shared/generated", "openapi-specs.yml"), specs, async () => {
      const ast = await openapiTS(new URL(path.resolve("./src/shared/generated", "openapi-specs.yml"), import.meta.url));
      writeFile(path.resolve("./src/shared/generated", "api-types.ts"), astToString(ast), () => {});
    });
  });
};

export const openApiPlugin = fastifyPlugin(plugin, {
  name: "open-api-plugin",
});
