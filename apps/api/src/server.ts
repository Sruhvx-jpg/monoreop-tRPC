import express, { Request, Response, NextFunction } from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Streamyst OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
})

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

// Always include dev urls in development
if (env.NODE_ENV !== "prod") {
  allowedOrigins.push(
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      // Allow Tauri origins
      if (
        origin.startsWith("tauri://") ||
        origin.startsWith("rx-html://") ||
        origin === "http://tauri.localhost" ||
        origin === "https://tauri.localhost"
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "trpc-accept", "Authorization"],
  }),
);

app.use(express.json())

app.get("/", (req, res) => {
  return res.json({ message: "Streamyst is up and running..." });
})

app.get("/health", (req, res) => {
  return res.json({ message: "Streamyst server is healthy", healthy: true });
})

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
})

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
)

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
)

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
})

// global error handlers
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error("Error:", err);
  const status = err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 500;
  const message = err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "Internal server error";
  res.status(status).json({ error: message });
})

export default app;
