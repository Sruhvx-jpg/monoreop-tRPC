# @repo/innjest

> Lightweight, zero-config API analytics & monitoring for Express + tRPC monorepos.

Drop-in analytics collector with a built-in dark-mode dashboard UI. Tracks every tRPC call automatically, surfaces real-time metrics, and serves a full-featured dev server inspector — all from a single package.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Package Exports](#package-exports)
- [Server API Reference](#server-api-reference)
  - [AnalyticsCollector](#analyticscollector)
  - [createAnalyticsMiddleware](#createanalyticsmiddleware)
  - [registerTRPCEndpoint](#registertrpcendpoint)
  - [createAnalyticsRoutes](#createanalyticsroutes)
- [Client API Reference](#client-api-reference)
  - [AnalyticsDashboard (React)](#analyticsdashboard-react)
- [Type Reference](#type-reference)
- [Integration Guide](#integration-guide)
  - [Step 1: Install in Express](#step-1-install-in-express)
  - [Step 2: Wire tRPC Middleware](#step-2-wire-trpc-middleware)
  - [Step 3: Register Endpoints](#step-3-register-endpoints)
  - [Step 4: Manual Call Tracking](#step-4-manual-call-tracking)
- [REST API Endpoints](#rest-api-endpoints)
- [Dashboard UI](#dashboard-ui)
- [Agent Guide](#agent-guide)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```ts
// apps/api/src/server.ts
import express from "express";
import { createAnalyticsRoutes } from "@repo/innjest/server";

const app = express();

// Mount analytics — that's it
app.use("/api/analytics", createAnalyticsRoutes());
app.get("/analytics", (req, res) => res.redirect("/api/analytics/dashboard"));

app.listen(4000);
// Dashboard → http://localhost:4000/analytics
```

---

## Architecture

```
@repo/innjest/
├── src/
│   ├── index.ts                 # Root barrel export
│   ├── shared/
│   │   └── types.ts             # TypeScript interfaces (APICall, AnalyticsSummary, etc.)
│   ├── server/
│   │   ├── index.ts             # Server barrel export
│   │   ├── analytics.ts         # AnalyticsCollector class (in-memory store + metrics engine)
│   │   ├── trpc-middleware.ts   # tRPC middleware factory for auto-instrumentation
│   │   └── routes.ts            # Express router with dashboard HTML + REST API
│   └── client/
│       ├── index.ts             # Client barrel export
│       ├── Dashboard.tsx        # React component (Recharts-based)
│       ├── Dashboard.module.css # CSS Module with design tokens
│       └── style.d.ts           # CSS module type declaration
```

**Data flow:**

```
tRPC Call → analyticsMiddleware → AnalyticsCollector.startCall()
                                       ↓
                               AnalyticsCollector.endCall()
                                       ↓
                               In-memory Map<string, APICall>
                                       ↓
                   Express Routes serve JSON API + HTML Dashboard
```

---

## Package Exports

| Import Path | What You Get |
|---|---|
| `@repo/innjest/server` | `AnalyticsCollector`, `analyticsCollector`, `createAnalyticsMiddleware`, `registerTRPCEndpoint`, `createAnalyticsRoutes` |
| `@repo/innjest/client` | `AnalyticsDashboard` (React component) |
| `@repo/innjest/types` | All TypeScript interfaces |

---

## Server API Reference

### AnalyticsCollector

The core analytics engine. Stores calls in-memory and computes metrics.

```ts
import { AnalyticsCollector, analyticsCollector } from "@repo/innjest/server";
```

A **singleton instance** (`analyticsCollector`) is exported by default. Use it directly — do NOT create new instances unless you need isolated collectors.

#### Methods

| Method | Signature | Description |
|---|---|---|
| `startCall` | `(endpoint, method?, userId?, ipAddress?) → string` | Begin tracking a call. Returns a `callId`. |
| `endCall` | `(callId, statusCode, responseSize, error?) → void` | Complete a tracked call with result data. |
| `registerEndpoint` | `(metadata: APIMetadata) → void` | Register endpoint metadata (name, method, tags, rate limits). |
| `getCalls` | `(filters?, limit?, offset?) → APICall[]` | Query stored calls with filtering and pagination. |
| `getAnalytics` | `(timeWindowMs?) → AnalyticsSummary` | Get aggregate metrics for a time window (default: 1 hour). |
| `getEndpoints` | `() → APIMetadata[]` | List all registered endpoints. |
| `getEndpoint` | `(name) → APIMetadata \| undefined` | Get metadata for a specific endpoint. |
| `clearOldData` | `(olderThanMs?) → void` | Prune calls older than N ms (default: 24h). |
| `clearData` | `() → void` | Wipe all stored calls and reset counters. |

#### Example: Manual Call Tracking

```ts
import { analyticsCollector } from "@repo/innjest/server";

// Start tracking
const callId = analyticsCollector.startCall(
  "user.getProfile",   // endpoint name
  "query",             // method: 'query' | 'mutation' | 'subscription'
  "usr_abc123",        // optional userId
  "127.0.0.1"          // optional IP
);

// ... do work ...

// Complete tracking
analyticsCollector.endCall(
  callId,
  200,                        // HTTP status code
  JSON.stringify(result).length,  // response size in bytes
  // error                    // optional Error object for failures
);
```

---

### createAnalyticsMiddleware

Factory that returns a tRPC middleware function. Automatically instruments every procedure call.

```ts
import { createAnalyticsMiddleware } from "@repo/innjest/server";

// In your tRPC setup:
const analyticsMiddleware = createAnalyticsMiddleware();

export const publicProcedure = t.procedure.use(analyticsMiddleware);
```

**What it captures automatically:**
- `path` — tRPC procedure path (e.g. `"health.getHealth"`)
- `type` — `"query"` | `"mutation"` | `"subscription"`
- `ctx.user.id` or `ctx.userId` — user identifier (if present in context)
- `ctx.req.ip` — client IP address (if present in context)
- Response size (serialized JSON length)
- Duration (ms via `performance.now()`)
- Error status codes (maps `TRPCError` codes to HTTP status)

---

### registerTRPCEndpoint

Pre-register endpoint metadata so the dashboard shows rich info even before the first call.

```ts
import { registerTRPCEndpoint } from "@repo/innjest/server";

registerTRPCEndpoint({
  name: "auth.login",
  endpoint: "auth.login",
  method: "mutation",
  isAuthRequired: false,
  description: "User authentication endpoint",
  rateLimit: { enabled: true, requests: 5, windowMs: 60000, type: "IP" },
  tags: ["auth", "public"],
});
```

---

### createAnalyticsRoutes

Returns an Express `Router` that serves both the JSON REST API and the HTML dashboard UI.

```ts
import { createAnalyticsRoutes } from "@repo/innjest/server";

app.use("/api/analytics", createAnalyticsRoutes());
```

This single call gives you:
- **HTML Dashboard** at `/api/analytics/dashboard`
- **Event Inspector** at `/api/analytics?id=<callId>`
- **REST API** at `/api/analytics/metrics`, `/calls`, `/endpoints`, etc.

---

## Client API Reference

### AnalyticsDashboard (React)

A React component that renders a Recharts-powered dashboard. Use this if you have a Next.js or React frontend and want to embed analytics in your admin panel.

```tsx
import { AnalyticsDashboard } from "@repo/innjest/client";

export default function AdminAnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

**Props:** None. The component fetches data from `/api/analytics/*` endpoints automatically.

**Requirements:**
- React 18+ or 19+
- `recharts` (included as dependency)
- The Express server must be serving the analytics API routes

---

## Type Reference

All types are importable from `@repo/innjest/types`:

```ts
import type {
  APICall,
  APIMetadata,
  AnalyticsSummary,
  EndpointStats,
  FilterOptions,
  RateLimitConfig,
  TimeSeriesData,
  PerformanceChart,
  DashboardMetrics,
} from "@repo/innjest/types";
```

### APICall

```ts
interface APICall {
  id: string;
  endpoint: string;
  method: 'query' | 'mutation' | 'subscription';
  status: 'success' | 'error' | 'pending';
  startTime: number;
  endTime?: number;
  duration?: number;       // milliseconds
  requestSize: number;
  responseSize: number;
  statusCode: number;
  error?: string;
  userId?: string;
  ipAddress?: string;
  timestamp: Date | string;
}
```

### AnalyticsSummary

```ts
interface AnalyticsSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;     // 0-100
  avgResponseTime: number; // ms
  timeWindow: number;      // ms
  endpointStats: Record<string, EndpointStats>;
}
```

### EndpointStats

```ts
interface EndpointStats {
  calls: number;
  errors: number;
  avgTime: number;  // ms
  p95Time: number;  // ms
  p99Time: number;  // ms
}
```

### FilterOptions

```ts
interface FilterOptions {
  endpoint?: string;
  status?: 'success' | 'error' | 'pending';
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
}
```

### APIMetadata

```ts
interface APIMetadata {
  name: string;
  description?: string;
  endpoint: string;
  method: 'query' | 'mutation';
  isAuthRequired: boolean;
  rateLimit?: RateLimitConfig;
  tags?: string[];
  averageResponseTime?: number;
  callCount?: number;
  errorCount?: number;
  lastCalled?: Date | string;
}
```

---

## Integration Guide

### Step 1: Install in Express

```ts
// apps/api/src/server.ts
import { createAnalyticsRoutes, analyticsCollector } from "@repo/innjest/server";

const app = express();
app.use(express.json());

// Mount analytics routes
app.use("/api/analytics", createAnalyticsRoutes());

// Optional: redirect shortcut
app.get("/analytics", (req, res) => res.redirect("/api/analytics/dashboard"));
```

### Step 2: Wire tRPC Middleware

```ts
// packages/trpc/server/trpc.ts
import { createAnalyticsMiddleware } from "@repo/innjest/server";

const analyticsMiddleware = createAnalyticsMiddleware();

export const publicProcedure = t.procedure.use(analyticsMiddleware);
export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(analyticsMiddleware);
```

> **Important:** Place the analytics middleware AFTER auth middleware so it can access `ctx.user.id`.

### Step 3: Register Endpoints

```ts
// apps/api/src/server.ts (top-level, before app.listen)
import { registerTRPCEndpoint } from "@repo/innjest/server";

registerTRPCEndpoint({
  name: "health.getHealth",
  endpoint: "health.getHealth",
  method: "query",
  isAuthRequired: false,
  tags: ["system"],
});

registerTRPCEndpoint({
  name: "auth.login",
  endpoint: "auth.login",
  method: "mutation",
  isAuthRequired: false,
  rateLimit: { enabled: true, requests: 5, windowMs: 60000, type: "IP" },
  tags: ["auth"],
});
```

### Step 4: Manual Call Tracking

For non-tRPC routes (plain Express endpoints), track calls manually:

```ts
app.get("/health", (req, res) => {
  const callId = analyticsCollector.startCall("health.getHealth", "query", undefined, req.ip);

  const data = { healthy: true };
  const size = JSON.stringify(data).length;

  analyticsCollector.endCall(callId, 200, size);
  res.json(data);
});
```

---

## REST API Endpoints

All endpoints are relative to the mount path (e.g. `/api/analytics`).

| Method | Path | Description | Query Params |
|---|---|---|---|
| `GET` | `/` | Event inspector HTML (or JSON if `Accept: application/json`) | `?id=<callId>`, `?timeWindow=<ms>` |
| `GET` | `/dashboard` | Dev Server dashboard HTML | — |
| `GET` | `/metrics` | Aggregate analytics summary | `?timeWindow=<ms>` |
| `GET` | `/calls` | List tracked API calls | `?endpoint=`, `?status=`, `?search=`, `?limit=`, `?offset=` |
| `GET` | `/calls/:id` | Get specific call by ID | — |
| `GET` | `/endpoints` | List registered endpoints | — |
| `POST` | `/clear` | Clear all stored analytics data | — |
| `POST` | `/event` | Dispatch a custom event | Body: `{ name, payload }` |
| `POST` | `/invoke` | Invoke a function (dev testing) | Body: `{ endpoint, payload }` |

### Example: Fetch Metrics

```bash
curl http://localhost:4000/api/analytics/metrics?timeWindow=3600000
```

```json
{
  "totalCalls": 42,
  "successfulCalls": 40,
  "failedCalls": 2,
  "successRate": 95.2,
  "avgResponseTime": 14.7,
  "timeWindow": 3600000,
  "endpointStats": {
    "health.getHealth": { "calls": 20, "errors": 0, "avgTime": 2.1, "p95Time": 4.5, "p99Time": 5.2 },
    "auth.login":      { "calls": 12, "errors": 1, "avgTime": 28.3, "p95Time": 45.0, "p99Time": 52.0 }
  }
}
```

---

## Dashboard UI

The built-in dashboard is a fully self-contained HTML page (no external framework needed). It loads:

- **Google Fonts** — Inter + JetBrains Mono
- **GSAP 3.12** — for micro-animations

### Dashboard Tabs

| Tab | What It Shows |
|---|---|
| **Functions** | Multi-line wave graph (540px, 4 metrics) + registered function cards with invoke button |
| **Events Stream** | Live table of received events with click-through to event inspector |
| **Runs** | Filterable table of all API call runs with status, duration, method |
| **Apps** | Connected app info (URL, endpoint count, sync status) |
| **Metrics** | Throughput overview |
| **Health Monitor** | Ping `/health` and see status code, latency, last ping time |

### Graph Metrics (Functions Tab)

| Line Color | Metric |
|---|---|
| `#10b981` (Green) | Completed function runs (count) |
| `#ef4444` (Bright Red) | Failed function runs (count) |
| `#f87171` (Coral) | Mean execution latency (ms) |
| `#dc2626` (Dark Red) | Queue throughput volume |

### Timeline Range Selector

The dropdown next to the legend filters the graph by time window:
`5m` · `15m` · `30m` · `1h` · `3h` · `6h` · `12h` · `24h` · `All`

### Design System

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#000000` | Page background |
| `--surface-800` | `#121212` | Card/panel backgrounds |
| `--border` | `#2a2a2a` | Borders |
| `--red` | `#ef4444` | Primary accent |
| `--success` | `#10b981` | Success states |
| `--font-mono` | `JetBrains Mono` | Code, metrics, IDs |

---

## Agent Guide

> **For AI coding agents** working on this monorepo. Read this section before modifying `@repo/innjest`.

### Key Files to Know

| File | Purpose | Lines |
|---|---|---|
| `packages/innjest/src/server/routes.ts` | **Main file.** Contains ALL Express routes + HTML dashboard. ~1300 lines. | ~1300 |
| `packages/innjest/src/server/analytics.ts` | Analytics engine. In-memory `Map<string, APICall>` store. | ~290 |
| `packages/innjest/src/server/trpc-middleware.ts` | tRPC auto-instrumentation middleware. | ~64 |
| `packages/innjest/src/client/Dashboard.tsx` | React dashboard (parity with HTML dashboard). | ~340 |
| `apps/api/src/server.ts` | Where innjest is mounted in the Express app. | ~160 |
| `packages/trpc/server/trpc.ts` | Where the tRPC analytics middleware is wired. | ~20 |

### Critical Patterns

1. **The HTML dashboard is inline in `routes.ts`** — it's a template literal inside `getDashboardHtml()` and `getEventAnalyticsHtml()`. There is no separate `.html` file.

2. **The singleton pattern** — `analyticsCollector` is a module-level singleton. Never create `new AnalyticsCollector()` unless you explicitly need a separate instance.

3. **Hot-reload gotcha** — The Express server uses `tsx watch` which watches `apps/api/src/`. Editing files in `packages/innjest/src/` does NOT trigger hot-reload. **You must restart `pnpm --filter @repo/api dev`** after editing innjest source files.

4. **UI palette rules:**
   - Backgrounds: Pure black `#000000` and dark grey `#121212`
   - Accents: Red (`#ef4444`) and Green (`#10b981`) ONLY. **No blue, no cyan.**
   - Icons: SVG paths only. **No emojis** in buttons or headers.
   - Typography: `Inter` for UI, `JetBrains Mono` for code/metrics.

5. **Dashboard serves two HTML pages:**
   - `getDashboardHtml()` → Dev Server Dashboard at `/api/analytics/dashboard`
   - `getEventAnalyticsHtml(id?)` → Event Inspector at `/api/analytics?id=xxx`

6. **Graph rendering** — The Functions tab graph is rendered via inline `<script>` using raw SVG path generation (no charting library on the server-rendered HTML). The React `Dashboard.tsx` uses Recharts.

### Common Agent Tasks

#### Adding a new KPI card
Edit `getDashboardHtml()` in `routes.ts`. Find the `<!-- KPI SUMMARY BAR -->` section. Add a new `.kpi-card` div following the existing pattern (title with SVG icon + value + subtitle).

#### Adding a new tab
1. Add a `<button class="tab-btn">` in the `<nav class="sub-navbar">` section
2. Add a `<div id="panel-{name}" style="display: none;">` in `<main>`
3. Add the tab name to the `switchTab()` function's array
4. Populate the panel content

#### Modifying the graph
The graph is built in `function renderFunctionsChart()` inside the `<script>` tag. Key variables:
- `numBuckets = 24` — number of time buckets on X axis
- `height = 540` — SVG canvas height
- `margin = { left: 55, right: 35, top: 40, bottom: 45 }`
- Lines are drawn via `generateSmoothPath(pts)` using cubic bezier curves

#### Adding a new REST endpoint
Add a new `router.get()` or `router.post()` in `createAnalyticsRoutes()` at the top of `routes.ts`.

### Testing Changes

```bash
# Start the dev server
pnpm --filter @repo/api dev

# Dashboard (browser)
open http://localhost:4000/analytics

# Event inspector (browser)
open http://localhost:4000/api/analytics

# REST API (curl)
curl http://localhost:4000/api/analytics/metrics
curl http://localhost:4000/api/analytics/calls?limit=10
curl http://localhost:4000/api/analytics/endpoints

# Generate test data
curl -X POST http://localhost:4000/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"name": "test/event", "payload": {"key": "value"}}'

# Clear all data
curl -X POST http://localhost:4000/api/analytics/clear
```

---

## Troubleshooting

### Dashboard shows "0" for all metrics
The dashboard fetches data from `/api/analytics/metrics`, `/calls`, and `/endpoints`. If everything shows 0, no API calls have been recorded yet. Hit some endpoints or use the "Ping" button to generate data.

### Graph is empty (no lines)
This usually means the SVG container has zero width when `renderFunctionsChart()` runs. The code handles this with fallback width detection (`container.clientWidth || getBoundingClientRect().width || 750`). If it persists, check that the Functions tab is visible when data loads.

### Changes to routes.ts don't appear
`tsx watch` only watches `apps/api/src/`. After editing `packages/innjest/src/server/routes.ts`, you must:
1. Press `Ctrl+C` in the terminal running `pnpm --filter @repo/api dev`
2. Run `pnpm --filter @repo/api dev` again

### React Dashboard doesn't load
The React `AnalyticsDashboard` component fetches from `/api/analytics/*`. Ensure:
- The Express server is running
- CORS allows the frontend origin
- The analytics routes are mounted at `/api/analytics`

### Memory usage grows over time
The collector stores up to 10,000 calls in memory (configurable via `maxStoredCalls`). Old calls are automatically evicted when this limit is reached (FIFO). You can also call `analyticsCollector.clearOldData(86400000)` to prune calls older than 24h.

---

## License

Private package — part of the Streamyst monorepo.
