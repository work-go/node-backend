import { z } from "zod";
import { UserSchema } from "./user-schema";

export const GenericErrorSchema = z.object({
  message: z.string(),
});

export const RegisterSchema = z
  .object({
    email: z
      .string({
        required_error: "Please enter your email",
        invalid_type_error: "Please enter your email",
      })
      .min(1, "Please enter your email")
      .email("Please enter a valid email"),
    password: z.string({
      required_error: "Please enter your password",
      invalid_type_error: "Please enter your password",
    }),
    passwordConfirm: z.string({
      required_error: "Please confirm your password",
      invalid_type_error: "Please confirm your password",
    }),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: "Make sure the passwords match",
    path: ["passwordConfirm"],
  });

export const RegisterResponseSchema = z.object({
  user: UserSchema,
  sessionToken: z.string(),
});

export const LoginSchema = z.object({
  email: z.string().min(1, "Please enter your email").email("Please enter a valid email"),
  password: z.string(),
});

export const GoogleLoginResponseSchema = z.object({
  authorizationUrl: z.string(),
  codeVerifier: z.string(),
});

export const GoogleCallbackUserSchema = z.object({
  sub: z.string(),
  name: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
});

export const GoogleCallbackSearchSchema = z.object({
  code: z.string(),
});
