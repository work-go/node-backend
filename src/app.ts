import fastify from "fastify";

const app = fastify({ logger: true });

export const logger = app.log;

app.get("/", (request, reply) => {
  return "Hello World";
});

// app.post("/login")

app.get("/users", () => {
  return "Users";
});

const bootstrap = async () => {
  try {
    const dest = await app.listen({ host: "0.0.0.0", port: 3000 });
    logger.info(`✅ Server listing on ${dest}`);
  } catch (error) {
    logger.error(
      `❗ Failed to start server: ${
        error instanceof Error ? error.message : "Uknown error occured"
      }`
    );
  }
};

bootstrap();
