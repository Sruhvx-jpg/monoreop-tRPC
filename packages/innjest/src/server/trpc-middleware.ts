import { TRPCError } from '@trpc/server';
import { analyticsCollector } from './analytics.js';
import type { APIMetadata } from '../shared/types.js';


/**
 * Create a tRPC middleware that automatically tracks API calls
 */
export function createAnalyticsMiddleware() {
  return async function analyticsMiddleware(opts: any) {
    const { path, type, ctx } = opts;

    const userId = ctx?.user?.id || ctx?.userId || undefined;
    const ipAddress = ctx?.req?.ip || ctx?.ip || undefined;

    const callId = analyticsCollector.startCall(
      path || 'unknown',
      (type as any) || 'query',
      userId,
      ipAddress
    );

    try {
      const result = await opts.next({
        ...opts,
      });

      let responseSize = 0;
      if (result && typeof result === 'object') {
        try {
          responseSize = JSON.stringify(result).length;
        } catch {
          responseSize = 0;
        }
      }

      analyticsCollector.endCall(callId, 200, responseSize);
      return result;
    } catch (error) {
      const statusCode =
        error instanceof TRPCError
          ? error.code === 'INTERNAL_SERVER_ERROR'
            ? 500
            : 400
          : 500;

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
export function registerTRPCEndpoint(metadata: APIMetadata): void {
  analyticsCollector.registerEndpoint(metadata);
}
