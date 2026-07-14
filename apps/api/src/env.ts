import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "prod"]).default("development"),
  BASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  const data = safeParseResult.data;
  return {
    ...data,
    BASE_URL: data.BASE_URL || `http://localhost:${data.PORT}`,
  };
}

export const env = createEnv(process.env);
