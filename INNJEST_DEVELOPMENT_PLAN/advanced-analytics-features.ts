/**
 * ADVANCED FEATURES FOR API ANALYTICS DASHBOARD
 * Real-world implementation examples and extensions
 */

// ==================== 1. RATE LIMIT TRACKING ====================

export interface RateLimitConfig {
  enabled: boolean;
  requests: number;
  windowMs: number; // milliseconds
  type: 'IP' | 'USER' | 'GLOBAL';
  keyGenerator?: (req: any) => string; // Custom key for limiting
}

export interface RateLimitEvent {
  endpoint: string;
  key: string; // IP or User ID
  limitReached: boolean;
  currentCount: number;
  maxRequests: number;
  resetAt: Date;
  timestamp: Date;
}

export class RateLimitTracker {
  private buckets: Map<string, { count: number; resetAt: Date }> = new Map();
  private events: RateLimitEvent[] = [];

  checkLimit(
    endpoint: string,
    config: RateLimitConfig,
    key: string
  ): { allowed: boolean; retryAfter?: number } {
    const bucketKey = \`\${endpoint}:\${key}\`;
    const now = Date.now();
    let bucket = this.buckets.get(bucketKey);

    // Reset bucket if window has passed
    if (!bucket || bucket.resetAt.getTime() < now) {
      bucket = {
        count: 0,
        resetAt: new Date(now + config.windowMs),
      };
      this.buckets.set(bucketKey, bucket);
    }

    bucket.count++;

    const allowed = bucket.count <= config.requests;
    const event: RateLimitEvent = {
      endpoint,
      key,
      limitReached: !allowed,
      currentCount: bucket.count,
      maxRequests: config.requests,
      resetAt: bucket.resetAt,
      timestamp: new Date(),
    };

    this.events.push(event);

    return {
      allowed,
      retryAfter: allowed ? undefined : Math.ceil((bucket.resetAt.getTime() - now) / 1000),
    };
  }

  getEvents(): RateLimitEvent[] {
    return this.events.slice(-1000); // Keep last 1000 events
  }

  getStats() {
    const limitedEndpoints = new Map<string, number>();

    this.events.forEach((event) => {
      if (event.limitReached) {
        limitedEndpoints.set(
          event.endpoint,
          (limitedEndpoints.get(event.endpoint) || 0) + 1
        );
      }
    });

    return Object.fromEntries(limitedEndpoints);
  }
}

// ==================== 2. PERFORMANCE PERCENTILES ====================

export interface PerformanceStats {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export function calculatePercentiles(durations: number[]): PerformanceStats {
  if (durations.length === 0) {
    return {
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, index)];
  };

  const mean = durations.reduce((a, b) => a + b, 0) / n;
  const variance =
    durations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    stdDev,
  };
}

// ==================== 3. CUSTOM REACT COMPONENTS ====================

/**
 * Advanced Performance Chart Component
 */
export const PerformanceChart = \`
import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    time: string;
    p50: number;
    p95: number;
    p99: number;
  }>;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="p50"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#colorP50)"
          name="P50 (Median)"
        />
        <Area
          type="monotone"
          dataKey="p95"
          stroke="#f59e0b"
          fillOpacity={1}
          fill="url(#colorP95)"
          name="P95"
        />
        <Line
          type="monotone"
          dataKey="p99"
          stroke="#ef4444"
          strokeWidth={2}
          name="P99"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
\`;

/**
 * Real-time Status Indicator Component
 */
export const StatusIndicator = \`
import React, { useEffect, useState } from 'react';
import styles from './StatusIndicator.module.css';

interface StatusIndicatorProps {
  apiBase: string;
  updateInterval?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  apiBase,
  updateInterval = 1000,
}) => {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [responseTime, setResponseTime] = useState(0);

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(\\\`\\\${apiBase}/api/analytics/metrics\\\`, {
          signal: AbortSignal.timeout(5000),
        });
        const endTime = performance.now();
        const time = endTime - startTime;

        setResponseTime(time);

        if (response.ok) {
          if (time < 100) {
            setStatus('healthy');
          } else if (time < 500) {
            setStatus('degraded');
          } else {
            setStatus('degraded');
          }
        } else {
          setStatus('down');
        }
      } catch {
        setStatus('down');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, updateInterval);
    return () => clearInterval(interval);
  }, [apiBase, updateInterval]);

  return (
    <div className={styles.indicator}>
      <div className={styles[status]}>
        <span className={styles.dot} />
        <span className={styles.text}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className={styles.responseTime}>
        {responseTime.toFixed(0)}ms
      </div>
    </div>
  );
};
\`;

// ==================== 4. DISTRIBUTED TRACING SUPPORT ====================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export function generateTraceId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSpanId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Distributed Tracing Middleware for tRPC
 */
export const distributedTracingMiddleware = \`
import { v4 as uuidv4 } from 'uuid';

export function createDistributedTracingMiddleware() {
  return async function tracingMiddleware(opts: any) {
    const traceId = opts.ctx?.traceId || generateTraceId();
    const spanId = generateSpanId();
    const startTime = Date.now();

    const result = await opts.next({
      ...opts,
      ctx: {
        ...opts.ctx,
        traceId,
        spanId,
      },
    });

    const duration = Date.now() - startTime;

    console.log({
      traceId,
      spanId,
      procedure: opts.path,
      duration,
      type: opts.type,
    });

    return result;
  };
}
\`;

// ==================== 5. ALERT SYSTEM ====================

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  condition: (metrics: any) => boolean;
  severity: AlertSeverity;
  actions: AlertAction[];
  cooldown?: number; // Minimum time between alerts (ms)
  lastTriggered?: Date;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'log';
  target: string; // email address, slack channel, webhook URL, etc
  message?: string;
}

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Array<{ rule: AlertRule; timestamp: Date }> = [];

  registerRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
  }

  async checkRules(metrics: any) {
    const now = Date.now();

    for (const [_, rule] of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLast = now - rule.lastTriggered.getTime();
        if (rule.cooldown && timeSinceLast < rule.cooldown) {
          continue;
        }
      }

      // Check condition
      if (rule.condition(metrics)) {
        rule.lastTriggered = new Date();
        this.alerts.push({ rule, timestamp: new Date() });

        // Execute actions
        for (const action of rule.actions) {
          await this.executeAction(action, rule, metrics);
        }
      }
    }
  }

  private async executeAction(
    action: AlertAction,
    rule: AlertRule,
    metrics: any
  ) {
    switch (action.type) {
      case 'email':
        // Send email
        console.log(\`Sending email to \${action.target}: \${rule.name}\`);
        break;
      case 'slack':
        // Post to Slack
        console.log(\`Posting to Slack \${action.target}: \${rule.name}\`);
        break;
      case 'webhook':
        // Call webhook
        try {
          await fetch(action.target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rule, metrics }),
          });
        } catch (err) {
          console.error('Webhook failed:', err);
        }
        break;
      case 'log':
        console.log(\`[ALERT] \${rule.severity.toUpperCase()}: \${rule.name}\`);
        break;
    }
  }

  getAlerts(limit = 100): Array<{ rule: AlertRule; timestamp: Date }> {
    return this.alerts.slice(-limit);
  }
}

// ==================== 6. EXAMPLE ALERT RULES ====================

export const DEFAULT_ALERT_RULES = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Triggered when error rate exceeds 5%',
    enabled: true,
    condition: (metrics: any) => {
      const errorRate = (metrics.failedCalls / metrics.totalCalls) * 100;
      return errorRate > 5;
    },
    severity: 'error' as AlertSeverity,
    actions: [
      { type: 'log' as const, target: '' },
      { type: 'slack', target: '#api-alerts' },
    ],
    cooldown: 300000, // 5 minutes
  },
  {
    id: 'slow-response-time',
    name: 'Slow Response Time',
    description: 'Triggered when average response time exceeds 1000ms',
    enabled: true,
    condition: (metrics: any) => metrics.avgResponseTime > 1000,
    severity: 'warning' as AlertSeverity,
    actions: [
      { type: 'log' as const, target: '' },
      { type: 'slack', target: '#api-performance' },
    ],
    cooldown: 600000, // 10 minutes
  },
  {
    id: 'rate-limit-exceeded',
    name: 'Rate Limit Exceeded',
    description: 'Triggered when rate limits are hit',
    enabled: true,
    condition: (metrics: any) => {
      return Object.values(metrics.endpointStats).some(
        (stats: any) => stats.rateLimitHits > 10
      );
    },
    severity: 'warning' as AlertSeverity,
    actions: [
      { type: 'log' as const, target: '' },
      { type: 'webhook', target: 'https://monitoring.example.com/alerts' },
    ],
  },
  {
    id: 'critical-endpoint-down',
    name: 'Critical Endpoint Down',
    description: 'Triggered when a critical endpoint has 100% error rate',
    enabled: true,
    condition: (metrics: any) => {
      return Object.entries(metrics.endpointStats).some(([endpoint, stats]: any) => {
        return (
          endpoint.includes('auth') &&
          stats.errors === stats.calls &&
          stats.calls > 0
        );
      });
    },
    severity: 'critical' as AlertSeverity,
    actions: [
      { type: 'log' as const, target: '' },
      { type: 'slack', target: '#critical-alerts' },
      { type: 'email', target: 'oncall@example.com' },
    ],
  },
];

// ==================== 7. CUSTOM HOOKS ====================

/**
 * Hook for real-time alerts
 */
export const useAlerts = \`
import { useState, useEffect } from 'react';

export function useAlerts(apiBase: string, updateInterval = 10000) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(\\\`\\\${apiBase}/api/analytics/alerts\\\`);
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, updateInterval);
    return () => clearInterval(interval);
  }, [apiBase, updateInterval]);

  return { alerts, loading };
}
\`;

// ==================== 8. DATA EXPORT & REPORTING ====================

export async function exportMetricsAsCSV(
  metrics: any,
  endpoints: any[]
): Promise<string> {
  const rows = [
    ['Endpoint Analytics Export', new Date().toISOString()],
    [],
    ['Endpoint', 'Method', 'Total Calls', 'Errors', 'Avg Response Time (ms)', 'Auth Required'],
  ];

  endpoints.forEach((endpoint) => {
    const stats = metrics.endpointStats[endpoint.endpoint] || {};
    rows.push([
      endpoint.name,
      endpoint.method,
      stats.calls || 0,
      stats.errors || 0,
      (stats.avgTime || 0).toFixed(2),
      endpoint.isAuthRequired ? 'Yes' : 'No',
    ]);
  });

  return rows.map((row) => row.map((cell) => \`"\${cell}"\`).join(',')).join('\\n');
}

/**
 * Export as PDF Report
 */
export async function generatePDFReport(metrics: any, endpoints: any[]) {
  // Would integrate with a PDF library like jsPDF or pdfkit
  const reportData = {
    generatedAt: new Date().toISOString(),
    totalCalls: metrics.totalCalls,
    successRate: metrics.successRate,
    avgResponseTime: metrics.avgResponseTime,
    endpoints: endpoints.map((ep) => ({
      name: ep.name,
      stats: metrics.endpointStats[ep.endpoint],
    })),
  };

  return reportData;
}

// ==================== 9. INTEGRATION EXAMPLE ====================

/**
 * Complete integration example
 */
export const COMPLETE_INTEGRATION_EXAMPLE = \`
// packages/api/src/setup.ts

import { initTRPC } from '@trpc/server';
import {
  createAnalyticsMiddleware,
  registerTRPCEndpoint,
  analyticsCollector,
} from '@myorg/api-analytics/server';
import {
  RateLimitTracker,
  AlertManager,
  DEFAULT_ALERT_RULES,
  createDistributedTracingMiddleware,
} from '@myorg/api-analytics/server';

// Initialize analytics components
const rateLimitTracker = new RateLimitTracker();
const alertManager = new AlertManager();

// Register alert rules
DEFAULT_ALERT_RULES.forEach((rule) => alertManager.registerRule(rule));

// Create tRPC instance with middleware
const t = initTRPC
  .context<typeof createContext>()
  .create({
    middleware: createAnalyticsMiddleware(),
  })
  .use(createDistributedTracingMiddleware());

// Setup periodic alert checking
setInterval(async () => {
  const metrics = analyticsCollector.getAnalytics();
  await alertManager.checkRules(metrics);
}, 30000); // Check every 30 seconds

// Register endpoints with rate limiting
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
});

export { t, rateLimitTracker, alertManager };
\`;

console.log('Advanced Analytics Features - Implementation Ready');
