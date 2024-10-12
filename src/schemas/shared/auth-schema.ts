import { z } from "zod";

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

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email")
    .email("Please enter a valid email"),
  password: z.string(),
});
