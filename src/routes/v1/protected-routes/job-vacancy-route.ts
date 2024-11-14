import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  JobVacanciesResponseSchema,
  JobVacancyRequestSchema,
  JobVacancyResponseSchema,
} from "../../../shared/schemas/job-vacancy-schema";
import { JobVacancyController } from "../../../controllers/job-vacancy-controller";

export const jobVacancyRouter: FastifyPluginAsync = async (app) => {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get("/", { schema: { response: { 200: JobVacanciesResponseSchema } } }, async (request) => {
      return JobVacanciesResponseSchema.parse(await JobVacancyController.getJobs());
    });
  app.withTypeProvider<ZodTypeProvider>().post(
    "/create",
    {
      schema: {
        body: JobVacancyRequestSchema,
        response: {
          200: JobVacancyResponseSchema,
        },
      },
    },
    async (request) => {
      return JobVacancyResponseSchema.parse(await JobVacancyController.createJob(request.body));
    },
  );
};
