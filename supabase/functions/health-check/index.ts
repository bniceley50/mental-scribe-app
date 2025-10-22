/* eslint-env deno */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Counter, Histogram, startTimer } from '../_shared/metrics.ts';

// Metrics
const requestsTotal = new Counter('health_check_requests_total', 'Total health check requests');
const requestDuration = new Histogram('health_check_duration_seconds', 'Health check request duration', [0.01, 0.05, 0.1, 0.5, 1, 2, 5]);
const checkDuration = new Histogram('health_check_component_duration_seconds', 'Individual health check component duration', [0.01, 0.05, 0.1, 0.5, 1]);

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: unknown;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
    auth: HealthCheckResult;
    storage: HealthCheckResult;
  };
}

serve(async (req) => {
  const timer = startTimer();
  const startTime = Date.now();
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Run all health checks in parallel
    const [database, auth, storage] = await Promise.allSettled([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkStorage(supabase)
    ]);
    
    // Aggregate results
    const checks = {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, responseTime: 0, error: database.reason?.message },
      auth: auth.status === 'fulfilled' ? auth.value : { status: 'unhealthy' as const, responseTime: 0, error: auth.reason?.message },
      storage: storage.status === 'fulfilled' ? storage.value : { status: 'unhealthy' as const, responseTime: 0, error: storage.reason?.message }
    };
    
    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
      statuses.includes('unhealthy') ? 'unhealthy' :
      statuses.includes('degraded') ? 'degraded' : 'healthy';
    
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      version: '1.3.0',
      checks
    };
    
    // Record metrics
    requestsTotal.inc({ status: overallStatus, method: req.method });
    requestDuration.observe(timer(), { status: overallStatus });
    
    return new Response(JSON.stringify(response, null, 2), {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    // Record error metrics
    requestsTotal.inc({ status: 'error', method: req.method });
    requestDuration.observe(timer(), { status: 'error' });
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      version: '1.3.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, null, 2), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function checkDatabase(supabase: SupabaseClient): Promise<HealthCheckResult> {
  const timer = startTimer();
  
  try {
    // Simple query to test database connectivity
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    const responseTime = timer();
    const status = responseTime < 0.1 ? 'healthy' : 'degraded';
    
    checkDuration.observe(responseTime, { component: 'database', status });
    
    return {
      status,
      responseTime: responseTime * 1000, // convert to ms for response
      details: {
        queryTime: responseTime * 1000,
        responsive: true
      }
    };
  } catch (error) {
    const responseTime = timer();
    checkDuration.observe(responseTime, { component: 'database', status: 'unhealthy' });
    
    return {
      status: 'unhealthy',
      responseTime: responseTime * 1000,
      error: error instanceof Error ? error.message : 'Database check failed'
    };
  }
}

async function checkAuth(supabase: SupabaseClient): Promise<HealthCheckResult> {
  const timer = startTimer();
  
  try {
    // Check if auth service is responding
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) throw error;
    
    const responseTime = timer();
    const status = responseTime < 0.2 ? 'healthy' : 'degraded';
    
    checkDuration.observe(responseTime, { component: 'auth', status });
    
    return {
      status,
      responseTime: responseTime * 1000,
      details: {
        responsive: true
      }
    };
  } catch (error) {
    const responseTime = timer();
    checkDuration.observe(responseTime, { component: 'auth', status: 'unhealthy' });
    
    return {
      status: 'unhealthy',
      responseTime: responseTime * 1000,
      error: error instanceof Error ? error.message : 'Auth check failed'
    };
  }
}

async function checkStorage(supabase: SupabaseClient): Promise<HealthCheckResult> {
  const timer = startTimer();
  
  try {
    // Check if storage service is responding
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    const responseTime = timer();
    const status = responseTime < 0.2 ? 'healthy' : 'degraded';
    
    checkDuration.observe(responseTime, { component: 'storage', status });
    
    return {
      status,
      responseTime: responseTime * 1000,
      details: {
        bucketCount: data?.length || 0,
        responsive: true
      }
    };
  } catch (error) {
    const responseTime = timer();
    checkDuration.observe(responseTime, { component: 'storage', status: 'unhealthy' });
    
    return {
      status: 'unhealthy',
      responseTime: responseTime * 1000,
      error: error instanceof Error ? error.message : 'Storage check failed'
    };
  }
}
