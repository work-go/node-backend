import { z } from "zod";

export const UserSchema = z.object({
  email: z.string(),
});

export const ProductSchema = z.object({
  title: z.string(),
  title2: z.string(),
  title4: z.string(),
});
