import dayjs from "dayjs";
import { z } from "zod";

export const JobVacancyResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string(),
  jobType: z.enum(["ONSITE", "HYBRID", "REMOTE"]),
  jobSchedule: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  department: z.string(),
  skills: z.array(z.string()),
  labels: z.array(z.string()),
  jobDescription: z.string(),
  screeningQuestions: z.string(),
  userId: z.string(),
  externalPortalUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
  workspaceId: z.string(),
  isTrashed: z.boolean().default(false),
});

export const JobVacanciesResponseSchema = z.array(JobVacancyResponseSchema);

export const JobVacancyRequestSchema = z.object({
  title: z.string(),
  location: z.string(),
  jobType: z.enum(["ONSITE", "HYBRID", "REMOTE"]),
  jobSchedule: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  department: z.string(),
  skills: z.array(z.string()),
  labels: z.array(z.string()),
  jobDescription: z.string(),
  screeningQuestions: z.string(),
  externalPortalUrl: z.string().optional(),
  expiresAt: z
    .string()
    .refine((string) => dayjs(string).isValid)
    .transform((str) => new Date(str)),
  isTrashed: z.boolean().default(false),
});
