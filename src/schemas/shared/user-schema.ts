import { z } from "zod";

export const UserSchema = z.object({
  name: z.string(),
});

export const ProductSchema = z.object({
  title: z.string(),
  title2: z.string(),
  title3: z.string(),
});
