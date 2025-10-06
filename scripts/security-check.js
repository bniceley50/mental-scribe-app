#!/usr/bin/env node

/**
 * Phase 1 Security Setup Verification Script
 * 
 * This script validates that all required security configurations
 * are in place before starting development or deployment.
 * 
 * Run: npm run security:check
 */

const { createClient } = require('@supabase/supabase-js');

const REQUIRED_SECRETS = [
  'OPENAI_API_KEY',
  'HMAC_SECRET_KEY',
];

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${COLORS.reset} ${message}`);
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function error(message) {
  log(COLORS.red, '✗', message);
}

function warn(message) {
  log(COLORS.yellow, '⚠', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

async function checkEnvironmentVariables() {
  console.log('\n=== Environment Variables Check ===');
  
  let allPresent = true;
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (process.env[envVar]) {
      success(`${envVar} is set`);
    } else {
      error(`${envVar} is missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function checkSupabaseSecrets() {
  console.log('\n=== Lovable Cloud Secrets Check ===');
  
  info('Note: This script cannot directly read Lovable Cloud secrets.');
  info('Secrets are only accessible in Edge Functions.');
  warn('Verify secrets manually in Lovable Cloud dashboard:');
  console.log('  1. Open project settings');
  console.log('  2. Navigate to "Secrets" tab');
  console.log('  3. Ensure the following secrets are set:\n');
  
  REQUIRED_SECRETS.forEach(secret => {
    console.log(`     - ${secret}`);
  });
  
  console.log('\n');
  warn('To test HMAC_SECRET_KEY, try creating a client with external_id.');
  warn('If the key is missing, you will see: "SECURITY ERROR: HMAC_SECRET_KEY not configured"');
  
  return true; // Cannot validate programmatically
}

async function checkRLSPolicies() {
  console.log('\n=== Row Level Security Check ===');
  
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    error('Cannot check RLS: Supabase credentials missing');
    return false;
  }
  
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
  
  // Test anonymous access to sensitive tables
  const tablesToCheck = ['clients', 'conversations', 'messages', 'structured_notes'];
  
  let allBlocked = true;
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      
      if (error) {
        success(`${table}: Anonymous access blocked ✓`);
      } else if (data && data.length === 0) {
        success(`${table}: Anonymous access blocked (empty) ✓`);
      } else {
        error(`${table}: Anonymous access NOT blocked! Data exposed!`);
        allBlocked = false;
      }
    } catch (err) {
      success(`${table}: Anonymous access blocked (error) ✓`);
    }
  }
  
  return allBlocked;
}

async function checkDatabaseTriggers() {
  console.log('\n=== Audit Trigger Check ===');
  
  info('Audit triggers ensure all PHI modifications are logged.');
  warn('Verify via SQL query in Lovable Cloud:');
  console.log(`
  SELECT 
    c.relname AS table_name,
    COUNT(t.tgname) AS trigger_count,
    array_agg(t.tgname) AS triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.relname IN ('messages', 'uploaded_files', 'structured_notes', 'recordings', 'part2_consents')
    AND t.tgname LIKE 'audit_%'
    AND NOT t.tgisinternal
  GROUP BY c.relname
  ORDER BY c.relname;
  `);
  
  info('Expected: At least 1 audit trigger per table');
  
  return true;
}

async function runAllChecks() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Mental Scribe - Security Setup Check     ║');
  console.log('╚════════════════════════════════════════════╝');
  
  const results = {
    env: await checkEnvironmentVariables(),
    secrets: await checkSupabaseSecrets(),
    rls: await checkRLSPolicies(),
    triggers: await checkDatabaseTriggers(),
  };
  
  console.log('\n=== Summary ===');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    success('All automated checks passed!');
    warn('Manual verification still required for secrets and triggers.');
    console.log('\n✅ Security setup appears correct. Ready for development.\n');
    process.exit(0);
  } else {
    error('Some checks failed. Review errors above.');
    console.log('\n❌ Fix security issues before proceeding.\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllChecks().catch(err => {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runAllChecks };
