# Internal API Analytics Dashboard - Complete Implementation Guide
## Building a tRPC API Monitoring Solution (Innjest-like UI)

---

## 📋 Project Overview

This guide will help you build `@myorg/api-analytics` - an internal package that provides:
- ✅ Real-time API call tracking & logging
- ✅ Performance metrics (response times, latency graphs)
- ✅ API metadata (authentication, rate limiting, endpoints)
- ✅ Interactive dashboard UI (Innjest-style)
- ✅ Data persistence & analytics
- ✅ Security-first design (internal only)

---

## 🏗️ Architecture Overview

```
monorepo/
├── packages/
│   ├── api-analytics/           # The new package
│   │   ├── server/              # Backend: middleware & data collection
│   │   ├── client/              # Frontend: React dashboard
│   │   ├── shared/              # Types & utilities
│   │   └── package.json
│   ├── api/                     # Your tRPC API
│   └── web/                     # Your app using the dashboard
└── package.json
```

---

## 🔧 Step 1: Create the Monorepo Package Structure

### 1.1 Create Package Directory

```bash
cd packages
mkdir api-analytics
cd api-analytics
npm init -y
```

### 1.2 Update `packages/api-analytics/package.json`

```json
{
  "name": "@myorg/api-analytics",
  "version": "1.0.0",
  "description": "Internal API analytics and monitoring dashboard",
  "private": true,
  "type": "module",
  "exports": {
    "./server": "./dist/server/index.js",
    "./client": "./dist/client/index.js",
    "./types": "./dist/shared/types.js"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "nanoid": "^5.0.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

---

## 📊 Step 2: Core Analytics Server (Middleware)

### 2.1 Create `packages/api-analytics/server/analytics.ts`

```typescript
import { nanoid } from 'nanoid';

export interface APICall {
  id: string;
  endpoint: string;
  method: 'query' | 'mutation' | 'subscription';
  status: 'success' | 'error' | 'pending';
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds
  requestSize: number;
  responseSize: number;
  statusCode: number;
  error?: string;
  userId?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface APIMetadata {
  name: string;
  description?: string;
  endpoint: string;
  method: 'query' | 'mutation';
  isAuthRequired: boolean;
  rateLimit?: {
    enabled: boolean;
    requests: number;
    windowMs: number; // milliseconds
    type: 'IP' | 'USER' | 'GLOBAL';
  };
  tags?: string[];
  averageResponseTime?: number;
  callCount?: number;
  errorCount?: number;
  lastCalled?: Date;
}

export class AnalyticsCollector {
  private calls: Map<string, APICall> = new Map();
  private metadata: Map<string, APIMetadata> = new Map();
  private maxStoredCalls: number = 10000;

  /**
   * Start tracking an API call
   */
  startCall(endpoint: string, method: 'query' | 'mutation'): string {
    const callId = nanoid();
    const call: APICall = {
      id: callId,
      endpoint,
      method,
      status: 'pending',
      startTime: performance.now(),
      requestSize: 0,
      responseSize: 0,
      statusCode: 0,
      timestamp: new Date(),
    };
    this.calls.set(callId, call);
    return callId;
  }

  /**
   * Complete an API call
   */
  endCall(
    callId: string,
    statusCode: number,
    responseSize: number,
    error?: Error
  ) {
    const call = this.calls.get(callId);
    if (!call) return;

    const endTime = performance.now();
    call.endTime = endTime;
    call.duration = endTime - call.startTime;
    call.responseSize = responseSize;
    call.statusCode = statusCode;
    call.status = error ? 'error' : statusCode >= 400 ? 'error' : 'success';
    if (error) call.error = error.message;

    // Update metadata
    this.updateMetadata(call);

    // Maintain max storage limit
    if (this.calls.size > this.maxStoredCalls) {
      const firstKey = this.calls.keys().next().value;
      this.calls.delete(firstKey);
    }
  }

  /**
   * Register API metadata
   */
  registerEndpoint(metadata: APIMetadata) {
    this.metadata.set(metadata.endpoint, metadata);
  }

  /**
   * Update metadata based on call
   */
  private updateMetadata(call: APICall) {
    const meta = this.metadata.get(call.endpoint);
    if (!meta) return;

    meta.callCount = (meta.callCount || 0) + 1;
    if (call.status === 'error') meta.errorCount = (meta.errorCount || 0) + 1;
    meta.lastCalled = new Date();

    if (call.duration) {
      meta.averageResponseTime =
        ((meta.averageResponseTime || 0) * ((meta.callCount || 1) - 1) +
          call.duration) /
        (meta.callCount || 1);
    }
  }

  /**
   * Get all calls with filtering & pagination
   */
  getCalls(
    filters?: {
      endpoint?: string;
      status?: 'success' | 'error' | 'pending';
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): APICall[] {
    let calls = Array.from(this.calls.values());

    if (filters?.endpoint) {
      calls = calls.filter((c) => c.endpoint === filters.endpoint);
    }
    if (filters?.status) {
      calls = calls.filter((c) => c.status === filters.status);
    }
    if (filters?.startDate) {
      calls = calls.filter((c) => c.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      calls = calls.filter((c) => c.timestamp <= filters.endDate!);
    }

    return calls
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get analytics summary
   */
  getAnalytics(timeWindowMs: number = 3600000) {
    const now = Date.now();
    const windowStart = new Date(now - timeWindowMs);

    const recentCalls = Array.from(this.calls.values()).filter(
      (c) => c.timestamp >= windowStart
    );

    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter((c) => c.status === 'success')
      .length;
    const failedCalls = recentCalls.filter((c) => c.status === 'error').length;
    const avgResponseTime =
      recentCalls.length > 0
        ? recentCalls.reduce((sum, c) => sum + (c.duration || 0), 0) /
          recentCalls.length
        : 0;

    const endpointStats = new Map<
      string,
      {
        calls: number;
        errors: number;
        avgTime: number;
        p95Time: number;
        p99Time: number;
      }
    >();

    recentCalls.forEach((call) => {
      if (!endpointStats.has(call.endpoint)) {
        endpointStats.set(call.endpoint, {
          calls: 0,
          errors: 0,
          avgTime: 0,
          p95Time: 0,
          p99Time: 0,
        });
      }

      const stats = endpointStats.get(call.endpoint)!;
      stats.calls++;
      if (call.status === 'error') stats.errors++;
      stats.avgTime =
        (stats.avgTime * (stats.calls - 1) + (call.duration || 0)) /
        stats.calls;
    });

    // Calculate percentiles
    endpointStats.forEach((stats, endpoint) => {
      const endpointCalls = recentCalls
        .filter((c) => c.endpoint === endpoint && c.duration)
        .map((c) => c.duration!)
        .sort((a, b) => a - b);

      if (endpointCalls.length > 0) {
        stats.p95Time =
          endpointCalls[Math.floor(endpointCalls.length * 0.95)];
        stats.p99Time =
          endpointCalls[Math.floor(endpointCalls.length * 0.99)];
      }
    });

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      avgResponseTime,
      timeWindow: timeWindowMs,
      endpointStats: Object.fromEntries(endpointStats),
    };
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints(): APIMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get specific endpoint metadata
   */
  getEndpoint(name: string): APIMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Clear old data
   */
  clearOldData(olderThanMs: number = 86400000) {
    const cutoffTime = Date.now() - olderThanMs;
    const keysToDelete: string[] = [];

    this.calls.forEach((call, key) => {
      if (call.timestamp.getTime() < cutoffTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.calls.delete(key));
  }
}

// Singleton instance
export const analyticsCollector = new AnalyticsCollector();
```

---

## 🔌 Step 3: tRPC Middleware Integration

### 3.1 Create `packages/api-analytics/server/trpc-middleware.ts`

```typescript
import { TRPCError } from '@trpc/server';
import { analyticsCollector } from './analytics';
import type { APIMetadata } from './analytics';

/**
 * Create a tRPC middleware that automatically tracks API calls
 */
export function createAnalyticsMiddleware() {
  return async function analyticsMiddleware(opts: any) {
    const { path, type } = opts;
    const callId = analyticsCollector.startCall(path, type as any);

    try {
      const result = await opts.next({
        ...opts,
      });
      analyticsCollector.endCall(callId, 200, JSON.stringify(result).length);
      return result;
    } catch (error) {
      const statusCode =
        error instanceof TRPCError ? (error.code === 'INTERNAL_SERVER_ERROR' ? 500 : 400) : 500;
      analyticsCollector.endCall(
        callId,
        statusCode,
        0,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  };
}

/**
 * Register endpoint metadata in your tRPC router
 */
export function registerTRPCEndpoint(metadata: APIMetadata) {
  analyticsCollector.registerEndpoint(metadata);
}
```

### 3.2 Integration in Your tRPC API

Create a file: `packages/api/src/server/trpc.ts`

```typescript
import { initTRPC } from '@trpc/server';
import {
  createAnalyticsMiddleware,
  registerTRPCEndpoint,
} from '@myorg/api-analytics/server';
import { analyticsCollector } from '@myorg/api-analytics/server';

const t = initTRPC.context<typeof createContext>().create({
  middleware: createAnalyticsMiddleware(),
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

// Register endpoints
registerTRPCEndpoint({
  name: 'users.getProfile',
  endpoint: 'users.getProfile',
  method: 'query',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 100,
    windowMs: 60000,
    type: 'USER',
  },
  description: 'Get authenticated user profile',
  tags: ['users', 'auth'],
});

registerTRPCEndpoint({
  name: 'posts.create',
  endpoint: 'posts.create',
  method: 'mutation',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 10,
    windowMs: 60000,
    type: 'USER',
  },
  description: 'Create a new post',
  tags: ['posts'],
});
```

---

## 🎨 Step 4: Frontend Dashboard (React + TypeScript)

### 4.1 Create `packages/api-analytics/client/types.ts`

```typescript
export interface DashboardMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  avgResponseTime: number;
  timeWindow: number;
  endpointStats: Record<
    string,
    {
      calls: number;
      errors: number;
      avgTime: number;
      p95Time: number;
      p99Time: number;
    }
  >;
}

export interface TimeSeriesData {
  timestamp: number;
  calls: number;
  errors: number;
  avgResponseTime: number;
}

export interface PerformanceChart {
  endpoint: string;
  data: Array<{
    time: string;
    duration: number;
    status: 'success' | 'error';
  }>;
}
```

### 4.2 Create `packages/api-analytics/client/Dashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import styles from './Dashboard.module.css';

interface APICall {
  id: string;
  endpoint: string;
  method: 'query' | 'mutation';
  status: 'success' | 'error' | 'pending';
  duration?: number;
  timestamp: Date;
  statusCode: number;
  error?: string;
}

interface APIMetadata {
  name: string;
  endpoint: string;
  method: 'query' | 'mutation';
  isAuthRequired: boolean;
  rateLimit?: {
    enabled: boolean;
    requests: number;
    windowMs: number;
    type: 'IP' | 'USER' | 'GLOBAL';
  };
  averageResponseTime?: number;
  callCount?: number;
  errorCount?: number;
  lastCalled?: Date;
}

interface DashboardProps {
  apiBase: string;
}

export const Analytics Dashboard: React.FC<DashboardProps> = ({ apiBase }) => {
  const [calls, setCalls] = useState<APICall[]>([]);
  const [endpoints, setEndpoints] = useState<APIMetadata[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch metrics
        const metricsRes = await fetch(`${apiBase}/api/analytics/metrics`);
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);

        // Fetch endpoints
        const endpointsRes = await fetch(
          `${apiBase}/api/analytics/endpoints`
        );
        const endpointsData = await endpointsRes.json();
        setEndpoints(endpointsData);

        // Fetch calls
        const callsRes = await fetch(`${apiBase}/api/analytics/calls`);
        const callsData = await callsRes.json();
        setCalls(callsData);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [apiBase, autoRefresh, timeRange]);

  if (loading && calls.length === 0) {
    return <div className={styles.loading}>Loading analytics...</div>;
  }

  const successRateData = [
    { name: 'Success', value: metrics?.successfulCalls || 0 },
    { name: 'Errors', value: metrics?.failedCalls || 0 },
  ];

  const chartColors = ['#10b981', '#ef4444'];

  const timeSeriesData = calls
    .reduce(
      (acc, call) => {
        const minute = new Date(call.timestamp).toLocaleTimeString();
        let existing = acc.find((d) => d.time === minute);
        if (!existing) {
          existing = { time: minute, calls: 0, errors: 0, avgTime: 0 };
          acc.push(existing);
        }
        existing.calls++;
        if (call.status === 'error') existing.errors++;
        return acc;
      },
      [] as any[]
    )
    .slice(-30);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1>API Analytics Dashboard</h1>
        <div className={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className={styles.select}
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.card}>
          <h3>Total API Calls</h3>
          <p className={styles.metric}>{metrics?.totalCalls || 0}</p>
        </div>
        <div className={styles.card}>
          <h3>Success Rate</h3>
          <p className={`${styles.metric} ${metrics?.successRate > 95 ? styles.success : styles.warning}`}>
            {(metrics?.successRate || 0).toFixed(2)}%
          </p>
        </div>
        <div className={styles.card}>
          <h3>Avg Response Time</h3>
          <p className={styles.metric}>
            {(metrics?.avgResponseTime || 0).toFixed(2)}ms
          </p>
        </div>
        <div className={styles.card}>
          <h3>Error Rate</h3>
          <p className={`${styles.metric} ${(metrics?.failedCalls || 0) > 0 ? styles.error : styles.success}`}>
            {metrics?.failedCalls || 0}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Success Rate Pie Chart */}
        <div className={styles.chartCard}>
          <h3>Success vs Errors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={successRateData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartColors.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Time Series Chart */}
        <div className={styles.chartCard}>
          <h3>API Calls Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#3b82f6"
                name="Total Calls"
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="#ef4444"
                name="Errors"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Endpoint Performance */}
        <div className={styles.chartCard}>
          <h3>Endpoint Response Times</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(metrics?.endpointStats || {}).map(([endpoint, stats]: any) => ({
              endpoint: endpoint.split('.').pop(),
              avgTime: stats.avgTime.toFixed(2),
              p95: stats.p95Time.toFixed(2),
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgTime" fill="#10b981" name="Avg (ms)" />
              <Bar dataKey="p95" fill="#f59e0b" name="P95 (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Endpoints List */}
      <div className={styles.section}>
        <h2>API Endpoints</h2>
        <div className={styles.endpointsList}>
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.endpoint}
              className={`${styles.endpointCard} ${selectedEndpoint === endpoint.endpoint ? styles.selected : ''}`}
              onClick={() =>
                setSelectedEndpoint(
                  selectedEndpoint === endpoint.endpoint
                    ? null
                    : endpoint.endpoint
                )
              }
            >
              <div className={styles.endpointHeader}>
                <span className={styles.badge}>{endpoint.method.toUpperCase()}</span>
                <h4>{endpoint.name}</h4>
                <span className={styles.auth}>
                  {endpoint.isAuthRequired ? '🔒 Auth Required' : '🔓 Public'}
                </span>
              </div>

              {selectedEndpoint === endpoint.endpoint && (
                <div className={styles.endpointDetails}>
                  <div className={styles.detailRow}>
                    <span>Calls:</span>
                    <strong>{endpoint.callCount || 0}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Errors:</span>
                    <strong>{endpoint.errorCount || 0}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Avg Response Time:</span>
                    <strong>{(endpoint.averageResponseTime || 0).toFixed(2)}ms</strong>
                  </div>
                  {endpoint.rateLimit?.enabled && (
                    <div className={styles.rateLimit}>
                      <h5>Rate Limit</h5>
                      <p>
                        {endpoint.rateLimit.requests} requests per{' '}
                        {endpoint.rateLimit.windowMs / 1000}s ({endpoint.rateLimit.type})
                      </p>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span>Last Called:</span>
                    <strong>
                      {endpoint.lastCalled
                        ? new Date(endpoint.lastCalled).toLocaleString()
                        : 'Never'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calls Log */}
      <div className={styles.section}>
        <h2>Recent API Calls</h2>
        <div className={styles.callsTable}>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Endpoint</th>
                <th>Method</th>
                <th>Status</th>
                <th>Duration (ms)</th>
                <th>Status Code</th>
              </tr>
            </thead>
            <tbody>
              {calls.slice(0, 50).map((call) => (
                <tr
                  key={call.id}
                  className={`${call.status === 'error' ? styles.errorRow : ''}`}
                >
                  <td>{new Date(call.timestamp).toLocaleTimeString()}</td>
                  <td className={styles.endpoint}>{call.endpoint}</td>
                  <td>
                    <span className={styles.methodBadge}>{call.method.toUpperCase()}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[call.status]}`}
                    >
                      {call.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{(call.duration || 0).toFixed(2)}</td>
                  <td>{call.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics Dashboard;
```

### 4.3 Create `packages/api-analytics/client/Dashboard.module.css`

```css
.dashboard {
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.select,
.checkbox {
  padding: 0.5rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
}

.select:hover {
  border-color: #64748b;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
}

.checkbox input {
  cursor: pointer;
}

/* KPI Grid */
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: #f1f5f9;
}

.metric.success {
  color: #10b981;
}

.metric.warning {
  color: #f59e0b;
}

.metric.error {
  color: #ef4444;
}

/* Charts Grid */
.chartsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chartCard {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chartCard h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #f1f5f9;
}

/* Section */
.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 1.5rem 0;
  color: #f1f5f9;
}

/* Endpoints List */
.endpointsList {
  display: grid;
  gap: 1rem;
}

.endpointCard {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.endpointCard:hover {
  border-color: #64748b;
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
}

.endpointCard.selected {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
}

.endpointHeader {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0;
}

.badge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.endpointHeader h4 {
  margin: 0;
  flex: 1;
  font-size: 1rem;
}

.auth {
  font-size: 0.75rem;
  color: #94a3b8;
}

.endpointDetails {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}

.detailRow {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.detailRow span {
  color: #94a3b8;
}

.detailRow strong {
  color: #f1f5f9;
  font-weight: 600;
}

.rateLimit {
  margin-top: 1rem;
  padding: 1rem;
  background: #0f172a;
  border-radius: 0.5rem;
  border: 1px solid #334155;
}

.rateLimit h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #f59e0b;
}

.rateLimit p {
  margin: 0;
  font-size: 0.875rem;
  color: #cbd5e1;
}

/* Calls Table */
.callsTable {
  overflow-x: auto;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 0.75rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

table thead {
  background: #0f172a;
  border-bottom: 2px solid #334155;
}

table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #cbd5e1;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

table td {
  padding: 1rem;
  border-bottom: 1px solid #334155;
  color: #cbd5e1;
}

table tbody tr:hover {
  background: #1e293b;
}

.errorRow {
  background: rgba(239, 68, 68, 0.05);
}

.endpoint {
  font-family: 'Monaco', 'Courier New', monospace;
  color: #60a5fa;
  font-weight: 500;
}

.methodBadge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}

.statusBadge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}

.statusBadge.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.statusBadge.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.statusBadge.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1rem;
  color: #94a3b8;
}
```

---

## 🛠️ Step 5: Backend HTTP Routes (Express/Node)

### 5.1 Create `packages/api-analytics/server/routes.ts`

```typescript
import express from 'express';
import { analyticsCollector } from './analytics';

export function createAnalyticsRoutes() {
  const router = express.Router();

  /**
   * GET /api/analytics/metrics
   * Get overall metrics for the time period
   */
  router.get('/metrics', (req, res) => {
    const timeWindow = req.query.timeWindow
      ? parseInt(req.query.timeWindow as string)
      : 3600000; // default 1 hour

    const analytics = analyticsCollector.getAnalytics(timeWindow);
    res.json(analytics);
  });

  /**
   * GET /api/analytics/calls
   * Get list of API calls with filtering
   */
  router.get('/calls', (req, res) => {
    const endpoint = req.query.endpoint as string | undefined;
    const status = req.query.status as any | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const calls = analyticsCollector.getCalls(
      {
        endpoint,
        status,
      },
      limit,
      offset
    );

    res.json(calls);
  });

  /**
   * GET /api/analytics/endpoints
   * Get all registered endpoints with metadata
   */
  router.get('/endpoints', (req, res) => {
    const endpoints = analyticsCollector.getEndpoints();
    res.json(endpoints);
  });

  /**
   * GET /api/analytics/endpoints/:name
   * Get specific endpoint metadata
   */
  router.get('/endpoints/:name', (req, res) => {
    const endpoint = analyticsCollector.getEndpoint(req.params.name);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.json(endpoint);
  });

  /**
   * POST /api/analytics/clear
   * Clear old analytics data (should be admin-only!)
   */
  router.post('/clear', (req, res) => {
    // TODO: Add authentication check
    const olderThanHours = parseInt(req.body.olderThanHours) || 24;
    analyticsCollector.clearOldData(olderThanHours * 3600000);
    res.json({ success: true });
  });

  return router;
}
```

### 5.2 Integrate into Your Main API

In `packages/api/src/index.ts`:

```typescript
import express from 'express';
import { createAnalyticsRoutes } from '@myorg/api-analytics/server';

const app = express();

// Add analytics routes
app.use('/api/analytics', createAnalyticsRoutes());

// Your other routes
// ...

app.listen(3000);
```

---

## 🎯 Step 6: Integration in Your Web App

### 6.1 Install the Dashboard in Your Web Package

In `packages/web/package.json`:

```json
{
  "dependencies": {
    "@myorg/api-analytics": "workspace:*",
    "recharts": "^2.10.0"
  }
}
```

### 6.2 Use the Dashboard

In `packages/web/src/pages/admin/analytics.tsx`:

```typescript
import React from 'react';
import { AnalyticsDashboard } from '@myorg/api-analytics/client';

export default function AnalyticsPage() {
  return (
    <AnalyticsDashboard apiBase="http://localhost:3000" />
  );
}
```

---

## 🔒 Step 7: Security Best Practices

### 7.1 Protect Analytics Routes

Create middleware in `packages/api/src/middleware/analytics-auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export function protectAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only allow internal IPs or authenticated admins
  const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
  const clientIP = req.ip;

  const isAdmin = req.user?.role === 'ADMIN'; // Adjust based on your auth

  if (!allowedIPs.includes(clientIP!) && !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
}
```

### 7.2 Apply Middleware

```typescript
import { protectAnalytics } from './middleware/analytics-auth';

app.use('/api/analytics', protectAnalytics, createAnalyticsRoutes());
```

### 7.3 Sensitive Data Filtering

```typescript
// In your middleware, filter PII
export function filterSensitiveData(call: APICall): APICall {
  return {
    ...call,
    // Don't log full request/response bodies for auth endpoints
    requestSize: call.endpoint.includes('auth') ? 0 : call.requestSize,
    ipAddress: undefined, // Don't expose IPs
    userId: undefined, // Don't expose user IDs in logs
  };
}
```

---

## 📦 Step 8: Database Persistence (Optional)

For production, you'll want to persist analytics to a database.

### 8.1 Create `packages/api-analytics/server/database.ts`

```typescript
import { Database } from 'sqlite3';
import { APICall } from './analytics';

export class AnalyticsDB {
  private db: Database;

  constructor(dbPath: string = './analytics.db') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS api_calls (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status TEXT NOT NULL,
          duration REAL,
          statusCode INTEGER,
          error TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE INDEX IF NOT EXISTS idx_endpoint ON api_calls(endpoint);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON api_calls(timestamp);
      `);
    });
  }

  async saveCall(call: APICall): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO api_calls (id, endpoint, method, status, duration, statusCode, error, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          call.id,
          call.endpoint,
          call.method,
          call.status,
          call.duration,
          call.statusCode,
          call.error,
          call.timestamp.toISOString(),
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getCallsBetween(startDate: Date, endDate: Date): Promise<APICall[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT * FROM api_calls
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC
      `,
        [startDate.toISOString(), endDate.toISOString()],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

---

## 🚀 Step 9: Deployment Checklist

- [ ] Add `.env` file for configuration
- [ ] Enable HTTPS for dashboard
- [ ] Set up IP whitelisting
- [ ] Implement authentication for analytics routes
- [ ] Set up regular data cleanup tasks
- [ ] Monitor dashboard performance
- [ ] Add data retention policies
- [ ] Test with production-like load
- [ ] Document dashboard for team

---

## 📊 Step 10: Advanced Features (Future Enhancements)

### Rate Limit Tracking
```typescript
export interface RateLimitEvent {
  endpoint: string;
  userId?: string;
  ipAddress?: string;
  limitReached: boolean;
  retryAfter?: number;
  timestamp: Date;
}
```

### Distributed Tracing
```typescript
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  parentTraceContext?: string;
}
```

### Alerts & Notifications
```typescript
export interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  action: (metrics: any) => Promise<void>; // Send email, Slack, etc
}
```

### Comparison View
```typescript
// Compare metrics across time periods
export function compareMetrics(
  current: DashboardMetrics,
  previous: DashboardMetrics
) {
  return {
    callsChange: ((current.totalCalls - previous.totalCalls) / previous.totalCalls) * 100,
    responseTimeChange: ((current.avgResponseTime - previous.avgResponseTime) / previous.avgResponseTime) * 100,
    errorRateChange: ((current.failedCalls - previous.failedCalls) / previous.failedCalls) * 100,
  };
}
```

---

## 📝 Example Configuration File

Create `analytics.config.ts` for your app:

```typescript
import { registerTRPCEndpoint } from '@myorg/api-analytics/server';

export function setupAnalytics() {
  registerTRPCEndpoint({
    name: 'users.list',
    endpoint: 'users.list',
    method: 'query',
    isAuthRequired: false,
    rateLimit: {
      enabled: true,
      requests: 100,
      windowMs: 60000,
      type: 'IP',
    },
    description: 'Get all users (paginated)',
    tags: ['users', 'public'],
  });

  registerTRPCEndpoint({
    name: 'users.delete',
    endpoint: 'users.delete',
    method: 'mutation',
    isAuthRequired: true,
    rateLimit: {
      enabled: true,
      requests: 10,
      windowMs: 3600000,
      type: 'USER',
    },
    description: 'Delete a user (admin only)',
    tags: ['users', 'admin', 'destructive'],
  });

  // ... register all your endpoints
}
```

---

## 🎓 Key Takeaways

1. **Modular Design**: The analytics package is completely separate from your API
2. **Zero Overhead**: Uses tRPC middleware pattern for automatic tracking
3. **Real-time**: Dashboard updates every 5 seconds by default
4. **Flexible**: Can store in memory, database, or external service
5. **Secure**: Protected routes with authentication
6. **Scalable**: Ready for production with proper database backend
7. **Developer-friendly**: Clean API for registering endpoints
8. **Similar to Innjest**: Provides metrics, graphs, and endpoint details

---

## 🔗 Next Steps

1. Clone this structure into your monorepo
2. Integrate the middleware into your tRPC router
3. Register all your endpoints
4. Deploy the dashboard to `/admin/analytics`
5. Monitor and optimize based on the insights

This solution gives you complete control over your API analytics while maintaining security and performance!
