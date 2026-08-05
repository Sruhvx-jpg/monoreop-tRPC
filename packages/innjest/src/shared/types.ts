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
  timestamp: Date | string;
}

export interface RateLimitConfig {
  enabled: boolean;
  requests: number;
  windowMs: number; // milliseconds
  type: 'IP' | 'USER' | 'GLOBAL';
}

export interface APIMetadata {
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

export interface EndpointStats {
  calls: number;
  errors: number;
  avgTime: number;
  p95Time: number;
  p99Time: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  avgResponseTime: number;
  timeWindow: number;
  endpointStats: Record<string, EndpointStats>;
}

export interface FilterOptions {
  endpoint?: string;
  status?: 'success' | 'error' | 'pending';
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
}

export interface TimeSeriesData {
  time: string;
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

export interface DashboardMetrics extends AnalyticsSummary {}
