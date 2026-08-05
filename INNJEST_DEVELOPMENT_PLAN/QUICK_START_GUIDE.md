# API Analytics Dashboard - Quick Start Guide (30 Minutes)

## 🚀 5-Minute Overview

You're building an **internal API analytics package** similar to Innjest but self-hosted with full control.

### What You'll Get:
- 📊 Real-time API metrics dashboard
- 📈 Performance graphs (response times, error rates, trends)
- 🔍 Detailed API call logs
- 🏷️ Endpoint metadata (auth, rate limits, description)
- 🎯 KPI cards (success rate, avg response time, etc)
- 🔐 Secure internal access only

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR MONOREPO                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │  packages/api    │         │ packages/web     │    │
│  │                  │         │                  │    │
│  │  • tRPC routes   │         │ • React app      │    │
│  │  • Middleware    │         │ • Dashboard page │    │
│  └──────┬───────────┘         └────────┬─────────┘    │
│         │                              │               │
│  ┌──────▼──────────────────────────────▼──────────┐   │
│  │  packages/api-analytics (NEW!)                │   │
│  │                                                │   │
│  │  ┌────────────────┐  ┌──────────────────────┐ │   │
│  │  │  SERVER/       │  │  CLIENT/             │ │   │
│  │  │  ├─ analytics  │  │  ├─ Dashboard.tsx    │ │   │
│  │  │  ├─ middleware │  │  ├─ Components       │ │   │
│  │  │  ├─ routes     │  │  ├─ Hooks            │ │   │
│  │  │  └─ database   │  │  └─ Styles           │ │   │
│  │  └────────────────┘  └──────────────────────┘ │   │
│  │                                                │   │
│  │  SHARED/                                       │   │
│  │  ├─ types.ts                                  │   │
│  │  └─ interfaces                                │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
    API Calls                    Dashboard Requests
    (with tracking)              (GET /api/analytics/*)
```

---

## 📋 Prerequisites

- Node.js 18+
- TypeScript 5+
- React 18+ (for dashboard)
- Recharts (for charts)
- Existing tRPC API setup

---

## ⚡ Step-by-Step Setup (30 minutes)

### Step 1: Create Package Structure (2 min)

```bash
# Navigate to your monorepo
cd your-monorepo

# Create the analytics package
mkdir -p packages/api-analytics/{src/server,src/client,src/shared}

# Initialize package.json
cd packages/api-analytics
npm init -y
```

### Step 2: Copy Core Files (5 min)

Copy these files into `packages/api-analytics/src/`:

1. **`src/server/analytics.ts`** - Core analytics collector
2. **`src/server/trpc-middleware.ts`** - tRPC integration
3. **`src/server/routes.ts`** - Express routes
4. **`src/client/Dashboard.tsx`** - React dashboard
5. **`src/client/Dashboard.module.css`** - Styles
6. **`src/shared/types.ts`** - TypeScript interfaces

All these are in the **API_ANALYTICS_COMPLETE_GUIDE.md** file above.

### Step 3: Update Package Configuration (2 min)

Create `packages/api-analytics/package.json`:

```json
{
  "name": "@myorg/api-analytics",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./server": "./dist/server/index.js",
    "./client": "./dist/client/index.js",
    "./types": "./dist/shared/types.js"
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "recharts": "^2.10.0"
  }
}
```

Create `packages/api-analytics/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src"]
}
```

### Step 4: Create Index Files (2 min)

**`src/server/index.ts`:**
```typescript
export { AnalyticsCollector, analyticsCollector } from './analytics';
export { createAnalyticsMiddleware, registerTRPCEndpoint } from './trpc-middleware';
export { createAnalyticsRoutes } from './routes';
```

**`src/client/index.ts`:**
```typescript
export { default as AnalyticsDashboard } from './Dashboard';
```

**`src/shared/types.ts`:**
```typescript
// Copy all interfaces from the guide
```

### Step 5: Integrate into Your API (5 min)

In your main API file (`packages/api/src/index.ts`):

```typescript
import express from 'express';
import { createAnalyticsRoutes } from '@myorg/api-analytics/server';
import { createAnalyticsMiddleware, registerTRPCEndpoint } from '@myorg/api-analytics/server';

const app = express();

// Add analytics routes
app.use('/api/analytics', createAnalyticsRoutes());

// Register endpoints
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

// ... rest of your API
```

### Step 6: Add Dashboard to Web App (5 min)

In your web app (`packages/web/src/pages/admin/analytics.tsx`):

```typescript
import { AnalyticsDashboard } from '@myorg/api-analytics/client';

export default function AnalyticsPage() {
  return (
    <AnalyticsDashboard 
      apiBase={process.env.REACT_APP_API_URL || 'http://localhost:3000'}
    />
  );
}
```

### Step 7: Install Dependencies (3 min)

```bash
# Install everything
npm install

# Build the analytics package
cd packages/api-analytics
npm run build

# Back to root
cd ../..

# Start your app
npm run dev
```

### Step 8: Test It (3 min)

1. Open your browser to `http://localhost:3000/admin/analytics`
2. Make some API calls through your app
3. Watch the dashboard update in real-time!

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Package builds without errors
- [ ] Dashboard loads at `/admin/analytics`
- [ ] API calls appear in the logs
- [ ] Charts render correctly
- [ ] Metrics update every 5 seconds
- [ ] Endpoint details show auth/rate limit info
- [ ] Filtering works (by endpoint, status)

---

## 🎨 Dashboard Features Explained

### KPI Cards (Top)
- **Total API Calls** - Total requests processed
- **Success Rate** - Percentage of successful calls
- **Avg Response Time** - Average duration in milliseconds
- **Error Rate** - Count of failed requests

### Charts
1. **Success vs Errors (Pie)** - Visual breakdown
2. **API Calls Over Time (Line)** - Trend tracking
3. **Endpoint Response Times (Bar)** - Performance comparison

### Endpoints Section
- Shows all registered endpoints
- Click to expand and see details
- Displays:
  - Auth requirement (🔒 or 🔓)
  - Total calls & error count
  - Average response time
  - Rate limit info (if configured)

### Recent Calls Log
- Last 50 API calls
- Time, endpoint, method, status, duration, code
- Color-coded by status (green for success, red for errors)

---

## 🔧 Common Customizations

### Change Dashboard Refresh Rate

In Dashboard component:
```typescript
// Default: 5000ms
const refreshInterval = 2000; // 2 seconds
```

### Change Theme Colors

In `Dashboard.module.css`, update:
```css
.dashboard {
  background: #0f172a; /* Dark background */
  color: #e2e8f0;      /* Text color */
}

/* Blue/Green/Red for charts */
--color-success: #10b981;
--color-error: #ef4444;
--color-info: #3b82f6;
```

### Add More Metrics

In `analytics.ts`, expand the `getAnalytics()` function:
```typescript
endpointStats: {
  'users.getProfile': {
    calls: 150,
    errors: 2,
    avgTime: 45.3,
    p95Time: 120,
    p99Time: 250,
    // Add more fields here
  }
}
```

### Store Data in Database

In `analytics.ts`, integrate SQLite:
```typescript
import { AnalyticsDB } from './database';

private db = new AnalyticsDB('./analytics.db');

endCall(...) {
  // ... existing code
  this.db.saveCall(call); // Persist to database
}
```

---

## 🔒 Security Considerations

### Protect the Dashboard Route

```typescript
// In your web app's middleware
function protectAnalytics(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// Use it
app.get('/admin/analytics', protectAnalytics, renderAnalyticsPage);
```

### Protect API Routes

```typescript
import { createServer } from 'http';
import express from 'express';

const app = express();

// Only allow internal access or authenticated admins
app.use('/api/analytics', (req, res, next) => {
  const allowedIPs = ['127.0.0.1', '::1'];
  const isAdmin = req.user?.role === 'ADMIN';
  
  if (!allowedIPs.includes(req.ip) && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

### Environment Variables

```bash
ANALYTICS_ENABLED=true
ANALYTICS_ADMIN_IPS=127.0.0.1,localhost
ANALYTICS_MAX_CALLS=10000
ANALYTICS_RETENTION_HOURS=24
```

---

## 📊 Real-World Example

### Your Post Creation Endpoint

```typescript
import { registerTRPCEndpoint } from '@myorg/api-analytics/server';

// Register the endpoint
registerTRPCEndpoint({
  name: 'posts.create',
  endpoint: 'posts.create',
  method: 'mutation',
  isAuthRequired: true,
  rateLimit: {
    enabled: true,
    requests: 10,    // Max 10 posts
    windowMs: 60000, // Per minute
    type: 'USER',    // Per user (not per IP)
  },
  description: 'Create a new blog post',
  tags: ['posts', 'content'],
});

// In your router
export const appRouter = t.router({
  posts: t.router({
    create: protectedProcedure
      .input(createPostSchema)
      .mutation(async ({ ctx, input }) => {
        // API automatically tracked!
        // - Start time: recorded
        // - Request size: calculated
        // - Response time: measured
        // - Status: determined
        // - All visible in dashboard
        
        const post = await db.posts.create({
          title: input.title,
          content: input.content,
          authorId: ctx.user.id,
        });
        
        return post;
      }),
  }),
});
```

**Dashboard shows:**
- `posts.create` appears in endpoint list
- Marked with 🔒 (auth required)
- Shows rate limit: "10 requests per 60s (USER)"
- Displays all calls in real-time
- Graphs show response times
- Error tracking if calls fail

---

## 📈 Growth Path

### Phase 1 (Now) ✅
- Basic analytics collection
- Real-time dashboard
- API metadata

### Phase 2 (Next Week)
- Database persistence (keep data longer)
- Advanced filtering
- Export to CSV

### Phase 3 (Later)
- Distributed tracing
- Alert system
- Performance trends
- Comparison views

---

## 🐛 Troubleshooting

### Dashboard shows "Loading analytics..." forever
- Check network tab - is `/api/analytics/metrics` returning data?
- Verify routes are mounted in Express
- Check CORS if frontend is separate domain

### No calls appearing in log
- Verify middleware is added to tRPC router
- Check console for errors
- Ensure endpoints are registered

### Type errors in TypeScript
- Run `npm run build` in the analytics package
- Check all files are copied correctly
- Verify tsconfig.json is in the package root

### Styling looks broken
- Ensure CSS module is imported
- Check Tailwind/CSS variables if customized
- Open browser DevTools to inspect

---

## 🚀 Next Steps

1. **Complete Setup** (follow steps above)
2. **Register All Endpoints** (similar to the example)
3. **Test with Real Calls** (use your app normally)
4. **Customize Theme** (match your brand)
5. **Add to CI/CD** (build script, deploy)
6. **Share with Team** (link in internal wiki)
7. **Set Up Alerts** (optional, from advanced guide)
8. **Monitor Performance** (use insights to optimize)

---

## 📚 Documentation Files

Read these in order:
1. **QUICK_START_GUIDE.md** (you are here) - Setup overview
2. **API_ANALYTICS_COMPLETE_GUIDE.md** - Full implementation
3. **advanced-analytics-features.ts** - Extra features (alerts, tracing)
4. **api-analytics-setup.ts** - Detailed configs & examples

---

## 💡 Tips & Tricks

### Accessing from Different Machine
```bash
# On server
npm run dev -- --host 0.0.0.0

# From another machine
curl http://server-ip:3000/api/analytics/metrics
```

### Bulk Register Endpoints
```typescript
const endpoints = [
  { name: 'users.list', endpoint: 'users.list', method: 'query' },
  { name: 'users.create', endpoint: 'users.create', method: 'mutation' },
  // ... more
];

endpoints.forEach(ep => {
  registerTRPCEndpoint({
    ...ep,
    isAuthRequired: true,
    tags: ['users'],
  });
});
```

### Real-time Updates with Socket.io (Optional)
```typescript
// Server
io.emit('analytics:update', metrics);

// Client
socket.on('analytics:update', (metrics) => {
  setMetrics(metrics);
});
```

---

## 📞 Support

- Got stuck? Check the **QUICK_START_GUIDE.md** troubleshooting section
- Want more features? See **advanced-analytics-features.ts**
- Need help with integration? Review **API_ANALYTICS_COMPLETE_GUIDE.md** step by step
- Issues with security? Check **Security Best Practices** in the main guide

---

## 🎯 Success Indicators

You know it's working when:
1. Dashboard loads without errors ✅
2. API calls appear in real-time ✅
3. Charts show trends ✅
4. Endpoint details are populated ✅
5. Filtering and pagination work ✅
6. The UI looks professional ✅

**Congratulations! You now have your own API analytics system!** 🎉

---

**Estimated Time: 30 minutes**
**Difficulty: Intermediate**
**Payoff: Complete visibility into API performance**
