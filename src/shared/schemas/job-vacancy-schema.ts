import dayjs from "dayjs";
import { z } from "zod";

export const JobVacancyResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string(),
  jobType: z.string(),
  jobSchedule: z.string(),
  department: z.string(),
  skills: z.array(z.string()),
  labels: z.array(z.string()),
  salary: z.string(),
  jobDescription: z.string(),
  screeningQuestions: z.string(),
  userId: z.string(),
  externalPortalUrl: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
  workspaceId: z.string(),
  isTrashed: z.boolean().default(false),
});

export const JobVacanciesResponseSchema = z.array(JobVacancyResponseSchema);

const JobType = z.enum(["ONSITE", "REMOTE", "HYBRID"]);
const JobSchedule = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]);

export const JobVacancyRequestSchema = z.object({
  title: z.string(),
  location: z.string(),
  jobType: JobType,
  jobSchedule: JobSchedule,
  department: z.string(),
  skills: z.array(z.string()),
  labels: z.array(z.string()),
  salary: z.string(),
  jobDescription: z.string(),
  screeningQuestions: z.string(),
  userId: z.string(),
  externalPortalUrl: z.string(),
  expiresAt: z
    .string()
    .refine((string) => dayjs(string).isValid)
    .transform((str) => new Date(str)),

  workspaceId: z.string(),
  isTrashed: z.boolean().default(false),
});
