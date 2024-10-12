import {
  LoginSchema,
  RegisterSchema,
} from "../../../schemas/shared/auth-schema";
import { hash, verify } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";
import { prisma } from "../../../lib/prisma";
import { auth } from "../../../lib/auth";
import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export const authRouter: FastifyPluginAsync = async (plugin) => {
  plugin.withTypeProvider<ZodTypeProvider>().post(
    "/register",
    {
      schema: {
        body: RegisterSchema,
      },
    },
    async (request, reply) => {
      const hashedPassword = await hash(request.body.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });

      const userId = generateIdFromEntropySize(10);

      await prisma.user.create({
        data: {
          id: userId,
          email: request.body.email,
          hashedPassword,
        },
      });

      const session = await auth.createSession(userId, { id: userId });
      const sessionCookie = auth.createSessionCookie(session.id);

      reply.setCookie("session", sessionCookie.serialize(), {
        httpOnly: true,
        signed: true,
      });

      reply.send();
    }
  );

  plugin
    .withTypeProvider<ZodTypeProvider>()
    .post(
      "/login",
      { schema: { body: LoginSchema } },
      async (request, reply) => {
        const user = await prisma.user.findFirst({
          where: { email: request.body.email },
        });

        if (!user) throw new Error("Invalid email or password");

        const isValidPassword = await verify(
          user.hashedPassword,
          request.body.password,
          {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
          }
        );

        if (!isValidPassword) throw new Error("Invalid email or password");

        const existingSessions = await auth.getUserSessions(user.id);

        const session =
          existingSessions.length > 0
            ? existingSessions[0]
            : await auth.createSession(user.id, { id: user.id });

        const sessionCookie = auth.createSessionCookie(session.id);

        reply.setCookie("session", sessionCookie.serialize(), {
          httpOnly: true,
          signed: true,
        });

        reply.send();
      }
    );
};
