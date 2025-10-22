/* eslint-env deno */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    
    return new Response(JSON.stringify(response, null, 2), {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
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
  const startTime = Date.now();
  
  try {
    // Simple query to test database connectivity
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        queryTime: responseTime,
        responsive: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database check failed'
    };
  }
}

async function checkAuth(supabase: SupabaseClient): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if auth service is responding
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) throw error;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 200 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        responsive: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Auth check failed'
    };
  }
}

async function checkStorage(supabase: SupabaseClient): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if storage service is responding
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 200 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        bucketCount: data?.length || 0,
        responsive: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Storage check failed'
    };
  }
}
