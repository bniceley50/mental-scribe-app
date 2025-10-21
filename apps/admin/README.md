# @mscribe/admin

Admin micro-frontend for Mental Scribe using Vite Module Federation.

## Overview

The admin panel is a separately deployed micro-frontend that provides:
- **User Management**: View users, assign roles, monitor activity
- **RLS Policy Viewer**: Inspect Row Level Security policies and test them
- **Role-Based Access**: Only accessible to users with 'admin' or 'superadmin' role

## Architecture

This app uses **Vite Module Federation** to enable:
- Independent deployment from the main app
- Runtime loading (only loads when admin accesses /admin route)
- Shared dependencies (React, Supabase) to reduce bundle size
- Zero-downtime updates to admin features

### Module Federation Setup

**Remote (Admin App)**:
- Exposes: `AdminApp`, `UserManagement`, `RLSPolicyViewer`
- Port: 5174
- Build output: `dist/assets/remoteEntry.js`

**Host (Main App)**:
- Consumes: `admin` remote
- Development: `http://localhost:5174/assets/remoteEntry.js`
- Production: `/admin/assets/remoteEntry.js`

## Development

### Start Admin App (Standalone)

```bash
# From workspace root
pnpm --filter @mscribe/admin dev

# App runs on http://localhost:5174
```

### Start with Main App (Integrated)

```bash
# Terminal 1: Start main app
pnpm dev

# Terminal 2: Start admin app
pnpm --filter @mscribe/admin dev

# Main app on http://localhost:8080
# Admin remote on http://localhost:5174
# Admin panel accessible at http://localhost:8080/admin
```

## Build

```bash
# Build admin app
pnpm --filter @mscribe/admin build

# Output: apps/admin/dist/
```

## Deployment

### Separate Deployment Strategy

1. **Deploy Admin App** to `/admin/` path:
   ```bash
   # Build admin
   pnpm --filter @mscribe/admin build
   
   # Deploy to CDN or static hosting
   # Ensure remoteEntry.js is accessible at /admin/assets/remoteEntry.js
   ```

2. **Deploy Main App** with federation config pointing to admin remote

3. **Benefits**:
   - Update admin features independently
   - Reduced main app bundle size
   - Better caching and CDN distribution

### Single Deployment (Development)

For simpler development setups:

```bash
# Build both
pnpm build

# Copy admin build into main app public folder
cp -r apps/admin/dist/* public/admin/
```

## Role-Based Access Control

### JWT Role Claims

The admin panel checks for role in JWT:

```typescript
// User metadata or app metadata
{
  "role": "admin" | "superadmin" | "user"
}
```

### Setting User Roles

**Via Supabase Dashboard**:
1. Go to Authentication > Users
2. Select user
3. Edit user metadata: `{ "role": "admin" }`

**Via SQL**:
```sql
-- Add role to user metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```

**Via Database Trigger** (Recommended):
```sql
-- Create function to sync roles from clients table
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on clients table
CREATE TRIGGER sync_user_role_trigger
AFTER INSERT OR UPDATE OF role ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_user_role();
```

## Security Considerations

### Access Control

- ✅ **Role checking** at route level (redirects non-admins)
- ✅ **Lazy loading** (admin bundle only loads for authorized users)
- ✅ **JWT verification** via Supabase auth
- ✅ **RLS policies** enforce database-level permissions

### Best Practices

1. **Never expose service role key** in frontend code
2. **Always validate roles** on backend/database level
3. **Use RLS policies** for data access control
4. **Log admin actions** in audit_chain table

## Components

### UserManagement

**Features**:
- List all users with pagination
- Display user roles and activity
- Change user roles (admin/superadmin)
- View recent user activity from audit log

**Database Tables**:
- `clients`: User profiles and roles
- `audit_chain`: Activity tracking

### RLSPolicyViewer

**Features**:
- Display tables with RLS status
- Show policy details (USING, WITH CHECK clauses)
- Test policies for SELECT/INSERT/UPDATE/DELETE
- Visual policy status indicators

**Database Access**:
- Requires custom RPC function: `get_rls_policies()`
- Falls back to table list if RPC unavailable

## Testing

### Unit Tests

```bash
pnpm --filter @mscribe/admin test
```

### Integration Testing

Test module federation loading:

```typescript
// In main app
import { render } from '@testing-library/react';
import AdminPage from '@/pages/AdminPage';

test('loads admin module for admin users', async () => {
  // Mock admin role
  mockUseAdminAccess({ isAdmin: true, loading: false });
  
  const { findByText } = render(<AdminPage />);
  
  // Should load remote module
  expect(await findByText('Mental Scribe Admin')).toBeInTheDocument();
});
```

## Troubleshooting

### "Failed to load admin module"

**Causes**:
- Admin app not running on port 5174
- Build output missing `remoteEntry.js`
- CORS issues in production

**Solutions**:
```bash
# Verify admin app is running
curl http://localhost:5174/assets/remoteEntry.js

# Check build output
ls apps/admin/dist/assets/remoteEntry.js

# Ensure CORS headers in production
Access-Control-Allow-Origin: *
```

### "Cannot find module 'admin/AdminApp'"

TypeScript type error. Ensure `src/types/admin-remote.d.ts` exists:

```typescript
declare module 'admin/AdminApp' {
  const AdminApp: React.ComponentType;
  export default AdminApp;
}
```

### "Access Denied" for admin users

Check JWT claims:

```typescript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('User role:', user?.user_metadata?.role);

// Should be 'admin' or 'superadmin'
```

## Production Deployment

### Nginx Configuration

```nginx
# Serve admin remote
location /admin/ {
  alias /var/www/admin-remote/;
  try_files $uri $uri/ =404;
  
  # Enable CORS for module federation
  add_header Access-Control-Allow-Origin *;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Main app
location / {
  root /var/www/main-app/;
  try_files $uri $uri/ /index.html;
}
```

### CDN Deployment (Recommended)

Deploy admin remote to CDN for global distribution:

```bash
# Build with public URL
VITE_BASE_URL=https://cdn.example.com/admin/ pnpm --filter @mscribe/admin build

# Upload to CDN
aws s3 sync apps/admin/dist/ s3://cdn-bucket/admin/ --acl public-read
```

Update main app federation config:

```typescript
remotes: {
  admin: 'https://cdn.example.com/admin/assets/remoteEntry.js'
}
```

## Performance

### Bundle Size

- Admin bundle: ~150KB (gzipped)
- Lazy loaded only for admin users
- Shared React/Supabase dependencies

### Loading Time

- Initial load: ~200ms (with caching)
- Subsequent loads: <50ms (from cache)

## License

MIT
