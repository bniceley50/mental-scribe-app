/* eslint-env deno */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { exportMetrics } from '../_shared/metrics.ts';

/**
 * Metrics Export Endpoint
 * Exposes Prometheus-format metrics for scraping
 * 
 * GET /metrics - Returns all collected metrics in Prometheus text format
 */

serve(async (req) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    const metrics = exportMetrics();
    
    return new Response(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Metrics export error:', error);
    
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
});
