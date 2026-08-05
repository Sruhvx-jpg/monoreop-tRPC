import { nanoid } from 'nanoid';
import type {
  APICall,
  APIMetadata,
  AnalyticsSummary,
  EndpointStats,
  FilterOptions,
} from '../shared/types';

function generateId(): string {
  try {
    return nanoid();
  } catch {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}

export class AnalyticsCollector {
  private calls: Map<string, APICall> = new Map();
  private metadata: Map<string, APIMetadata> = new Map();
  private maxStoredCalls: number = 10000;

  /**
   * Start tracking an API call
   */
  startCall(
    endpoint: string,
    method: 'query' | 'mutation' | 'subscription' = 'query',
    userId?: string,
    ipAddress?: string
  ): string {
    const callId = generateId();
    const call: APICall = {
      id: callId,
      endpoint,
      method,
      status: 'pending',
      startTime: performance.now(),
      requestSize: 0,
      responseSize: 0,
      statusCode: 0,
      userId,
      ipAddress,
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
  ): void {
    const call = this.calls.get(callId);
    if (!call) return;

    const endTime = performance.now();
    call.endTime = endTime;
    call.duration = Math.max(0, endTime - call.startTime);
    call.responseSize = responseSize;
    call.statusCode = statusCode;
    call.status = error || statusCode >= 400 ? 'error' : 'success';
    if (error) {
      call.error = error.message;
    }

    // Update endpoint metadata
    this.updateMetadata(call);

    // Maintain max stored calls limit
    if (this.calls.size > this.maxStoredCalls) {
      const firstKey = this.calls.keys().next().value;
      if (firstKey) {
        this.calls.delete(firstKey);
      }
    }
  }

  /**
   * Register API endpoint metadata
   */
  registerEndpoint(metadata: APIMetadata): void {
    const existing = this.metadata.get(metadata.endpoint);
    this.metadata.set(metadata.endpoint, {
      ...metadata,
      callCount: existing?.callCount ?? metadata.callCount ?? 0,
      errorCount: existing?.errorCount ?? metadata.errorCount ?? 0,
      averageResponseTime: existing?.averageResponseTime ?? metadata.averageResponseTime ?? 0,
      lastCalled: existing?.lastCalled ?? metadata.lastCalled,
    });
  }

  /**
   * Update metadata based on an completed API call
   */
  private updateMetadata(call: APICall): void {
    let meta = this.metadata.get(call.endpoint);

    if (!meta) {
      // Auto-register endpoint if not registered yet
      meta = {
        name: call.endpoint,
        endpoint: call.endpoint,
        method: call.method === 'mutation' ? 'mutation' : 'query',
        isAuthRequired: false,
        callCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
      };
      this.metadata.set(call.endpoint, meta);
    }

    const currentCount = meta.callCount || 0;
    const newCount = currentCount + 1;
    meta.callCount = newCount;

    if (call.status === 'error') {
      meta.errorCount = (meta.errorCount || 0) + 1;
    }

    meta.lastCalled = new Date();

    if (typeof call.duration === 'number') {
      const prevAvg = meta.averageResponseTime || 0;
      meta.averageResponseTime = (prevAvg * currentCount + call.duration) / newCount;
    }
  }

  /**
   * Get all calls with filtering & pagination
   */
  getCalls(
    filters?: FilterOptions,
    limit: number = 100,
    offset: number = 0
  ): APICall[] {
    let callsList = Array.from(this.calls.values());

    if (filters?.endpoint) {
      const epFilter = filters.endpoint.toLowerCase();
      callsList = callsList.filter((c) => c.endpoint.toLowerCase().includes(epFilter));
    }
    if (filters?.status) {
      callsList = callsList.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      callsList = callsList.filter(
        (c) =>
          c.endpoint.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          (c.error && c.error.toLowerCase().includes(query))
      );
    }
    if (filters?.startDate) {
      const startTime = new Date(filters.startDate).getTime();
      callsList = callsList.filter((c) => new Date(c.timestamp).getTime() >= startTime);
    }
    if (filters?.endDate) {
      const endTime = new Date(filters.endDate).getTime();
      callsList = callsList.filter((c) => new Date(c.timestamp).getTime() <= endTime);
    }

    return callsList
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get analytics summary for a given time window (default 1 hour = 3600000 ms)
   */
  getAnalytics(timeWindowMs: number = 3600000): AnalyticsSummary {
    const now = Date.now();
    const windowStart = now - timeWindowMs;

    const recentCalls = Array.from(this.calls.values()).filter((c) => {
      const t = new Date(c.timestamp).getTime();
      return t >= windowStart;
    });

    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter((c) => c.status === 'success').length;
    const failedCalls = recentCalls.filter((c) => c.status === 'error').length;
    const totalDuration = recentCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgResponseTime = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    const endpointStatsMap = new Map<
      string,
      { calls: number; errors: number; totalTime: number; durations: number[] }
    >();

    recentCalls.forEach((call) => {
      if (!endpointStatsMap.has(call.endpoint)) {
        endpointStatsMap.set(call.endpoint, {
          calls: 0,
          errors: 0,
          totalTime: 0,
          durations: [],
        });
      }

      const stats = endpointStatsMap.get(call.endpoint)!;
      stats.calls++;
      if (call.status === 'error') {
        stats.errors++;
      }
      const dur = call.duration || 0;
      stats.totalTime += dur;
      stats.durations.push(dur);
    });

    const endpointStats: Record<string, EndpointStats> = {};

    endpointStatsMap.forEach((stats, endpoint) => {
      stats.durations.sort((a, b) => a - b);
      const len = stats.durations.length;
      const p95Idx = Math.floor(len * 0.95);
      const p99Idx = Math.floor(len * 0.99);

      endpointStats[endpoint] = {
        calls: stats.calls,
        errors: stats.errors,
        avgTime: stats.calls > 0 ? stats.totalTime / stats.calls : 0,
        p95Time: len > 0 ? (stats.durations[p95Idx] ?? stats.durations[len - 1] ?? 0) : 0,
        p99Time: len > 0 ? (stats.durations[p99Idx] ?? stats.durations[len - 1] ?? 0) : 0,
      };
    });

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate,
      avgResponseTime,
      timeWindow: timeWindowMs,
      endpointStats,
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
   * Clear calls older than specified milliseconds
   */
  clearOldData(olderThanMs: number = 86400000): void {
    const cutoffTime = Date.now() - olderThanMs;
    const keysToDelete: string[] = [];

    this.calls.forEach((call, key) => {
      if (new Date(call.timestamp).getTime() < cutoffTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.calls.delete(key));
  }

  /**
   * Clear all call logs in memory
   */
  clearData(): void {
    this.calls.clear();
    this.metadata.forEach((meta) => {
      meta.callCount = 0;
      meta.errorCount = 0;
      meta.averageResponseTime = 0;
    });
  }
}

// Export singleton instance
export const analyticsCollector = new AnalyticsCollector();
