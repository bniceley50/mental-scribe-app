# Mental Scribe Production Readiness Dashboard

A real-time monitoring dashboard for Mental Scribe's production deployment status, system health, metrics, and audit chain integrity.

## Features

### 🏥 System Health Monitoring
- Real-time health checks for database, authentication, and storage
- Component-level latency tracking
- Visual status indicators (healthy/degraded/unhealthy)

### 📊 Metrics Overview
- Prometheus metrics visualization
- Request counts for health checks and audit verification
- Latency percentiles (P95)
- Audit chain integrity gauge
- Entries verified counter

### 🔐 Audit Chain Status
- Real-time audit chain integrity verification
- Total and verified entry counts
- Broken link detection and reporting
- Security status indicators

### 🚀 Deployment History
- Recent git commits display
- Deployment timestamps
- Commit messages and authors

## Installation

### Prerequisites

- Node.js 18+ or Bun
- Access to Mental Scribe Supabase project
- Supabase anon key (for authenticated endpoints)

### Setup

1. **Navigate to the dashboard directory**:
   ```bash
   cd apps/readiness-dashboard
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your Supabase details**:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_FUNCTION_PREFIX=/functions/v1
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   You can find these values in your Supabase project settings:
   - **VITE_SUPABASE_URL**: Project Settings → API → Project URL
   - **VITE_SUPABASE_ANON_KEY**: Project Settings → API → Project API keys → anon public

## Usage

### Development

Start the development server:

```bash
pnpm dev
# or
npm run dev
# or
bun dev
```

The dashboard will be available at `http://localhost:3002`.

### Production Build

Build for production:

```bash
pnpm build
# or
npm run build
# or
bun run build
```

Preview the production build:

```bash
pnpm preview
# or
npm run preview
# or
bun preview
```

## Configuration

The dashboard can be configured in two ways:

1. **Environment Variables** (recommended for production):
   - Set `VITE_SUPABASE_URL`, `VITE_FUNCTION_PREFIX`, and `VITE_SUPABASE_ANON_KEY` in `.env`
   - These values are used as defaults when the dashboard loads

2. **In-App Configuration**:
   - Use the configuration panel at the top of the dashboard
   - Change Supabase URL and function prefix on the fly
   - Useful for testing against different environments

## Dashboard Components

### HealthStatus Component
- Fetches data from `/health-check` edge function
- Displays overall status and component-level health
- Auto-refreshes every 30 seconds

### MetricsOverview Component
- Fetches Prometheus metrics from `/metrics` endpoint
- Parses text format metrics into structured data
- Shows request counts and latency metrics

### AuditChainStatus Component
- Calls `/audit-verify` endpoint (requires authentication)
- Displays chain integrity status
- Shows broken links if integrity is compromised

### DeploymentStatus Component
- Displays recent git commits (currently simulated)
- Can be extended to integrate with GitHub API or CI/CD webhooks

## Authentication

Some endpoints (like `audit-verify`) require authentication:

1. **Admin Authentication**: 
   - The audit-verify endpoint requires admin role
   - Configure `VITE_SUPABASE_ANON_KEY` with a service role key for full access
   - Or implement proper auth flow with user login

2. **Unauthenticated Mode**:
   - Health checks and metrics endpoints are typically public
   - Dashboard will show auth errors for protected endpoints
   - Configure appropriate RLS policies in Supabase

## Extending the Dashboard

### Adding New Components

1. Create a new component in `src/components/`:
   ```tsx
   export default function MyComponent({ baseUrl, functionPrefix, refreshTrigger }: Props) {
     // Component logic
   }
   ```

2. Import and add to `App.tsx`:
   ```tsx
   import MyComponent from './components/MyComponent';
   
   // In the dashboard-grid:
   <MyComponent
     baseUrl={config.supabaseUrl}
     functionPrefix={config.functionPrefix}
     refreshTrigger={lastUpdate}
   />
   ```

### Customizing Refresh Interval

Edit `App.tsx` to change the auto-refresh interval:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setLastUpdate(new Date());
  }, 60000); // Change from 30000 (30s) to 60000 (60s)

  return () => clearInterval(interval);
}, []);
```

### Styling

The dashboard uses CSS modules with a dark theme. Edit `App.css` to customize:

- **Colors**: Tailwind-inspired color palette
- **Layout**: CSS Grid for responsive design
- **Status indicators**: Color-coded health status

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Set build command: `cd apps/readiness-dashboard && pnpm build`
3. Set output directory: `apps/readiness-dashboard/dist`
4. Add environment variables in Vercel dashboard

### Netlify

1. Create `netlify.toml` in the dashboard directory:
   ```toml
   [build]
     command = "pnpm build"
     publish = "dist"
   ```
2. Deploy via Netlify CLI or Git integration
3. Configure environment variables in Netlify dashboard

### Docker

Create a `Dockerfile` in the dashboard directory:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t readiness-dashboard .
docker run -p 8080:80 readiness-dashboard
```

## Troubleshooting

### "Supabase URL not configured"
- Check that `.env` file exists and contains `VITE_SUPABASE_URL`
- Or configure the URL in the dashboard's configuration panel

### "Failed to fetch health status"
- Verify edge functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs health-check`
- Ensure CORS is configured correctly in edge functions

### "Authentication required for audit verification"
- Configure `VITE_SUPABASE_ANON_KEY` with appropriate key
- Or implement proper authentication flow
- Check RLS policies allow access to audit-verify function

### Metrics not displaying
- Verify metrics endpoint is accessible: `curl https://your-project.supabase.co/functions/v1/metrics`
- Check that metrics are being collected (see docs/OBSERVABILITY.md)
- Ensure edge functions have been called to generate metrics

## Architecture

```
apps/readiness-dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── HealthStatus.tsx
│   │   ├── MetricsOverview.tsx
│   │   ├── AuditChainStatus.tsx
│   │   └── DeploymentStatus.tsx
│   ├── App.tsx             # Main dashboard layout
│   ├── App.css             # Dashboard styling
│   ├── main.tsx            # React entry point
│   ├── index.css           # Global styles
│   └── vite-env.d.ts       # TypeScript definitions
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
├── .env.example            # Environment template
└── README.md               # This file
```

## Best Practices

1. **Security**:
   - Never commit `.env` files with real credentials
   - Use service role keys only in secure environments
   - Implement proper authentication for production

2. **Performance**:
   - Adjust refresh interval based on needs
   - Consider implementing WebSocket for real-time updates
   - Cache metrics data to reduce API calls

3. **Monitoring**:
   - Set up alerts for health status changes
   - Monitor dashboard access logs
   - Track dashboard usage and errors

## Related Documentation

- [Feature #9: Observability](../../docs/OBSERVABILITY.md) - Prometheus metrics setup
- [Feature #8: Ops Runbooks](../../docs/runbooks/) - Operational procedures
- [Health Check Function](../../supabase/functions/health-check/) - Health endpoint
- [Audit Verify Function](../../supabase/functions/audit-verify/) - Audit verification

## License

See main project LICENSE file.
