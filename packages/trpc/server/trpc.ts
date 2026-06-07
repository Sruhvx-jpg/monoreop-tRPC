import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";

import { redis } from "../utils/initRedis"
import {verifyAccTok} from "../utils/jwtUtils"


//++++++++++++ This file has middle integrateed for procedures +++++++++++++++
// you can add the middleware to procedure using the ".use()" 

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});


// router
export const router = tRPCContext.router;


// middlewares
const fixedWindowRateLimiter = tRPCContext.middleware(async ({ctx, next}: any) => {
    const ip = ctx.req.ip

  const key = `FWRL:${ip}`
  console.log("KEY: ", key)
  const curr = await redis.incr(key)
  console.log("current key:", curr)

  if (curr === 1) {
    await redis.expire(key, 60)
  }

  if (curr > 5) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Try again later.",
    });
  }

  return next();
})

const verifyToken = tRPCContext.middleware(async ({ ctx, next }: any) => {
  const token = ctx.getAuthToken()

  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Access token missing",
    });
  }

  try {
    const payload = verifyAccTok(token);

    return next({
      ctx: {
        ...ctx,
        user: payload,
      },
    });
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired access token",
    });
  }
});

// procedures
export const TokenBasedProcedure = tRPCContext.procedure.use(verifyToken)
export const publicProcedure = tRPCContext.procedure;
