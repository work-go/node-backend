import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateIdFromEntropySize } from "lucia";
import { JobVacancyRequestSchema } from "../shared/schemas/job-vacancy-schema";

export class JobVacancyController {
  public static async getJobs() {
    /* await prisma.jobVacancy.create({
      data: {
        id: "some-job-id",
        title: "Software Engineer",
        description: "Develop and maintain software solutions",
        company: "Tech Innovators Inc.",
        location: "Remote",
        url: "https://tech-innovators.com/jobs/software-engineer",
        postedAt: new Date("2024-10-24"), // Set to the date the job was posted
        expiresAt: new Date("2024-12-24"), // Set to the date the job expires
        userId: "e7ev2qkco3zvcib6", // The ID of the user who is posting the job
      },
    });  */
    const jobs = await prisma.jobVacancy.findMany();
    return jobs;
  }
  public static async createJob(job: z.infer<typeof JobVacancyRequestSchema>) {
    const jobId = generateIdFromEntropySize(10);
    const modifiedJob = { ...job, id: jobId };
    return await prisma.jobVacancy.create({
      data: modifiedJob,
    });
  }
}
