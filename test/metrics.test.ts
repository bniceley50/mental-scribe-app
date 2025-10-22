/* eslint-env deno */
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { Counter, Gauge, Histogram, startTimer, exportMetrics } from '../supabase/functions/_shared/metrics.ts';

Deno.test('Counter - increment without labels', () => {
  const counter = new Counter('test_counter', 'Test counter');
  counter.inc();
  counter.inc();
  counter.inc();
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  // Check HELP line
  assertEquals(lines.find(l => l.startsWith('# HELP test_counter')), '# HELP test_counter Test counter');
  // Check TYPE line
  assertEquals(lines.find(l => l.startsWith('# TYPE test_counter')), '# TYPE test_counter counter');
  // Check value line
  assertEquals(lines.find(l => l.startsWith('test_counter ')), 'test_counter 3');
});

Deno.test('Counter - increment with labels', () => {
  const counter = new Counter('http_requests_total', 'Total HTTP requests');
  counter.inc({ method: 'GET', status: '200' });
  counter.inc({ method: 'GET', status: '200' }, 5);
  counter.inc({ method: 'POST', status: '201' });
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  // Check both label combinations exist
  const getLine = lines.find(l => l.includes('method="GET"'));
  const postLine = lines.find(l => l.includes('method="POST"'));
  
  assertExists(getLine);
  assertExists(postLine);
  assertEquals(getLine, 'http_requests_total{method="GET",status="200"} 6');
  assertEquals(postLine, 'http_requests_total{method="POST",status="201"} 1');
});

Deno.test('Counter - label escaping', () => {
  const counter = new Counter('test_counter', 'Test counter');
  counter.inc({ path: '/api/users"test', message: 'Line 1\nLine 2' });
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  const valueLine = lines.find(l => l.startsWith('test_counter{'));
  assertExists(valueLine);
  // Check that quotes are escaped
  assertEquals(valueLine?.includes('\\"test'), true);
  // Check that newlines are escaped
  assertEquals(valueLine?.includes('\\n'), true);
});

Deno.test('Gauge - set value', () => {
  const gauge = new Gauge('active_connections', 'Number of active connections');
  gauge.set(42);
  gauge.set(10, { service: 'api' });
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  assertEquals(lines.find(l => l.startsWith('# TYPE active_connections')), '# TYPE active_connections gauge');
  assertEquals(lines.find(l => l === 'active_connections 42'), 'active_connections 42');
  assertEquals(lines.find(l => l.includes('service="api"')), 'active_connections{service="api"} 10');
});

Deno.test('Gauge - increment and decrement', () => {
  const gauge = new Gauge('queue_size', 'Queue size');
  gauge.set(100);
  gauge.inc();
  gauge.inc({}, 5);
  gauge.dec({}, 3);
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  const valueLine = lines.find(l => l.startsWith('queue_size '));
  assertEquals(valueLine, 'queue_size 103'); // 100 + 1 + 5 - 3
});

Deno.test('Histogram - observe values', () => {
  const histogram = new Histogram('request_duration_seconds', 'Request duration', [0.1, 0.5, 1.0, 5.0]);
  
  // Observe values in different buckets
  histogram.observe(0.05, { endpoint: '/api' }); // bucket <= 0.1
  histogram.observe(0.2, { endpoint: '/api' });  // bucket <= 0.5
  histogram.observe(0.3, { endpoint: '/api' });  // bucket <= 0.5
  histogram.observe(1.5, { endpoint: '/api' });  // bucket <= 5.0
  histogram.observe(0.8, { endpoint: '/api' });  // bucket <= 1.0
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  // Check histogram TYPE
  assertEquals(lines.find(l => l.startsWith('# TYPE request_duration_seconds')), '# TYPE request_duration_seconds histogram');
  
  // Check buckets
  const bucket01 = lines.find(l => l.includes('le="0.1"'));
  const bucket05 = lines.find(l => l.includes('le="0.5"'));
  const bucket10 = lines.find(l => l.includes('le="1"'));
  const bucket50 = lines.find(l => l.includes('le="5"'));
  const bucketInf = lines.find(l => l.includes('le="+Inf"'));
  
  assertExists(bucket01);
  assertExists(bucket05);
  assertExists(bucket10);
  assertExists(bucket50);
  assertExists(bucketInf);
  
  // Verify cumulative bucket counts
  assertEquals(bucket01?.includes(' 1'), true); // 0.05
  assertEquals(bucket05?.includes(' 3'), true); // 0.05, 0.2, 0.3
  assertEquals(bucket10?.includes(' 4'), true); // 0.05, 0.2, 0.3, 0.8
  assertEquals(bucket50?.includes(' 5'), true); // all values
  assertEquals(bucketInf?.includes(' 5'), true); // all values
  
  // Check sum
  const sumLine = lines.find(l => l.includes('_sum'));
  assertExists(sumLine);
  assertEquals(sumLine?.includes('2.85'), true); // 0.05 + 0.2 + 0.3 + 1.5 + 0.8
  
  // Check count
  const countLine = lines.find(l => l.includes('_count'));
  assertExists(countLine);
  assertEquals(countLine?.includes(' 5'), true);
});

Deno.test('Histogram - default buckets', () => {
  const histogram = new Histogram('test_histogram', 'Test histogram');
  histogram.observe(0.1);
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  
  // Check that default buckets exist
  const buckets = lines.filter(l => l.includes('test_histogram_bucket'));
  // Default buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, +Inf]
  assertEquals(buckets.length, 12);
});

Deno.test('startTimer - measures duration', async () => {
  const timer = startTimer();
  await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
  const duration = timer();
  
  // Duration should be approximately 0.1 seconds (100ms)
  assertEquals(duration >= 0.09 && duration <= 0.15, true);
});

Deno.test('exportMetrics - includes all metric types', () => {
  const counter = new Counter('test_counter', 'Test counter');
  const gauge = new Gauge('test_gauge', 'Test gauge');
  const histogram = new Histogram('test_histogram', 'Test histogram', [1]);
  
  counter.inc();
  gauge.set(42);
  histogram.observe(0.5);
  
  const exported = exportMetrics();
  
  // Check all metrics are present
  assertEquals(exported.includes('# HELP test_counter'), true);
  assertEquals(exported.includes('# TYPE test_counter counter'), true);
  assertEquals(exported.includes('# HELP test_gauge'), true);
  assertEquals(exported.includes('# TYPE test_gauge gauge'), true);
  assertEquals(exported.includes('# HELP test_histogram'), true);
  assertEquals(exported.includes('# TYPE test_histogram histogram'), true);
});

Deno.test('exportMetrics - format validation', () => {
  const counter = new Counter('http_requests', 'HTTP requests');
  counter.inc({ status: '200' });
  
  const exported = exportMetrics();
  const lines = exported.split('\n').filter(l => l.length > 0);
  
  // Check Prometheus format structure
  // Should have: HELP, TYPE, value lines
  const helpLines = lines.filter(l => l.startsWith('# HELP'));
  const typeLines = lines.filter(l => l.startsWith('# TYPE'));
  const valueLines = lines.filter(l => !l.startsWith('#'));
  
  assertEquals(helpLines.length > 0, true);
  assertEquals(typeLines.length > 0, true);
  assertEquals(valueLines.length > 0, true);
  
  // Verify value line format: metric_name{labels} value
  const valueLine = valueLines[0];
  assertEquals(valueLine.match(/^[a-zA-Z_][a-zA-Z0-9_]*(\{[^}]+\})? \d+(\.\d+)?$/), true);
});

Deno.test('Multiple metrics with same name but different labels', () => {
  const counter = new Counter('requests_total', 'Total requests');
  
  counter.inc({ endpoint: '/api/users', method: 'GET' });
  counter.inc({ endpoint: '/api/users', method: 'GET' });
  counter.inc({ endpoint: '/api/users', method: 'POST' });
  counter.inc({ endpoint: '/api/posts', method: 'GET' });
  
  const exported = exportMetrics();
  const lines = exported.split('\n');
  const valueLines = lines.filter(l => l.startsWith('requests_total{'));
  
  // Should have 3 distinct label combinations
  assertEquals(valueLines.length, 3);
  
  // Verify counts
  const usersGet = valueLines.find(l => l.includes('endpoint="/api/users"') && l.includes('method="GET"'));
  const usersPost = valueLines.find(l => l.includes('endpoint="/api/users"') && l.includes('method="POST"'));
  const postsGet = valueLines.find(l => l.includes('endpoint="/api/posts"') && l.includes('method="GET"'));
  
  assertEquals(usersGet?.endsWith(' 2'), true);
  assertEquals(usersPost?.endsWith(' 1'), true);
  assertEquals(postsGet?.endsWith(' 1'), true);
});
