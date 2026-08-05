/**
 * SETUP INSTRUCTIONS FOR @myorg/api-analytics PACKAGE
 * 
 * File Structure to Create:
 */

// Step 1: Create the package structure
/*
packages/api-analytics/
├── src/
│   ├── server/
│   │   ├── index.ts           # Exports
│   │   ├── analytics.ts       # Core analytics collector
│   │   ├── trpc-middleware.ts # tRPC integration
│   │   ├── routes.ts          # Express routes
│   │   ├── database.ts        # SQLite/DB storage
│   │   └── security.ts        # Auth middleware
│   ├── client/
│   │   ├── index.ts           # Exports
│   │   ├── Dashboard.tsx      # Main component
│   │   ├── Dashboard.module.css
│   │   ├── hooks/
│   │   │   ├── useAnalytics.ts
│   │   │   └── useMetrics.ts
│   │   └── components/
│   │       ├── KPICards.tsx
│   │       ├── Charts.tsx
│   │       └── EndpointsList.tsx
│   └── shared/
│       ├── index.ts
│       └── types.ts
├── package.json
├── tsconfig.json
└── README.md
*/

// ==================== STEP 1: Create root package.json ====================

const packageJson = {
  "name": "@myorg/api-analytics",
  "version": "1.0.0",
  "description": "Internal API analytics and monitoring dashboard for tRPC",
  "private": true,
  "type": "module",
  "exports": {
    "./server": {
      "import": "./dist/server/index.js",
      "types": "./dist/server/index.d.ts"
    },
    "./client": {
      "import": "./dist/client/index.js",
      "types": "./dist/client/index.d.ts"
    },
    "./types": {
      "import": "./dist/shared/types.js",
      "types": "./dist/shared/types.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "nanoid": "^5.0.0",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "recharts": "^2.10.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    },
    "react-dom": {
      "optional": true
    },
    "recharts": {
      "optional": true
    }
  }
};

// ==================== STEP 2: Create tsconfig.json ====================

const tsconfig = {
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
};

// ==================== STEP 3: Setup tRPC Middleware Integration ====================

// File: packages/api/src/trpc.ts
// This is how to integrate analytics into your existing tRPC setup

const trpcIntegrationExample = `
import { initTRPC } from '@trpc/server';
import { createContext } from './context';
import { 
  createAnalyticsMiddleware,
  registerTRPCEndpoint,
  analyticsCollector 
} from '@myorg/api-analytics/server';

const t = initTRPC.context<typeof createContext>().create({
  middleware: createAnalyticsMiddleware(),
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

// ===== Register Endpoints =====

// 1. User Endpoints
registerTRPCEndpoint({
  name: 'users.getProfile',
  endpoint: 'users.getProfile',
  method: 'query',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 100,
    windowMs: 60000, // 1 minute
    type: 'USER',
  },
  description: 'Fetch authenticated user profile',
  tags: ['users', 'auth'],
});

registerTRPCEndpoint({
  name: 'users.update',
  endpoint: 'users.update',
  method: 'mutation',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 20,
    windowMs: 60000,
    type: 'USER',
  },
  description: 'Update user profile',
  tags: ['users', 'auth'],
});

// 2. Public Endpoints
registerTRPCEndpoint({
  name: 'posts.list',
  endpoint: 'posts.list',
  method: 'query',
  isAuthRequired: false,
  rateLimit: {
    enabled: true,
    requests: 1000,
    windowMs: 60000,
    type: 'IP',
  },
  description: 'List all public posts',
  tags: ['posts', 'public'],
});

// 3. Protected/Admin Endpoints
registerTRPCEndpoint({
  name: 'admin.users.delete',
  endpoint: 'admin.users.delete',
  method: 'mutation',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 10,
    windowMs: 3600000, // 1 hour
    type: 'USER',
  },
  description: 'Delete a user (admin only)',
  tags: ['users', 'admin', 'destructive'],
});

// ===== Your Actual Router =====

export const appRouter = t.router({
  users: t.router({
    getProfile: publicProcedure.query(async ({ ctx }) => {
      // Your logic here
    }),
    update: protectedProcedure
      .input(updateUserSchema)
      .mutation(async ({ ctx, input }) => {
        // Your logic here
      }),
  }),
  posts: t.router({
    list: publicProcedure.query(async () => {
      // Your logic here
    }),
  }),
  admin: t.router({
    users: t.router({
      delete: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          // Verify admin role
          // Your logic here
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
`;

// ==================== STEP 4: Setup Express Routes ====================

const expressSetupExample = `
import express from 'express';
import { createAnalyticsRoutes } from '@myorg/api-analytics/server';
import { protectAnalyticsRoutes } from './middleware/analytics-auth';

const app = express();

// Your tRPC routes
app.use('/trpc', trpcMiddleware);

// Analytics routes (protected)
app.use('/api/analytics', protectAnalyticsRoutes, createAnalyticsRoutes());

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Analytics dashboard at http://localhost:3000/analytics');
});
`;

// ==================== STEP 5: Setup in Web App ====================

const webSetupExample = `
// pages/admin/analytics.tsx
import React from 'react';
import { AnalyticsDashboard } from '@myorg/api-analytics/client';
import { useAuth } from '@/auth/useAuth';

export default function AnalyticsPage() {
  const { user } = useAuth();
  
  // Restrict to admins only
  if (!user || user.role !== 'ADMIN') {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <AnalyticsDashboard 
        apiBase={process.env.REACT_APP_API_URL || 'http://localhost:3000'}
      />
    </div>
  );
}
`;

// ==================== STEP 6: Environment Variables ====================

const envExample = \`
# analytics.env or .env.local

# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_MAX_STORED_CALLS=10000
ANALYTICS_RETENTION_HOURS=24
ANALYTICS_DB_PATH=./data/analytics.db

# Security
ANALYTICS_ADMIN_IPS=127.0.0.1,localhost
ANALYTICS_REQUIRE_AUTH=true

# Performance
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL_MS=5000
\`;

// ==================== STEP 7: Commands to Run ====================

const setupCommands = \`
# 1. Create the package
mkdir -p packages/api-analytics

# 2. Initialize with package.json
cd packages/api-analytics
npm init -y

# 3. Copy the tsconfig.json and package.json from this guide

# 4. Install dependencies
npm install

# 5. Create src directory structure
mkdir -p src/server src/client src/shared

# 6. Add files:
# - Copy analytics.ts to src/server/
# - Copy trpc-middleware.ts to src/server/
# - Copy routes.ts to src/server/
# - Copy Dashboard.tsx to src/client/
# etc.

# 7. Build the package
npm run build

# 8. In your main app, update package.json to include:
# "@myorg/api-analytics": "workspace:*"

# 9. Install and run
npm install
npm run dev
\`;

// ==================== STEP 8: Custom Hooks ====================

const useAnalyticsHook = `
// src/client/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';

interface UseAnalyticsOptions {
  apiBase: string;
  refreshInterval?: number;
  autoStart?: boolean;
}

export function useAnalytics({
  apiBase,
  refreshInterval = 5000,
  autoStart = true,
}: UseAnalyticsOptions) {
  const [metrics, setMetrics] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(\\\`\\\${apiBase}/api/analytics/metrics\\\`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, [apiBase]);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(\\\`\\\${apiBase}/api/analytics/calls\\\`);
      if (!res.ok) throw new Error('Failed to fetch calls');
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, [apiBase]);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch(\\\`\\\${apiBase}/api/analytics/endpoints\\\`);
      if (!res.ok) throw new Error('Failed to fetch endpoints');
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, [apiBase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, callsData, endpointsData] = await Promise.all([
        fetchMetrics(),
        fetchCalls(),
        fetchEndpoints(),
      ]);

      if (metricsData) setMetrics(metricsData);
      if (callsData) setCalls(callsData);
      if (endpointsData) setEndpoints(endpointsData);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchCalls, fetchEndpoints]);

  useEffect(() => {
    if (autoStart) {
      refresh();
    }
  }, [autoStart, refresh]);

  useEffect(() => {
    if (!autoStart) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoStart, refreshInterval, refresh]);

  return {
    metrics,
    calls,
    endpoints,
    loading,
    error,
    refresh,
  };
}
`;

// ==================== STEP 9: Complete Directory Structure ====================

const directoryStructure = \`
packages/api-analytics/
├── src/
│   ├── server/
│   │   ├── index.ts
│   │   │   export { AnalyticsCollector, analyticsCollector } from './analytics';
│   │   │   export { createAnalyticsMiddleware, registerTRPCEndpoint } from './trpc-middleware';
│   │   │   export { createAnalyticsRoutes } from './routes';
│   │   │   export { AnalyticsDB } from './database';
│   │   │   export { protectAnalyticsRoutes } from './security';
│   │   │
│   │   ├── analytics.ts (from guide)
│   │   ├── trpc-middleware.ts (from guide)
│   │   ├── routes.ts (from guide)
│   │   ├── database.ts (from guide)
│   │   └── security.ts (create middleware)
│   │
│   ├── client/
│   │   ├── index.ts
│   │   │   export { AnalyticsDashboard as default } from './Dashboard';
│   │   │   export { useAnalytics } from './hooks/useAnalytics';
│   │   │
│   │   ├── Dashboard.tsx (from guide)
│   │   ├── Dashboard.module.css (from guide)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAnalytics.ts (custom hook)
│   │   │   └── useMetrics.ts
│   │   │
│   │   └── components/
│   │       ├── KPICards.tsx
│   │       ├── Charts.tsx
│   │       ├── EndpointsList.tsx
│   │       └── CallsTable.tsx
│   │
│   └── shared/
│       ├── index.ts
│       │   export * from './types';
│       │
│       └── types.ts (all interfaces)
│
├── package.json (from guide)
├── tsconfig.json (from guide)
├── README.md
└── .npmignore
\`;

// ==================== STEP 10: Verification Checklist ====================

const verificationChecklist = \`
✅ SETUP VERIFICATION CHECKLIST

Before deploying to production:

1. Directory Structure
   ☐ packages/api-analytics/src/server/ exists
   ☐ packages/api-analytics/src/client/ exists
   ☐ packages/api-analytics/src/shared/ exists

2. Core Files
   ☐ analytics.ts is implemented
   ☐ trpc-middleware.ts is implemented
   ☐ routes.ts is implemented
   ☐ Dashboard.tsx is implemented
   ☐ types.ts is implemented

3. Package Configuration
   ☐ package.json has correct exports
   ☐ tsconfig.json is correct
   ☐ Dependencies are installed
   ☐ Package builds without errors (npm run build)

4. Integration
   ☐ Middleware is added to tRPC router
   ☐ Routes are mounted on Express app
   ☐ All endpoints are registered
   ☐ Analytics routes are protected

5. Frontend
   ☐ Dashboard component is imported
   ☐ Dashboard page is accessible at /admin/analytics
   ☐ Authentication check is in place
   ☐ Charts render correctly

6. Security
   ☐ Analytics routes require authentication
   ☐ IP whitelisting is configured
   ☐ No sensitive data in logs
   ☐ HTTPS is enabled

7. Performance
   ☐ Analytics don't slow down API
   ☐ Memory usage is acceptable
   ☐ Old data is cleaned up
   ☐ Database is indexed

8. Testing
   ☐ Make test API calls
   ☐ Verify calls appear in dashboard
   ☐ Check metrics are calculated correctly
   ☐ Test filtering and pagination

9. Documentation
   ☐ README.md is updated
   ☐ Team knows how to access dashboard
   ☐ Endpoint registration is documented
   ☐ Configuration is documented
\`;

console.log('API Analytics Setup Guide - Copy the configurations above');
