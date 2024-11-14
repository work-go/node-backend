import { FastifyPluginAsync } from "fastify";
import { RegisterResponseSchema } from "../../../shared/schemas/auth-schema";
import { AuthController } from "../../../controllers/auth-controller";
import { jobVacancyRouter } from "./job-vacancy-route";

export const protectedRouter: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const res = RegisterResponseSchema.parse(await AuthController.verifySessionToken(request.headers.authorization));
    console.log("Protected route: ", res);
  });
  app.register(jobVacancyRouter, { prefix: "/job-Vacancies" });
};
