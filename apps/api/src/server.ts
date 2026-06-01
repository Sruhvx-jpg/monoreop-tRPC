import express from "express";
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

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "trpc-accept"],
  }),
);

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: "*",
    }),
  );
}

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
app.use((err: any, req: any, res: any, next: any) => {
  logger.error("Error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
})

export default app;
