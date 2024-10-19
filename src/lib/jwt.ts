import { createJWT, validateJWT } from "oslo/jwt";
import { env } from "./env";
import { SessionJwt } from "../controllers/auth-controller";

export const createSessionJwt = (payload: SessionJwt) =>
  createJWT("HS256", new TextEncoder().encode(env.JWT_SECRET), payload);

export const validateSessionJwt = (jwt: string) =>
  validateJWT("HS256", new TextEncoder().encode(env.JWT_SECRET), jwt);
